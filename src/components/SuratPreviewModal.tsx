'use client';
import Image from 'next/image';
import logoDepok from '../../public/logo-depok.png';
import logoDp3ap2kb from '../../public/logo-dp3ap2kb.png';
import logoSalamGenre from '../../public/logo-salam-genre.png';
import logoGenreDepok from '../../public/logo-genre-depok.png';
import type { Surat } from '@/features/portal/mapping';
import Dialog from './Dialog';
import React from 'react';
import { X, Printer, CheckCircle, QrCode } from 'lucide-react';
import { KABINET } from '@/features/organisasi/content';

export default function SuratPreviewModal({
  surat,
  onClose,
  onApprove,
  canApprove,
  roleName,
  busy,
}: {
  surat: Surat | null;
  onClose: () => void;
  onApprove: (id: string) => Promise<boolean>;
  canApprove: boolean;
  roleName: string;
  busy?: boolean;
}) {
  if (!surat) return null;
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
            <button
              disabled
              title="Cetak surat resmi belum tersedia"
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors text-xs font-bold flex items-center space-x-1"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Cetak A4</span>
            </button>
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
                File hasil surat belum tersedia. Pratinjau surat dapat dilihat di bawah.
              </p>
            )}
          </section>
          <div className="bg-white shadow-md rounded-2xl p-6 sm:p-10 border border-slate-300 max-w-2xl mx-auto text-slate-800 text-xs sm:text-sm leading-relaxed">
            {/* Kop Surat Resmi dengan 4 Logo Otentik */}
            <div className="border-b-4 border-double border-slate-900 pb-4 mb-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 shrink-0">
                  <Image
                    sizes="128px"
                    src={logoDepok}
                    alt="Pemkot Depok"
                    className="h-14 w-auto object-contain"
                  />
                  <Image
                    sizes="128px"
                    src={logoDp3ap2kb}
                    alt="DP3AP2KB"
                    className="h-9 w-auto object-contain hidden sm:block"
                  />
                </div>

                <div className="text-center px-1 flex-1">
                  <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Pemerintah Kota Depok • Dinas DP3AP2KB
                  </p>
                  <h4 className="font-black text-xs sm:text-sm tracking-wide uppercase text-genre-blue-dark">
                    FORUM GENERASI BERENCANA (GENRE) KOTA DEPOK
                  </h4>
                  <p className="text-[9px] text-slate-600 font-medium">
                    Sekretariat: Gedung Dibaleka II Balai Kota Depok Jl. Margonda Raya No. 54
                  </p>
                  <p className="text-[8px] sm:text-[9px] text-slate-500 font-mono">
                    SK Walikota Depok No. 100.3.3.3/61/Kpts/DP3AP2KB/Huk/2026
                  </p>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <Image
                    sizes="128px"
                    src={logoSalamGenre}
                    alt="Salam GenRe"
                    className="h-11 w-auto object-contain hidden sm:block"
                  />
                  <Image
                    sizes="128px"
                    src={logoGenreDepok}
                    alt="Logo GenRe Depok"
                    className="h-14 w-auto object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Nomor & Tanggal */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start mb-6">
              <div>
                <table className="text-left text-xs table-fixed w-full">
                  <tbody>
                    <tr>
                      <td className="pr-2 font-semibold">Nomor</td>
                      <td className="pr-2">:</td>
                      <td className="font-mono font-bold text-slate-900 break-all max-w-full">
                        {surat.nomor}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-2 font-semibold">Lampiran</td>
                      <td className="pr-2">:</td>
                      <td>- (Satu Berkas)</td>
                    </tr>
                    <tr>
                      <td className="pr-2 font-semibold">Perihal</td>
                      <td className="pr-2">:</td>
                      <td className="font-bold underline text-genre-blue-dark">
                        {surat.jenis}: {surat.perihal}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="text-right text-xs break-all">
                <p>Kota Depok, {surat.tanggal}</p>
                <p className="text-slate-500 font-mono text-[10px]">ID: {surat.id}</p>
              </div>
            </div>

            {/* Tujuan */}
            <div className="mb-6">
              <p className="font-semibold">Kepada Yth,</p>
              <p className="font-bold text-slate-900">{surat.tujuan}</p>
              <p className="text-slate-600">di Tempat</p>
            </div>

            {/* Isi Surat */}
            <div className="space-y-3 text-justify mb-8">
              <p>Dengan hormat,</p>
              <p>
                Salam Generasi Berencana! Teriring salam dan doa semoga Bapak/Ibu senantiasa dalam
                lindungan Tuhan Yang Maha Esa dan dilancarkan dalam menjalankan aktivitas
                sehari-hari.
              </p>
              <p>
                Sehubungan dengan pelaksanaan program kerja Forum GenRe Kota Depok masa bakti{' '}
                {KABINET.periode}, dengan ini kami sampaikan bahwa:
              </p>
              <div className="bg-slate-50 p-3.5 rounded-xl border-l-4 border-genre-orange my-2 text-slate-700 italic">
                &quot;{surat.keterangan}&quot;
              </div>
              <p>
                Demikian surat {surat.jenis.toLowerCase()} ini kami sampaikan. Atas perhatian,
                dukungan, dan kerja sama yang baik, kami ucapkan terima kasih.
              </p>
            </div>

            {/* Tanda Tangan & QR Code Verifikasi */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 items-end">
              <div>
                <p className="text-[10px] text-slate-500 mb-1">Diajukan Oleh:</p>
                <p className="font-bold text-xs">{surat.pemohon}</p>
                <p className="text-[10px] text-slate-500">{surat.divisi}</p>
              </div>

              <div className="text-right">
                <p className="text-[10px] text-slate-600">Mengetahui & Menyetujui,</p>
                <p className="font-bold text-xs text-slate-900 mb-2">
                  Ketua Umum Forum GenRe Kota Depok
                </p>

                {/* Digital Signature QR Code Badge */}
                {surat.status.includes('Selesai') ? (
                  <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-300 rounded-xl p-2 text-left">
                    <div className="w-10 h-10 bg-slate-900 rounded-lg p-1 flex items-center justify-center text-white">
                      <QrCode className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-emerald-800 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-0.5 inline" /> DISETUJUI DI PORTAL
                      </p>
                      <p className="text-[8px] font-mono text-slate-600 font-bold">
                        Muhammad Ighasta Mughis
                      </p>
                      <p className="text-[7px] text-slate-400">QR verifikasi belum tersedia</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-14 flex items-center justify-end">
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      Menunggu Tanda Tangan / ACC
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer & ACC Action */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Status: <span className="font-bold text-slate-800">{surat.status}</span>
          </div>

          <div className="flex items-center space-x-3">
            {canApprove && !surat.status.includes('Selesai') && (
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
