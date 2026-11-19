'use client';
import { useEffect, useState } from 'react';
import {
  connectGoogleDrive,
  getDriveSettings,
  getDrivePicker,
  selectDriveFolder,
} from './driveActions';

type PickerDocument = { id: string };
interface FolderView {
  setIncludeFolders(value: boolean): FolderView;
  setSelectFolderEnabled(value: boolean): FolderView;
  setMimeTypes(value: string): FolderView;
}
interface PickerBuilder {
  setDeveloperKey(value: string): PickerBuilder;
  setAppId(value: string): PickerBuilder;
  setOAuthToken(value: string): PickerBuilder;
  setOrigin(value: string): PickerBuilder;
  addView(value: FolderView): PickerBuilder;
  setCallback(value: (data: { action: string; docs?: PickerDocument[] }) => void): PickerBuilder;
  build(): { setVisible(value: boolean): void };
}
type GoogleWindow = Window & {
  gapi?: {
    load(
      name: string,
      options: {
        callback: () => void;
        onerror: () => void;
        timeout: number;
        ontimeout: () => void;
      },
    ): void;
  };
  google?: {
    picker: {
      PickerBuilder: new () => PickerBuilder;
      DocsView: new () => FolderView;
      Action: { PICKED: string; CANCEL: string };
    };
  };
};

let pickerScript: Promise<void> | undefined;
function loadPicker() {
  pickerScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      script.remove();
      reject(new Error('Google Picker terlalu lama dimuat.'));
    }, 15000);
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      script.remove();
      reject(new Error('Google Picker tidak dapat dimuat.'));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    pickerScript = undefined;
    throw error;
  });
  return pickerScript.then(
    () =>
      new Promise<void>((resolve, reject) => {
        const api = (window as GoogleWindow).gapi;
        if (!api) return reject(new Error('Google Picker tidak tersedia.'));
        api.load('picker', {
          callback: resolve,
          onerror: () => reject(new Error('Google Picker gagal dimuat.')),
          timeout: 15000,
          ontimeout: () => reject(new Error('Google Picker terlalu lama dimuat.')),
        });
      }),
  );
}

export default function DriveSettings() {
  const [settings, setSettings] = useState<{
    connected: boolean;
    folderName: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    void getDriveSettings()
      .then((result) => {
        if (!active) return;
        if (result.ok) setSettings(result.data);
        else setMessage(result.error);
        const callback = new URLSearchParams(window.location.search).get('drive');
        if (callback === 'error')
          setMessage('Koneksi Google ditolak atau gagal. Coba hubungkan kembali.');
        if (callback === 'connected')
          setMessage('Akun Google terhubung. Pilih folder hasil surat.');
      })
      .catch(() => {
        if (active) setMessage('Pengaturan Drive belum dapat dimuat. Muat ulang halaman.');
      });
    return () => {
      active = false;
    };
  }, []);

  async function connect() {
    setBusy(true);
    setMessage('');
    try {
      const result = await connectGoogleDrive();
      if (result.ok) window.location.assign(result.data);
      else setMessage(result.error);
    } catch {
      setMessage('Koneksi terputus. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function chooseFolder() {
    setBusy(true);
    setMessage('');
    try {
      const credentials = await getDrivePicker();
      if (!credentials.ok) {
        setMessage(credentials.error);
        return;
      }
      await loadPicker();
      const picker = (window as GoogleWindow).google?.picker;
      if (!picker) throw new Error('Google Picker tidak tersedia.');
      const folderId = await new Promise<string | null>((resolve) => {
        const view = new picker.DocsView()
          .setIncludeFolders(true)
          .setSelectFolderEnabled(true)
          .setMimeTypes('application/vnd.google-apps.folder');
        new picker.PickerBuilder()
          .setDeveloperKey(credentials.data.apiKey)
          .setAppId(credentials.data.appId)
          .setOAuthToken(credentials.data.token)
          .setOrigin(window.location.origin)
          .addView(view)
          .setCallback((data) => {
            if (data.action === picker.Action.PICKED) resolve(data.docs?.[0]?.id ?? null);
            if (data.action === picker.Action.CANCEL) resolve(null);
          })
          .build()
          .setVisible(true);
      });
      if (!folderId) return;
      const saved = await selectDriveFolder(folderId);
      if (!saved.ok) {
        setMessage(saved.error);
        return;
      }
      const result = await getDriveSettings();
      if (result.ok) {
        setSettings(result.data);
        setMessage('Folder hasil surat berhasil disimpan.');
      } else setMessage(result.error);
    } catch {
      setMessage('Folder belum dapat dipilih. Periksa konfigurasi Google Picker dan coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Pengaturan Google Drive surat"
      className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3"
    >
      <h2 className="font-bold text-sm text-slate-900">Google Drive surat (opsional)</h2>
      <p className="text-xs text-slate-600">
        {settings?.connected
          ? `Akun terhubung. Folder: ${settings.folderName || 'belum dipilih'}.`
          : 'Surat tetap tersedia di portal. Jika ingin menyimpan salinan ke Drive, hubungkan akun Google lalu pilih folder.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={connect}
          className="rounded-xl bg-genre-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {settings?.connected ? 'Hubungkan ulang Google' : 'Hubungkan Google Drive'}
        </button>
        <button
          type="button"
          disabled={busy || !settings?.connected}
          onClick={chooseFolder}
          className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
        >
          Pilih folder Drive
        </button>
      </div>
      {busy && (
        <p role="status" className="text-xs text-slate-500">
          Memproses Google Drive…
        </p>
      )}
      {message && (
        <p role="status" className="text-xs text-slate-700">
          {message}
        </p>
      )}
    </section>
  );
}
