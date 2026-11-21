'use client';
import Image from 'next/image';
import logoGenreDepok from '../../public/logo-genre-depok.png';
import type { Surat } from '@/features/portal/mapping';
import Dialog from './Dialog';
import React from 'react';
import { X, Download, CheckCircle } from 'lucide-react';

import {
  SURAT_ATTACHMENT_LABEL,
  SURAT_OPENING,
  SURAT_SCHEDULE_INTRO,
  SURAT_SIGNATORIES,
  isSuratApproved,
  suratSchedule,
  suratClosing,
} from '@/features/administrasi/suratTemplate';

export default function SuratPreviewModal({
  surat,
  onClose,
  onApprove,
  onRetryExport,
  canApprove,
  roleName,
  busy,
}: {
  surat: Surat | null;
  onClose: () => void;
  onApprove: (id: string) => Promise<boolean>;
  onRetryExport: (id: string) => Promise<boolean>;
  canApprove: boolean;
  roleName: string;
  busy?: boolean;
}) {
  if (!surat) return null;
  const approved = isSuratApproved(surat.status);
  const schedule = suratSchedule(surat);
  const fileUrl =
    surat.file_pdf_url && URL.canParse(surat.file_pdf_url) ? new URL(surat.file_pdf_url) : null;
  const resultUrl =
    fileUrl?.protocol === 'https:' && !fileUrl.username && !fileUrl.password ? fileUrl.href : null;

  return (
    <Dialog title="Pratinjau surat" onClose={onClose} busy={busy}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        {/* Modal Toolbar */}
        <div className="flex flex-wrap gap-2 items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-genre-orange"></span>
            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
              Pratinjau Surat Resmi & Lembar Validasi
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-genre-blue font-bold font-mono break-all max-w-full">
              {surat.nomor}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {approved && (
              <a
                href={`/surat/${surat.id}/pdf`}
                download
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors text-xs font-bold flex items-center space-x-1"
              >
                <Download className="w-4 h-4" />
                <span>Unduh PDF</span>
              </a>
            )}
            <button
              aria-label="Tutup dialog"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Official Letter Paper Layout (A4 Style) */}
        <div className="p-6 sm:p-10 bg-slate-100 max-h-[75vh] overflow-y-auto">
          <section
            aria-label="Riwayat dan hasil surat"
            className="mb-4 max-w-2xl mx-auto rounded-2xl border border-slate-200 bg-white p-4 text-sm"
          >
            <p className="mb-2 text-xs text-slate-500">
              ID: {surat.id} · Pemohon: {surat.pemohon}
            </p>
            {!approved && (
              <p className="mb-2 text-xs text-amber-700">
                Menunggu persetujuan. Tanda tangan muncul setelah ACC.
              </p>
            )}
            <details>
              <summary className="cursor-pointer font-bold text-slate-900">
                Riwayat Persetujuan
              </summary>
              {surat.approvalHistory.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">Belum ada riwayat persetujuan.</p>
              ) : (
                <ol className="mt-2 space-y-2 text-xs text-slate-600">
                  {surat.approvalHistory.map((step, index) => (
                    <li key={index}>
                      <p className="font-semibold text-slate-800">
                        {step.step} · {step.status}
                      </p>
                      <p>
                        {step.actor} · {step.time}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </details>
            {resultUrl ? (
              <a
                href={resultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-xl bg-genre-blue px-3 py-2 text-xs font-bold text-white"
              >
                Buka Hasil Surat
              </a>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                {approved
                  ? 'Surat tersimpan di portal. Gunakan Unduh PDF untuk menyimpan salinan ke perangkat.'
                  : 'Surat tersimpan di portal. PDF dapat diunduh setelah disetujui.'}
              </p>
            )}
            {approved && !resultUrl && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-slate-600">
                  Google Drive opsional; hanya dipakai jika pengurus memilih menyimpan salinan ke
                  Drive.
                </p>
                {surat.export_status === 'failed' && (
                  <p className="text-xs text-slate-600" role="status">
                    Penyimpanan Drive sebelumnya belum berhasil. Surat tetap tersedia di portal.
                  </p>
                )}
                {surat.export_status === 'uploading' && (
                  <p className="text-xs text-slate-600" role="status">
                    Salinan Drive sedang diproses. Jika terhenti, coba lagi setelah dua menit.
                  </p>
                )}
                {canApprove && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRetryExport(surat.id)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                  >
                    Simpan salinan ke Google Drive
                  </button>
                )}
              </div>
            )}
          </section>
          <article
            aria-label="Isi surat"
            className="relative isolate bg-white shadow-md p-5 sm:p-10 border border-slate-300 max-w-2xl mx-auto text-black text-xs sm:text-sm leading-relaxed break-words"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            <Image
              src={logoGenreDepok}
              alt=""
              aria-hidden="true"
              sizes="400px"
              className="pointer-events-none absolute -z-10 top-1/3 left-[15%] w-[70%] h-auto opacity-10"
            />
            {/* Kop Surat Resmi mengikuti referensi organisasi. */}
            <header className="border-b-4 border-double border-black pb-3 mb-5 text-center">
              <Image
                src={logoGenreDepok}
                alt="Logo GenRe Depok"
                sizes="80px"
                className="h-20 w-auto object-contain mx-auto mb-2"
              />
              <h4 className="font-bold text-sm sm:text-base">
                PENGURUS GENRE CABANG
                <br />
                FORUM GENERASI BERENCANA KOTA DEPOK
              </h4>
              <p className="text-[10px] sm:text-xs mt-1 font-sans">
                IG : @genre_kotadepok, Email : genre.depok@gmail.com
              </p>
            </header>

            {/* Nomor & Tanggal */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start mb-6">
              <table className="text-left min-w-0">
                <tbody>
                  {[
                    ['Nomor', surat.nomor],
                    ['Lampiran', surat.lampiran_peserta?.length ? SURAT_ATTACHMENT_LABEL : '-'],
                    ['Perihal', surat.perihal],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td className="pr-2 align-top">{label}</td>
                      <td className="pr-2 align-top">:</td>
                      <td className={label === 'Perihal' ? 'font-bold' : 'break-all'}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="shrink-0">Depok, {surat.tanggal}</p>
            </div>

            {/* Tujuan */}
            <div className="mb-6">
              <p>Kepada Yth.</p>
              <p className="font-bold">{surat.tujuan}</p>
              <p>di Tempat</p>
            </div>

            {/* Isi Surat */}
            <div className="space-y-3 text-justify mb-5">
              <div>
                <p>Dengan hormat,</p>
                <p className="indent-6">{SURAT_OPENING}</p>
              </div>
              {surat.keterangan && (
                <p className="indent-6 whitespace-pre-line">{surat.keterangan}</p>
              )}
              {schedule.length > 0 && (
                <div>
                  <p className="indent-6 mb-2">{SURAT_SCHEDULE_INTRO}</p>
                  <table className="ml-2 sm:ml-6 text-left">
                    <tbody>
                      {schedule.map(([label, value]) => (
                        <tr key={label}>
                          <td className="pr-2 align-top">{label}</td>
                          <td className="pr-2 align-top">:</td>
                          <td className="whitespace-pre-line">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="indent-6">{suratClosing(surat.jenis)}</p>
            </div>

            {/* Tanda Tangan hanya tersedia setelah persetujuan. */}
            {approved && (
              <section aria-label="Tanda tangan persetujuan" className="mt-4 text-center">
                <p className="mb-2">Hormat Kami,</p>
                <div className="grid grid-cols-2 gap-3">
                  {SURAT_SIGNATORIES.map((signer) => (
                    <div key={signer.key} className="min-w-0">
                      <p className="font-bold h-12 sm:h-10">{signer.role}</p>
                      <Image
                        unoptimized
                        src={`/surat/${surat.id}/tanda-tangan/${signer.key}`}
                        alt={`Tanda tangan ${signer.role}`}
                        width={180}
                        height={90}
                        className="w-full h-20 sm:h-24 object-contain mx-auto"
                      />
                      <p className="font-bold underline">{signer.name}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </article>
          {Boolean(surat.lampiran_peserta?.length) && (
            <article
              aria-label="Lampiran peserta surat"
              className="mx-auto mt-6 max-w-2xl break-words border border-slate-300 bg-white p-5 text-xs leading-relaxed text-black shadow-md sm:p-10 sm:text-sm"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              <h4 className="font-bold">Lampiran {surat.nomor}</h4>
              <p className="mb-4 mt-2 font-bold">Daftar Peserta {surat.lampiran_judul}</p>
              <table className="w-full table-fixed border-collapse border border-black text-left">
                <caption className="sr-only">Daftar peserta lampiran surat</caption>
                <thead>
                  <tr>
                    {['No.', 'Nama', 'Instansi', 'Unsur'].map((label, index) => (
                      <th
                        key={label}
                        scope="col"
                        className={`border border-black p-2 ${index === 0 ? 'w-[10%]' : 'w-[30%]'}`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {surat.lampiran_peserta.map((item, index) => (
                    <tr key={index}>
                      {[String(index + 1), item.nama, item.instansi, item.unsur].map(
                        (value, column) => (
                          <td
                            key={column}
                            className="break-words border border-black p-2 align-top"
                          >
                            {value}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          )}
        </div>

        {/* Modal Footer & ACC Action */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Status: <span className="font-bold text-slate-800">{surat.status}</span>
          </div>

          <div className="flex items-center space-x-3">
            {canApprove && !approved && (
              <button
                onClick={() => onApprove(surat.id)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Setujui Surat ({roleName})</span>
              </button>
            )}
            <button
              aria-label="Tutup dialog"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs sm:text-sm font-semibold rounded-xl transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
