'use client';
import Image from 'next/image';
import logoDepok from '../../../public/logo-depok.png';
import logoDp3ap2kb from '../../../public/logo-dp3ap2kb.png';
import logoSalamGenre from '../../../public/logo-salam-genre.png';
import logoGenreDepok from '../../../public/logo-genre-depok.png';
import React, { useState } from 'react';
import { Award, ShieldCheck, BookOpen, Mail, CheckCircle2, Star } from 'lucide-react';
import { KABINET } from './content';

export default function ProfilForumTab() {
  const [activeSection, setActiveSection] = useState('tentang'); // 'tentang' | 'pilar' | 'program' | 'prestasi' | 'mitra'

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      {/* Hero Banner Profil dengan 4 Logo Resmi */}
      <div className="relative overflow-hidden rounded-3xl bg-primera-navy text-white p-6 sm:p-10 shadow-xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-primera-teal/20 rounded-full blur-3xl pointer-events-none" />

        {/* 4 Logos Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 mb-6">
          <div className="flex items-center space-x-3 sm:space-x-5 flex-wrap">
            <Image
              sizes="128px"
              src={logoDepok}
              alt="Pemkot Depok"
              className="h-12 w-auto object-contain drop-shadow"
              title="Pemerintah Kota Depok"
            />
            <Image
              sizes="128px"
              src={logoDp3ap2kb}
              alt="DP3AP2KB Kota Depok"
              className="h-9 w-auto object-contain drop-shadow"
              title="Dinas DP3AP2KB Depok"
            />
            <Image
              sizes="128px"
              src={logoSalamGenre}
              alt="Salam GenRe"
              className="h-12 w-auto object-contain drop-shadow hover:scale-105 transition-transform"
              title="Salam GenRe Indonesia"
            />
            <div className="h-8 w-[1px] bg-white/30 hidden sm:block" />
            <Image
              sizes="128px"
              src={logoGenreDepok}
              alt="Forum GenRe Depok"
              className="h-14 w-auto object-contain drop-shadow hover:scale-105 transition-transform"
              title="Forum GenRe Kota Depok"
            />
          </div>

          <div className="text-right">
            <span className="inline-block text-[10px] font-mono uppercase bg-white/20 text-blue-100 px-3 py-1 rounded-full border border-white/20">
              SK WALIKOTA NO. 100.3.3.3/61/Kpts/DP3AP2KB/Huk/2026
            </span>
          </div>
        </div>

        <div className="space-y-2 max-w-3xl">
          <div className="mb-4 flex items-center gap-3">
            <Image src={KABINET.logoUrl} alt="Logo sementara PRIMERA" width={64} height={64} />
            <p className="text-sm font-bold text-primera-gold">
              Kabinet {KABINET.nama} · {KABINET.periode}
            </p>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Forum Generasi Berencana (GenRe) Kota Depok
          </h1>
          <p className="text-sm font-semibold leading-relaxed text-primera-ivory">
            {KABINET.tagline}
          </p>
          <p className="text-sm sm:text-base text-blue-100 font-medium leading-relaxed">
            Mitra Strategis Dinas DP3AP2KB Kota Depok dalam Mewujudkan Remaja Berkarakter, Sehat,
            dan Berencana Menuju <em>&quot;Membangun Generasi Emas Depok Maju&quot;</em>.
          </p>
        </div>

        {/* Quick Numbers / Impact Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-8 pt-6 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl text-center border border-white/10">
            <p className="text-xl sm:text-2xl font-black font-mono text-amber-300">&gt; 120</p>
            <p className="text-[10px] text-blue-100 font-semibold mt-0.5">Duta GenRe</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl text-center border border-white/10">
            <p className="text-xl sm:text-2xl font-black font-mono text-emerald-300">&gt; 160+</p>
            <p className="text-[10px] text-blue-100 font-semibold mt-0.5">PIK-R Sekolah & Kec</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl text-center border border-white/10">
            <p className="text-xl sm:text-2xl font-black font-mono text-sky-300">&gt; 110+</p>
            <p className="text-[10px] text-blue-100 font-semibold mt-0.5">Pendidik & Konselor</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl text-center border border-white/10">
            <p className="text-xl sm:text-2xl font-black font-mono text-pink-300">&gt; 3.000</p>
            <p className="text-[10px] text-blue-100 font-semibold mt-0.5">Peserta Kegiatan</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl text-center border border-white/10">
            <p className="text-xl sm:text-2xl font-black font-mono text-amber-300">&gt; 150</p>
            <p className="text-[10px] text-blue-100 font-semibold mt-0.5">Kolaborasi Mitra</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl text-center border border-white/10">
            <p className="text-xl sm:text-2xl font-black font-mono text-amber-300">Top 2</p>
            <p className="text-[10px] text-blue-100 font-semibold mt-0.5">Forum Terbaik Jabar</p>
          </div>
        </div>
      </div>

      <section
        aria-labelledby="nilai-prime"
        className="rounded-2xl border-l-4 border-primera-teal bg-primera-ivory p-5 sm:p-6 text-primera-navy"
      >
        <h2 id="nilai-prime" className="text-lg font-bold">
          PRIMERA · PRIME ERA
        </h2>
        <p className="mt-1 text-sm">Lima nilai PRIME yang menjadi pegangan gerak kabinet.</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {KABINET.nilai.map((nilai) => (
            <li
              key={nilai}
              className="rounded-lg border border-primera-navy/20 px-3 py-2 text-sm font-semibold"
            >
              {nilai}
            </li>
          ))}
        </ul>
      </section>

      {/* Navigasi Sub-Tab Profil */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto">
        {[
          { id: 'tentang', label: 'Tentang & Landasan Hukum' },
          { id: 'pilar', label: '3 Pilar & Fokus GenRe' },
          { id: 'program', label: 'Program Unggulan' },
          { id: 'prestasi', label: 'Prestasi Juara (Achievement)' },
          { id: 'mitra', label: '14 Mitra & Kontak' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === tab.id
                ? 'bg-white text-genre-blue shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= SECTION 1: TENTANG & LANDASAN HUKUM ================= */}
      {activeSection === 'tentang' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tentang Kita Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="inline-flex items-center space-x-2 bg-blue-50 text-genre-blue px-3 py-1 rounded-full text-xs font-bold">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Profil Resmi Organisasi</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Tentang Forum GenRe Depok
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
                Forum Generasi Berencana (GenRe) dan Pusat Informasi dan Konseling Remaja (PIK-R)
                dibentuk berdasarkan amanat{' '}
                <strong>
                  Undang-Undang Nomor 52 Tahun 2009 tentang Perkembangan Kependudukan dan
                  Pembangunan Keluarga
                </strong>
                , khususnya Pasal 48 ayat (1) huruf b yang menekankan pentingnya peningkatan
                kualitas remaja melalui pemberian akses informasi, pendidikan, konseling, dan
                pelayanan tentang kehidupan berkeluarga.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
                Di Kota Depok, Forum GenRe ditetapkan melalui{' '}
                <strong>SK Walikota Depok Nomor 100.3.3.3/61/Kpts/DP3AP2KB/Huk/2026</strong> untuk
                periode kepengurusan 2026–2028, memayungi 11 Forum GenRe Kecamatan dan ratusan PIK-R
                jalur sekolah dan masyarakat.
              </p>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-xs font-bold text-slate-900">Asta Cita & Visi Kota Depok:</p>
                <p className="text-xs text-slate-600 italic">
                  &quot;Memperkuat pembangunan SDM, sains, teknologi, pendidikan, kesehatan,
                  kesetaraan gender, serta penguatan peran pemuda dan penyandang disabilitas demi
                  terwujudnya <strong>Bersama Depok Maju</strong>.&quot;
                </p>
              </div>
            </div>

            {/* Visi Misi & Landasan Hukum */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-genre-orange-light to-white p-6 sm:p-8 rounded-3xl border border-genre-orange/30 shadow-sm space-y-3">
                <span className="text-[10px] font-extrabold uppercase bg-genre-orange text-white px-2.5 py-0.5 rounded-full">
                  VISI RESMI
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  &quot;Membangun Generasi Emas Depok Maju&quot;
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Menyiapkan remaja Kota Depok yang memiliki perencanaan masa depan matang, berdaya
                  saing global, terbebas dari pernikahan anak, seks pra-nikah, serta NAPZA.
                </p>
              </div>

              {/* Landasan Hukum Dokumen */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-2 text-genre-blue" />
                  Landasan Yuridis & Kelembagaan
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-800">
                        UU No. 52 Tahun 2009 Pasal 48 Ayat 1 Huruf B
                      </p>
                      <p className="text-slate-500">
                        Pemberian akses informasi, pendidikan, dan konseling penyiapan kehidupan
                        berkeluarga bagi remaja.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-800">
                        SK Walikota Depok No. 100.3.3.3/61/Kpts/DP3AP2KB/Huk/2026
                      </p>
                      <p className="text-slate-500">
                        Pengukuhan Kepengurusan Forum Generasi Berencana Kota Depok Periode
                        2026–2028.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION 2: 3 PILAR & FOKUS GENRE ================= */}
      {activeSection === 'pilar' && (
        <div className="space-y-6">
          {/* 3 Pilar GenRe Depok */}
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-4">3 Pilar Utama GenRe Depok</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-genre-blue flex items-center justify-center font-black">
                  1
                </div>
                <h3 className="font-black text-base text-slate-900">
                  Forum GenRe Kota & Kecamatan
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Perwakilan dari setiap PIK-R untuk fokus memilih Duta GenRe Kecamatan menuju
                  tingkat Kota, mengoordinasikan advokasi, dan mengembangkan PIK-R di 11 wilayah
                  kecamatan.
                </p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                  2
                </div>
                <h3 className="font-black text-base text-slate-900">
                  Pusat Informasi & Konseling Remaja (PIK-R)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Wadah program Penyiapan Kehidupan Berkeluarga Bagi Remaja (PKBR) yang dikelola
                  dari, oleh, dan untuk remaja melalui Pendidik Sebaya (PS) dan Konselor Sebaya (KS)
                  jalur pendidikan dan wilayah.
                </p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-genre-orange flex items-center justify-center font-black">
                  3
                </div>
                <h3 className="font-black text-base text-slate-900">Duta GenRe Kota Depok</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Individu terpilih yang diseleksi sebagai <em>Role Model</em> sebaya. Setiap Duta
                  GenRe memimpin program inovasi dan advokasi untuk menyelesaikan masalah nyata
                  remaja di Depok.
                </p>
              </div>
            </div>
          </div>

          {/* Fokus Utama: Anti TRIAD KRR & 5 Transisi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="bg-rose-50 border border-rose-200 p-6 rounded-3xl space-y-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                KAMPANYE ANTI TRIAD KRR
              </span>
              <h4 className="font-black text-slate-900 text-base">3 Isu Utama Perlindungan:</h4>
              <ul className="text-xs text-slate-700 space-y-1.5 pl-1">
                <li className="flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 mr-1.5" /> 1. Stop Pernikahan
                  Dini / Anak
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 mr-1.5" /> 2. Tolak Seks
                  Pranikah
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 mr-1.5" /> 3. Hindari NAPZA &
                  Zat Adiktif
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-6 rounded-3xl space-y-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-200 text-genre-blue">
                SUBSTANSI GENRE
              </span>
              <h4 className="font-black text-slate-900 text-base">4 Pilar Pengembangan:</h4>
              <ul className="text-xs text-slate-700 space-y-1.5 pl-1">
                <li className="flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-genre-blue mr-1.5" /> 1. Pengembangan
                  Karakter Remaja
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-genre-blue mr-1.5" /> 2. Perencanaan
                  Kehidupan Berkeluarga
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-genre-blue mr-1.5" /> 3. Kesehatan
                  Reproduksi (Kespro)
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-genre-blue mr-1.5" /> 4. Peningkatan
                  Kecakapan Hidup (Life Skills)
                </li>
              </ul>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl space-y-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                5 TRANSISI HIDUP REMAJA
              </span>
              <h4 className="font-black text-slate-900 text-base">Peta Masa Depan:</h4>
              <ul className="text-xs text-slate-700 space-y-1.5 pl-1">
                <li>1. Mempraktikkan pola hidup sehat</li>
                <li>2. Melanjutkan pendidikan terencana</li>
                <li>3. Memulai karir & mandiri finansial</li>
                <li>4. Membentuk keluarga yang terencana</li>
                <li>5. Menjadi anggota masyarakat bernilai</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION 3: PROGRAM UNGGULAN ================= */}
      {activeSection === 'program' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900">
              6 Program Unggulan Forum GenRe Depok
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Berdasarkan Paparan Resmi Organisasi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-genre-blue">
                  AGENDA TAHUNAN AKBAR
                </span>
                <h3 className="font-black text-base text-slate-900 mt-1">Adujak Kota Depok</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  Apresiasi Duta dan Jambore Ajang Kreativitas. Pertemuan akbar PIK-R se-Kota Depok
                  dan 11 Forum GenRe Kecamatan untuk mempererat silaturahmi, unjuk karya inovatif,
                  serta penganugerahan Duta & PIK-R terbaik.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-genre-blue">
                Tingkat Kota & Provinsi
              </span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  AKSI PENCEGAHAN STUNTING
                </span>
                <h3 className="font-black text-base text-slate-900 mt-1">Stunting Warrior</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  Program edukasi remaja tentang pencegahan stunting dari hulu, gizi seimbang,
                  penanganan KEK (Kurang Energi Kronis), serta distribusi Tablet Tambah Darah (TTD)
                  bagi remaja putri di sekolah.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-rose-600">
                Sinergi Dinkes & DP3AP2KB
              </span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-genre-orange">
                  KEMANDIRIAN FINANSIAL
                </span>
                <h3 className="font-black text-base text-slate-900 mt-1">GenREpreneur</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  Program inovasi GenRe Kota Depok untuk menumbuhkan jiwa wirausaha, literasi
                  finansial muda, dan kemandirian ekonomi remaja melalui Badan Usaha Milik Forum
                  (BUMF).
                </p>
              </div>
              <span className="text-[10px] font-semibold text-genre-orange">
                Unit Bisnis & Inkubator
              </span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  AKSI LANGSUNG LAPANGAN
                </span>
                <h3 className="font-black text-base text-slate-900 mt-1">Eksplor GenRe</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  Turun langsung ke lokasi titik permasalahan remaja di kelurahan/kampung KB untuk
                  memberikan edukasi Pendewasaan Usia Pernikahan (PUP), kesehatan mental, serta
                  ruang dialog bersama remaja setempat.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700">
                Roadshow 11 Kecamatan
              </span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  CAPACITY BUILDING
                </span>
                <h3 className="font-black text-base text-slate-900 mt-1">
                  Pelatihan Pendidik & Konselor Sebaya
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  Membekali kader muda dengan keterampilan komunikasi empatik, teknik konseling
                  dasar sebaya, dan etika kerahasiaan untuk menjadi tempat curhat yang aman dan
                  solutif bagi temannya.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-purple-700">
                Modul Resmi Berani & Beraksi
              </span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  PARLEMEN REMAJA
                </span>
                <h3 className="font-black text-base text-slate-900 mt-1">Guyub GenRe</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  Ruang serap aspirasi dan pengumpulan permasalahan remaja se-Kota Depok. Merumuskan
                  rekomendasi kebijakan ramah remaja untuk diajukan dalam Musrenbang Kota Depok.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-slate-700">
                Advokasi Musrenbang Pemkot
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION 4: PRESTASI JUARA ================= */}
      {activeSection === 'prestasi' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900">
              Rekam Jejak Prestasi & Penghargaan
            </h2>
            <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              Tingkat Jawa Barat & Nasional
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-sm flex items-start space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm">
                  Juara 1 Duta GenRe Putri Nasional
                </p>
                <p className="text-xs text-amber-700 font-bold">Tingkat Nasional (2019)</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Representasi terbaik remaja Indonesia asal Kota Depok.
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-sm flex items-start space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm">
                  Juara 1 Duta GenRe Putri Jawa Barat
                </p>
                <p className="text-xs text-amber-700 font-bold">Tingkat Provinsi (2025)</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Meraih gelar Duta GenRe Jawa Barat Terbaik.
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-blue-200 shadow-sm flex items-start space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-genre-blue flex items-center justify-center shrink-0">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm">
                  Forum GenRe Terbaik 2 Se-Jawa Barat
                </p>
                <p className="text-xs text-genre-blue font-bold">Tingkat Provinsi (2025)</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sebelumnya Terbaik 3 se-Jabar tahun 2023.
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-sm flex items-start space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm">
                  Juara 1 PIK-R Segmentasi Beraksi
                </p>
                <p className="text-xs text-emerald-700 font-bold">
                  Tingkat Jawa Barat (2025 & 2022)
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Juara 2 pada tahun 2024 untuk usia 15-19 tahun.
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-start space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm">
                  Duta GenRe Putri Kategori Inspirator
                </p>
                <p className="text-xs text-slate-600 font-bold">Tingkat Jawa Barat (2024)</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Serta Duta GenRe Intelegensia Jabar 2023.
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-start space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm">Duta GenRe Sosmed Inspirator</p>
                <p className="text-xs text-slate-600 font-bold">Tingkat Jawa Barat (2023)</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pengaruh konten digital edukatif terluas di Jabar.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION 5: 14 MITRA & KONTAK ================= */}
      {activeSection === 'mitra' && (
        <div className="space-y-6">
          {/* 14 Mitra Strategis */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-black text-slate-900">
              14 Mitra Strategis Lintas Sektor (Pentahelix)
            </h2>
            <p className="text-xs text-slate-600">
              Forum GenRe Kota Depok menjalin sinergi erat dengan instansi pemerintahan, aparat
              wilayah, dan lembaga layanan masyarakat:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              {[
                '1. Pemerintah Kota Depok',
                '2. DP3AP2KB Kota Depok',
                '3. Dinas Ketenagakerjaan Kota Depok',
                '4. Dinas Kesehatan Kota Depok',
                '5. Pusat Pembelajaran Keluarga (PUSPAGA)',
                '6. BNN Kota Depok',
                '7. BAPPEDA Kota Depok',
                '8. Dinas Pendidikan Kota Depok',
                '9. KCD Wilayah 2 Provinsi Jawa Barat',
                '10. Camat Se-Kota Depok (11 Kecamatan)',
                '11. PLKB Se-Kota Depok',
                '12. TP PKK Kota Depok',
                '13. KUA Se-Kota Depok',
                '14. Puskesmas Se-Kota Depok',
              ].map((mitra, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-800 flex items-center"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-genre-blue shrink-0" />
                  <span>{mitra}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Social Media & Official Contact */}
          <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-white p-6 sm:p-8 rounded-3xl shadow-md">
            <h3 className="text-lg font-black mb-4 flex items-center">
              <Mail className="w-5 h-5 mr-2 text-genre-orange" />
              Kanal Resmi Forum GenRe Kota Depok
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <a
                href="https://instagram.com/genre_kotadepok"
                target="_blank"
                rel="noreferrer"
                className="p-4 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/10 transition-colors flex items-center space-x-3"
              >
                <div className="w-6 h-6 rounded-lg bg-pink-500/30 flex items-center justify-center text-pink-300 font-bold">
                  IG
                </div>
                <div>
                  <p className="text-[10px] text-slate-300">Instagram</p>
                  <p className="font-bold text-white">@genre_kotadepok</p>
                </div>
              </a>

              <a
                href="mailto:genre.depok@gmail.com"
                className="p-4 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/10 transition-colors flex items-center space-x-3"
              >
                <Mail className="w-5 h-5 text-sky-400" />
                <div>
                  <p className="text-[10px] text-slate-300">Email Resmi</p>
                  <p className="font-bold text-white">genre.depok@gmail.com</p>
                </div>
              </a>

              <div className="p-4 bg-white/10 rounded-2xl border border-white/10 flex items-center space-x-3">
                <span className="text-xl">🎵</span>
                <div>
                  <p className="text-[10px] text-slate-300">TikTok</p>
                  <p className="font-bold text-white">@forumgenredepok</p>
                </div>
              </div>

              <div className="p-4 bg-white/10 rounded-2xl border border-white/10 flex items-center space-x-3">
                <div className="w-6 h-6 rounded-lg bg-rose-500/30 flex items-center justify-center text-rose-300 font-bold">
                  YT
                </div>
                <div>
                  <p className="text-[10px] text-slate-300">YouTube</p>
                  <p className="font-bold text-white">Forum GenRe Kota Depok</p>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-slate-400 mt-6 pt-4 border-t border-white/10">
              Sekretariat: Gedung Dibaleka II Balai Kota Depok, Jl. Margonda Raya No. 54, Kota
              Depok, Jawa Barat.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
