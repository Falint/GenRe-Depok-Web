'use client';
import { useRef, useState, type FormEvent } from 'react';
import type { PublicContent } from './schema';
import { registrationInput, registrationOpen, type RegistrationInput } from './registrationSchema';
import { registerForEvent } from './actions';

export default function RegistrationForm({ agenda }: { agenda: PublicContent }) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ kode: string; input: RegistrationInput } | null>(null);
  const [copied, setCopied] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = new FormData(event.currentTarget);
    const input = registrationInput.safeParse(Object.fromEntries(form));
    if (!input.success) {
      setError('Isi nama, instansi, dan unsur, masing-masing maksimal 300 karakter.');
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await registerForEvent(requestId, agenda.id, input.data);
      if (!result.ok) setError(result.error);
      else setReceipt({ kode: result.data, input: input.data });
    } catch {
      setError(
        'Koneksi terputus. Coba lagi dengan form dan isian yang sama; jangan muat ulang halaman.',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  if (receipt)
    return (
      <section
        aria-label="Bukti pendaftaran"
        aria-live="polite"
        className="space-y-4 border-t-2 border-genre-blue pt-6"
      >
        <h2 className="text-xl font-bold">Pendaftaran berhasil</h2>
        <p className="font-semibold">{agenda.judul}</p>
        <p className="break-all">
          Kode bukti: <strong>{receipt.kode}</strong>
        </p>
        <dl className="space-y-2 break-words">
          {Object.entries(receipt.input).map(([key, value]) => (
            <div key={key}>
              <dt className="font-bold capitalize">{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-slate-600">
          Simpan bukti ini sebelum meninggalkan halaman. Bukti tidak dikirim melalui email.
        </p>
        <div className="flex flex-wrap gap-4 print:hidden">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${agenda.judul}\nKode bukti: ${receipt.kode}\nNama: ${receipt.input.nama}\nInstansi: ${receipt.input.instansi}\nUnsur: ${receipt.input.unsur}`,
                );
                setCopied('Bukti disalin.');
              } catch {
                setCopied('Bukti belum dapat disalin. Pilih teks atau gunakan Cetak bukti.');
              }
            }}
            className="rounded-lg bg-genre-blue px-4 py-3 font-bold text-white"
          >
            Salin bukti
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-slate-300 px-4 py-3 font-bold"
          >
            Cetak bukti
          </button>
        </div>
        <p role="status" className="text-sm">
          {copied}
        </p>
      </section>
    );
  if (!registrationOpen(agenda))
    return (
      <p role="status" className="border-t pt-6 text-slate-600">
        Pendaftaran kegiatan belum dibuka atau sudah ditutup.
      </p>
    );
  return (
    <section aria-labelledby="registration-heading" className="border-t-2 border-genre-blue pt-6">
      <h2 id="registration-heading" className="text-xl font-bold">
        Daftar kegiatan
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Pendaftaran gratis tanpa akun. Isi data dengan benar; data digunakan untuk pendataan peserta
        dan lampiran surat kegiatan.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
          {(
            [
              [
                'nama',
                'Nama lengkap',
                'Gunakan huruf kapital pada awal setiap unsur nama. Contoh: Andi Pratama.',
              ],
              [
                'instansi',
                'Instansi',
                'Gunakan huruf kapital pada nama resmi; pertahankan singkatan. Contoh: SMA Negeri 1 Depok.',
              ],
              [
                'unsur',
                'Unsur',
                'Tulis unsur atau organisasi sesuai penulisan resminya. Contoh: GenRe Kecamatan Pancoran Mas atau PIK-R.',
              ],
            ] as const
          ).map(([name, label, note]) => (
            <div key={name}>
              <label htmlFor={`registration-${name}`} className="block text-sm font-bold">
                {label}
              </label>
              <input
                id={`registration-${name}`}
                name={name}
                required
                maxLength={300}
                autoComplete={
                  name === 'nama' ? 'name' : name === 'instansi' ? 'organization' : 'off'
                }
                aria-describedby={`registration-${name}-note`}
                className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              />
              <p id={`registration-${name}-note`} className="mt-1 text-sm text-slate-600">
                {note}
              </p>
            </div>
          ))}
          <button type="submit" className="rounded-lg bg-genre-blue px-5 py-3 font-bold text-white">
            {busy ? 'Mendaftarkan…' : 'Daftar kegiatan'}
          </button>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
