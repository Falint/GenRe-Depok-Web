'use client';
import Image from 'next/image';
import logoDepok from '../../../public/logo-depok.png';
import logoDp3ap2kb from '../../../public/logo-dp3ap2kb.png';
import logoGenreDepok from '../../../public/logo-genre-depok.png';
import React, { useState } from 'react';
import {
  Search,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Building2,
  BookOpen,
} from 'lucide-react';
import { JOBDESC_DATA, KABINET } from './content';

export default function StrukturJobdescTab() {
  const [activeSubTab, setActiveSubTab] = useState('organogram'); // 'organogram' | 'jobdesc'
  const [searchJobdesc, setSearchJobdesc] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('Semua');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (no: number) => {
    setExpandedId(expandedId === no ? null : no);
  };

  const filteredJobdesc = JOBDESC_DATA.filter((item) => {
    const matchSearch =
      item.jabatan.toLowerCase().includes(searchJobdesc.toLowerCase()) ||
      (item.pejabat && item.pejabat.toLowerCase().includes(searchJobdesc.toLowerCase())) ||
      item.jobdescPerbaikan.toLowerCase().includes(searchJobdesc.toLowerCase());
    if (selectedKategori === 'Semua') return matchSearch;
    return matchSearch && item.kategori === selectedKategori;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Official Header with 3 Logos */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <Image
            sizes="128px"
            src={logoDepok}
            alt="Logo Pemkot Depok"
            className="h-16 w-auto object-contain drop-shadow-sm"
          />
          <Image
            sizes="128px"
            src={logoDp3ap2kb}
            alt="Logo DP3AP2KB Kota Depok"
            className="h-12 w-auto object-contain drop-shadow-sm"
          />
          <Image
            sizes="128px"
            src={logoGenreDepok}
            alt="Logo Forum GenRe Kota Depok"
            className="h-16 w-auto object-contain drop-shadow-sm"
          />
        </div>

        <div className="text-center md:text-right">
          <div className="inline-flex items-center space-x-1.5 bg-genre-blue/10 text-genre-blue px-3 py-1 rounded-full text-xs font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Masa Bakti {KABINET.periode}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Struktur Organisasi & Job Description
          </h1>
          <p className="text-xs text-slate-500">
            Primary Sheet & Pedoman Tata Kerja Forum GenRe Kota Depok
          </p>
        </div>
      </div>

      {/* Subtab Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start inline-flex">
        <button
          onClick={() => setActiveSubTab('organogram')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'organogram'
              ? 'bg-white text-genre-blue shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Bagan Organisasi (Primary Sheet)</span>
        </button>
        <button
          onClick={() => setActiveSubTab('jobdesc')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'jobdesc'
              ? 'bg-white text-genre-orange shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Direktori 32 Jobdesc (Lama vs Perbaikan)</span>
        </button>
      </div>

      {/* ===================== SUBTAB 1: ORGANOGRAM ===================== */}
      {activeSubTab === 'organogram' && (
        <div className="space-y-6">
          {/* Dewan Pelindung & Pembina */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-sm space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400 text-center">
              Pimpinan Kehormatan, Dewan Penasihat & Pembina
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
              <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
                <p className="font-bold text-amber-300">Pelindung 1 & 2</p>
                <p className="font-medium mt-0.5">Ayah & Bunda GenRe Kota Depok</p>
                <p className="text-[10px] text-slate-300">Wali Kota & Ketua TP-PKK Depok</p>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
                <p className="font-bold text-amber-300">Penasihat 1 & 2</p>
                <p className="font-medium mt-0.5">Pemerintah Kota Depok</p>
                <p className="text-[10px] text-slate-300">Kepala Dinas DP3AP2KB Kota Depok</p>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
                <p className="font-bold text-amber-300">Pembina Teknis</p>
                <p className="font-medium mt-0.5">Bidang Ketahanan Remaja</p>
                <p className="text-[10px] text-slate-300">Supervisi & Pendampingan Harian</p>
              </div>
            </div>
          </div>

          {/* Pengurus Inti */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-center space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-wider bg-blue-50 text-genre-blue px-3 py-1 rounded-full border border-blue-200">
              PENGURUS INTI (EXECUTIVE BOARD)
            </span>

            <div className="max-w-md mx-auto bg-gradient-to-tr from-genre-blue to-genre-blue-dark text-white p-4 rounded-2xl shadow-md">
              <p className="text-[10px] uppercase tracking-wider text-blue-200 font-bold">
                Ketua Umum
              </p>
              <h3 className="font-black text-lg">Muhammad Ighasta Mughis</h3>
            </div>

            <div className="w-0.5 h-6 bg-slate-300 mx-auto" />

            <div className="max-w-md mx-auto bg-slate-800 text-white p-3.5 rounded-2xl shadow-sm">
              <p className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">
                Wakil Ketua Umum
              </p>
              <h4 className="font-extrabold text-base">Muhamad Arfan</h4>
            </div>

            <div className="w-0.5 h-6 bg-slate-300 mx-auto" />

            <div className="max-w-md mx-auto bg-slate-100 p-3 rounded-2xl border border-slate-300 text-slate-900">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Sekretaris Umum
              </p>
              <h4 className="font-extrabold text-sm">Raihan Satria Elezar</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto pt-2">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-slate-800">
                <p className="text-[10px] font-bold text-emerald-800 uppercase">
                  Bendahara Controller
                </p>
                <h5 className="font-bold text-sm text-emerald-950">Nazwa Zahira</h5>
                <p className="text-[10px] text-slate-500">Audit, Kas & Verifikasi Transaksi</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-slate-800">
                <p className="text-[10px] font-bold text-emerald-800 uppercase">
                  Bendahara Treasure (BUMF)
                </p>
                <h5 className="font-bold text-sm text-emerald-950">Tiara Maulidia</h5>
                <p className="text-[10px] text-slate-500">Pencatatan Kas & Badan Usaha Forum</p>
              </div>
            </div>
          </div>

          {/* 3 Pilar Bidang & Divisi */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Bidang Eksternal */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="bg-genre-blue/10 border border-genre-blue/20 p-3.5 rounded-2xl text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-genre-blue">
                  KEPALA BIDANG EKSTERNAL
                </span>
                <h4 className="font-black text-base text-slate-900 mt-0.5">Agnia Khumaira</h4>
              </div>

              <div className="space-y-3">
                {/* Divisi Program Reguler */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                    <span>Divisi Program Reguler</span>
                  </div>
                  <p className="text-genre-blue font-bold text-[11px]">
                    Kadiv: Muhammad Fauzan Al-Anshori
                  </p>
                  <p className="text-slate-600 mt-1">Staff: Radit, Rayya, Fairuz</p>
                </div>

                {/* Divisi Program Non Reguler */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                    <span>Divisi Program Non Reguler</span>
                  </div>
                  <p className="text-genre-blue font-bold text-[11px]">
                    Kadiv: Fathir Muhammad Ramadhan
                  </p>
                  <p className="text-slate-600 mt-1">
                    Staff: Darlo, Tius, Ahmad Abidzahr, Sahara Ramadhani
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Bidang Internal */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  KEPALA BIDANG INTERNAL
                </span>
                <h4 className="font-black text-base text-slate-900 mt-0.5">
                  Roidah A&#39;isyi Shofwah
                </h4>
              </div>

              <div className="space-y-3">
                {/* Divisi Forum GenRe Kec */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                  <p className="font-bold text-slate-900 mb-1">Divisi Forum GenRe Kec (11 Kec)</p>
                  <p className="text-emerald-700 font-bold text-[11px]">Kadiv: Muhamad Rizkan H.</p>
                  <p className="text-slate-600 mt-1">
                    Staff: Frida Fatma Salsabila, Sinta Khairunisa, Muhammad Shidqi Fadhali
                  </p>
                </div>

                {/* Divisi Duta */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                  <p className="font-bold text-slate-900 mb-1">Divisi Duta GenRe</p>
                  <p className="text-emerald-700 font-bold text-[11px]">
                    Kadiv: Melani Sofyan Putri
                  </p>
                  <p className="text-slate-600 mt-1">
                    Staff: Alya Citra Lestari, Khalimatussaqdiah
                  </p>
                </div>

                {/* Divisi PIK-R */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                  <p className="font-bold text-slate-900 mb-1">Divisi PIK-R</p>
                  <p className="text-emerald-700 font-bold text-[11px]">Kadiv: Ade Rifki Perdian</p>
                  <p className="text-slate-600 mt-1">
                    Staff: Natasya Wulandari Priyanto, Sulthon Prawirotomo
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Bidang Branding */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="bg-genre-orange/10 border border-genre-orange/20 p-3.5 rounded-2xl text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-genre-orange">
                  KEPALA BIDANG BRANDING
                </span>
                <h4 className="font-black text-base text-slate-900 mt-0.5">
                  Teuku Andika Jalaluddin Rumi
                </h4>
              </div>

              <div className="space-y-3">
                {/* Divisi PR */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                  <p className="font-bold text-slate-900 mb-1">Divisi Public Relation</p>
                  <p className="text-genre-orange font-bold text-[11px]">Kadiv: Muhammad Diva</p>
                  <p className="text-slate-600 mt-1">
                    Staff: Raihan Sukmajaya, A&#39;idah Husniyah, Nur Anisah
                  </p>
                </div>

                {/* Divisi Social Media */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                  <p className="font-bold text-slate-900 mb-1">Divisi Social Media</p>
                  <p className="text-genre-orange font-bold text-[11px]">
                    Kadiv: Allya Nurul Febyana
                  </p>
                  <p className="text-slate-600 mt-1">Staff: Muhammad Faza, Ahmad Kafka</p>
                </div>

                {/* Divisi Design */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                  <p className="font-bold text-slate-900 mb-1">Divisi Design</p>
                  <p className="text-genre-orange font-bold text-[11px]">
                    Kadiv: Annisa Revy Alifiah
                  </p>
                  <p className="text-slate-600 mt-1">Staff: Siti Nur Faizah</p>
                </div>

                {/* Divisi Video Editor */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                  <p className="font-bold text-slate-900 mb-1">Divisi Video Editor</p>
                  <p className="text-genre-orange font-bold text-[11px]">Kadiv: Plt. Koordinator</p>
                  <p className="text-slate-600 mt-1">Staff: Adrian Saputra Kaban</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUBTAB 2: DIREKTORI 32 JOBDESC ===================== */}
      {activeSubTab === 'jobdesc' && (
        <div className="space-y-4">
          {/* Controls & Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama jabatan, pejabat, atau kata kunci tugas..."
                value={searchJobdesc}
                onChange={(e) => setSearchJobdesc(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-genre-blue/30 focus:outline-none"
                aria-label="Cari nama jabatan, pejabat, atau kata kunci tugas..."
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
              {[
                'Semua',
                'Pengurus Inti',
                'Kepala Bidang',
                'Bidang Internal',
                'Bidang Eksternal',
                'Bidang Branding',
              ].map((kat) => (
                <button
                  key={kat}
                  onClick={() => setSelectedKategori(kat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedKategori === kat
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {kat}
                </button>
              ))}
            </div>
          </div>

          {/* Jobdesc List Cards */}
          <div className="space-y-3">
            {filteredJobdesc.map((item) => {
              const isExpanded = expandedId === item.no;

              return (
                <div
                  key={item.no}
                  className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:border-slate-300 transition-all"
                >
                  <div
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpand(item.no)}
                    className="flex items-start justify-between cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (
                        event.target === event.currentTarget &&
                        (event.key === 'Enter' || event.key === ' ')
                      ) {
                        event.preventDefault();
                        event.currentTarget.click();
                      }
                    }}
                  >
                    <div className="space-y-1 pr-3">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          #{item.no}
                        </span>
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-genre-blue">
                          {item.kategori}
                        </span>
                        {item.pejabat && (
                          <span className="text-xs text-slate-500">
                            Pejabat: <strong className="text-slate-800">{item.pejabat}</strong>
                          </span>
                        )}
                      </div>

                      <h3 className="font-black text-base text-slate-900">{item.jabatan}</h3>
                    </div>

                    <span
                      aria-hidden="true"
                      className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>
                  </div>

                  {/* Standard Jobdesc Preview */}
                  <div className="mt-3 p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs sm:text-sm text-slate-800 leading-relaxed">
                    <p className="text-[10px] font-extrabold uppercase text-emerald-800 mb-1 flex items-center">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Job Description Resmi (Perbaikan)
                    </p>
                    <p>{item.jobdescPerbaikan}</p>
                  </div>

                  {/* Expanded Comparative View: Jobdesc Lama */}
                  {isExpanded && (
                    <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed animate-in fade-in duration-150">
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Catatan Historis: Jobdesc Lama
                      </p>
                      <p className="italic">&quot;{item.jobdescLama}&quot;</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
