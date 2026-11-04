import React, { useState } from 'react';
import {
  BookOpen,
  Palette,
  Video,
  Download,
  Search,
  Copy,
  Check,
  Sparkles,
  Film
} from 'lucide-react';
import { INITIAL_MEDIA_LIBRARY } from '../../data/mockData';

export default function MediaLibraryTab() {
  const [subTab, setSubTab] = useState('modul'); // 'modul' | 'brand'
  const [searchModul, setSearchModul] = useState('');
  const [copiedHex, setCopiedHex] = useState(null);

  const handleCopyHex = (hex) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const filteredModul = INITIAL_MEDIA_LIBRARY.modulPengetahuan.filter(m => 
    m.judul.toLowerCase().includes(searchModul.toLowerCase()) ||
    m.kategori.toLowerCase().includes(searchModul.toLowerCase()) ||
    m.jenjang.toLowerCase().includes(searchModul.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      
      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Pusat Sumber Daya & Media Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Penyimpanan terstandar modul Triad KRR, panduan keluarga, serta bank aset logo dan video resmi
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
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
        </div>
      </div>

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
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModul.map((modul) => (
              <div 
                key={modul.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-genre-blue uppercase">
                      {modul.kategori}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {modul.tahun}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 group-hover:text-genre-blue transition-colors">
                    {modul.judul}
                  </h3>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                    {modul.deskripsi}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Sasaran: <strong className="text-slate-800">{modul.jenjang}</strong></span>
                    <span>{modul.halaman} Hal • {modul.size}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">{modul.format}</span>
                  <button
                    onClick={() => alert(`Mengunduh berkas resmi "${modul.judul}"...`)}
                    className="px-3 py-1.5 bg-genre-blue hover:bg-genre-blue-dark text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Modul</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ===================== SUBTAB 2: BRAND KIT & ASSET BANK ===================== */}
      {subTab === 'brand' && (
        <div className="space-y-8">
          
          {/* Color Palette Guide */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-3 flex items-center">
              <Palette className="w-4 h-4 mr-2 text-genre-orange" />
              Palet Warna Identitas Resmi (Brand Color Palette)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Gunakan kode hex ini untuk semua kebutuhan publikasi divisi Desain Grafis, Video Editor, dan Social Media.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {INITIAL_MEDIA_LIBRARY.brandKit.colorPalette.map((col, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div 
                    className="h-20 w-full border-b border-slate-200 flex items-end p-2"
                    style={{ backgroundColor: col.hex }}
                  />
                  <div className="p-3">
                    <p className="font-bold text-xs text-slate-900">{col.name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <code className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {col.hex}
                      </code>
                      <button
                        onClick={() => handleCopyHex(col.hex)}
                        className="text-[11px] font-semibold text-genre-blue hover:underline flex items-center"
                        title="Salin kode warna"
                      >
                        {copiedHex === col.hex ? (
                          <span className="text-emerald-600 flex items-center"><Check className="w-3 h-3 mr-0.5" /> Tersalin</span>
                        ) : (
                          <span className="flex items-center"><Copy className="w-3 h-3 mr-0.5" /> Salin</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logo Suite */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-3 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-genre-blue" />
              Paket Logo Resmi (Logo Master Suite)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {INITIAL_MEDIA_LIBRARY.brandKit.logos.map((logo, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-genre-blue text-xs border border-slate-200">
                      LOGO
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-slate-900">{logo.nama}</p>
                      <p className="text-[11px] text-slate-500">{logo.format} • {logo.size}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => alert(`Mengunduh aset logo: ${logo.nama}`)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-genre-blue hover:text-white text-slate-700 transition-colors"
                    title="Unduh Logo"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
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
              {INITIAL_MEDIA_LIBRARY.brandKit.videoAssets.map((vid, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs border border-rose-100">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-slate-900">{vid.nama}</p>
                      <p className="text-[11px] text-slate-500">Durasi: {vid.durasi} • {vid.format} • {vid.size}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => alert(`Membuka unduhan aset video/audio: ${vid.nama}`)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-700 transition-colors"
                    title="Akses Aset"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
