'use client';
import { usePortal } from '@/features/portal/PortalProvider';
import { useFeatureData } from '@/features/portal/useFeatureData';
import { loadMedia } from './actions';
import ResourceCard, { MediaEditor } from './ResourceCard';
const MEDIA_TABLES = ['media_resources', 'profiles'] as const;
import Image from 'next/image';
import React, { useState } from 'react';
import {
  BookOpen,
  Palette,
  Download,
  Search,
  Copy,
  Check,
  Sparkles,
  Film,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { MEDIA_LIBRARY, SEKRETARIAT_TEMPLATES } from './content';
import { KABINET } from '@/features/organisasi/content';

export default function MediaLibraryTab() {
  const { currentRole } = usePortal();
  const { data, loading, error, refresh } = useFeatureData(loadMedia, MEDIA_TABLES);
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const resources = (data || []).filter((item) =>
    showArchived ? !!item.archived_at : !item.archived_at,
  );
  const [subTab, setSubTab] = useState('modul'); // 'modul' | 'brand' | 'template'
  const [searchModul, setSearchModul] = useState('');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const handleCopyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
    } catch {
      alert('Kode warna gagal disalin. Salin kode secara manual.');
      return;
    }
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const filteredModul = resources
    .filter((item) => item.jenis === 'modul')
    .filter(
      (m) =>
        m.judul.toLowerCase().includes(searchModul.toLowerCase()) ||
        m.kategori.toLowerCase().includes(searchModul.toLowerCase()) ||
        m.jenjang.toLowerCase().includes(searchModul.toLowerCase()),
    );

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <button className="text-sm font-semibold text-genre-blue" onClick={() => void refresh()}>
        Muat ulang media
      </button>
      {loading && <p role="status">Memuat katalog media…</p>}
      {error && <p role="alert">{error}</p>}
      {currentRole.manageContent && (
        <div className="flex flex-wrap gap-4">
          <button
            disabled={!data}
            onClick={() => setAdding(true)}
            className="rounded-xl bg-genre-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            Tambah Media
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Tampilkan arsip
          </label>
        </div>
      )}
      {adding && <MediaEditor onClose={() => setAdding(false)} refresh={refresh} />}
      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Pusat Sumber Daya & Media Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Modul pengetahuan, identitas kabinet, aset organisasi, dan template sekretariat
          </p>
        </div>

        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setSubTab('modul')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subTab === 'modul'
                ? 'bg-white text-genre-blue shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Modul Pengetahuan</span>
          </button>
          <button
            onClick={() => setSubTab('brand')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subTab === 'brand'
                ? 'bg-white text-genre-orange shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Bank Aset & Brand Kit</span>
          </button>
          <button
            onClick={() => setSubTab('template')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subTab === 'template'
                ? 'bg-white text-genre-blue shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Template Sekretariat</span>
          </button>
        </div>
      </div>

      {subTab === 'template' && (
        <section aria-labelledby="template-sekretariat" className="space-y-4">
          <div>
            <h2 id="template-sekretariat" className="text-lg font-bold text-slate-900">
              Template Sekretariat
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Buka template di Google Docs untuk menyiapkan dokumen kegiatan. Akses mengikuti izin
              Google pada setiap dokumen. Portal tidak membuat salinan atau mengubah dokumen asli
              secara otomatis.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {SEKRETARIAT_TEMPLATES.map((template) => (
              <article
                key={template.nama}
                className="flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-5"
              >
                <FileText aria-hidden="true" className="mb-3 h-5 w-5 text-genre-blue" />
                <h3 className="font-bold text-slate-900">{template.nama}</h3>
                <p className="mb-5 mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  {template.deskripsi}
                </p>
                <a
                  href={template.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Buka template ${template.nama} (tab baru)`}
                  className="inline-flex items-center gap-2 rounded-xl bg-genre-blue px-4 py-2 text-xs font-bold text-white hover:bg-genre-blue-dark"
                >
                  Buka template <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                </a>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ===================== SUBTAB 1: MODUL PENGETAHUAN ===================== */}
      {subTab === 'modul' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari materi Triad KRR, Berani, Beraksi, Stunting..."
                value={searchModul}
                onChange={(e) => setSearchModul(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                aria-label="Cari materi Triad KRR, Berani, Beraksi, Stunting..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModul.length === 0 && (
              <p className="p-6 text-sm text-slate-500">Tidak ada modul yang cocok.</p>
            )}
            {filteredModul.map((modul) => (
              <ResourceCard key={modul.id} item={modul} refresh={refresh} />
            ))}
          </div>
        </div>
      )}

      {/* ===================== SUBTAB 2: BRAND KIT & ASSET BANK ===================== */}
      {subTab === 'brand' && (
        <div className="space-y-8">
          <section
            aria-labelledby="brand-primera"
            className="rounded-2xl border border-primera-gold/40 bg-primera-ivory p-5 sm:p-6 text-primera-navy"
          >
            <div className="flex items-center gap-4">
              <Image
                src={KABINET.logoUrl}
                alt="Logo sementara PRIMERA"
                width={80}
                height={80}
                className="shrink-0"
              />
              <div>
                <h2 id="brand-primera" className="text-lg font-bold">
                  Kabinet {KABINET.nama} · PRIME ERA
                </h2>
                <p className="mt-1 text-sm">{KABINET.periode}</p>
                <p className="mt-2 text-sm leading-relaxed">{KABINET.tagline}</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-600">
              Logo ini merupakan rancangan sementara berdasarkan filosofi kabinet, bukan logo resmi.
              Bintang empat sudut melambangkan bimbingan dan visi, jarum emas melambangkan aksi,
              lima bilah navy mewakili nilai PRIME, dan busur emas melambangkan kolaborasi.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={KABINET.logoUrl}
                download
                className="inline-flex items-center gap-2 rounded-xl bg-primera-navy px-4 py-2 text-xs font-bold text-white hover:underline"
              >
                <Download aria-hidden="true" className="h-4 w-4" /> Unduh logo sementara PRIMERA
              </a>
              <a
                href={KABINET.brandGuidelineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-primera-navy px-4 py-2 text-xs font-bold hover:underline"
              >
                Buka brand guideline <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </section>
          {/* Color Palette Guide */}
          {[
            { nama: 'Palet PRIMERA', colors: KABINET.colorPalette },
            { nama: 'Palet GenRe', colors: MEDIA_LIBRARY.brandKit.colorPalette },
          ].map((palette) => (
            <section key={palette.nama} aria-label={palette.nama}>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-3 flex items-center">
                <Palette className="w-4 h-4 mr-2 text-genre-orange" />
                {palette.nama}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Gunakan kode hex ini untuk semua kebutuhan publikasi divisi Desain Grafis, Video
                Editor, dan Social Media.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {palette.colors.map((col, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
                  >
                    <div
                      className="h-20 w-full border-b border-slate-200 flex items-end p-2"
                      style={{ backgroundColor: col.hex }}
                    />
                    <div className="p-3">
                      <p className="font-bold text-xs text-slate-900">{col.name}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{col.desc}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <code className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {col.hex}
                        </code>
                        <button
                          onClick={() => handleCopyHex(col.hex)}
                          className="text-[11px] font-semibold text-genre-blue hover:underline flex items-center"
                          title="Salin kode warna"
                          aria-label={`Salin ${col.name}`}
                        >
                          {copiedHex === col.hex ? (
                            <span className="text-emerald-600 flex items-center">
                              <Check className="w-3 h-3 mr-0.5" /> Tersalin
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <Copy className="w-3 h-3 mr-0.5" /> Salin
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Logo Suite */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-3 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-genre-blue" />
              Paket Logo Resmi (Logo Master Suite)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {resources
                .filter((item) => item.jenis === 'logo')
                .map((item) => (
                  <ResourceCard key={item.id} item={item} refresh={refresh} />
                ))}
            </div>
          </div>

          {/* Video & Motion Assets */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-3 flex items-center">
              <Film className="w-4 h-4 mr-2 text-rose-500" />
              Bank Aset Video & Audio (Bumper, Jingle, & B-Roll)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {resources
                .filter((item) => item.jenis === 'video')
                .map((item) => (
                  <ResourceCard key={item.id} item={item} refresh={refresh} />
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
