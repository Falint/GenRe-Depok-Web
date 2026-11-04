// Data Lengkap Pengurus Forum GenRe Kota Depok 2026/2027 Berdasarkan Primary Sheet Resmi
export const ROLES = [
  // Pengurus Inti
  { id: 'ketua', name: 'Muhammad Ighasta Mughis', role: 'Ketua Umum', group: 'Pengurus Inti', level: 'inti', avatar: '👑' },
  { id: 'wakil', name: 'Muhamad Arfan', role: 'Wakil Ketua Umum', group: 'Pengurus Inti', level: 'inti', avatar: '⭐' },
  { id: 'sekretaris', name: 'Raihan Satria Elezar', role: 'Sekretaris Umum', group: 'Pengurus Inti', level: 'inti', avatar: '📝' },
  { id: 'bendahara_1', name: 'Nazwa Zahira', role: 'Bendahara Controller (Audit & Kas)', group: 'Pengurus Inti', level: 'inti', avatar: '💰' },
  { id: 'bendahara_2', name: 'Tiara Maulidia', role: 'Bendahara Treasure & BUMF', group: 'Pengurus Inti', level: 'inti', avatar: '💳' },

  // Kepala Bidang
  { id: 'kabid_internal', name: "Roidah A'isyi Shofwah", role: 'Kepala Bidang Internal', group: 'Kepala Bidang', level: 'kabid', avatar: '🏢' },
  { id: 'kabid_eksternal', name: 'Agnia Khumaira', role: 'Kepala Bidang Eksternal', group: 'Kepala Bidang', level: 'kabid', avatar: '🎯' },
  { id: 'kabid_branding', name: 'Teuku Andika Jalaluddin Rumi', role: 'Kepala Bidang Branding', group: 'Kepala Bidang', level: 'kabid', avatar: '🎨' },

  // Kepala Divisi - Bidang Eksternal
  { id: 'kadiv_program_reguler', name: 'Muhammad Fauzan Al-Anshori', role: 'Kadiv Program Reguler', group: 'Bidang Eksternal', level: 'kadiv', avatar: '🎒' },
  { id: 'kadiv_program_nonreguler', name: 'Fathir Muhammad Ramadhan', role: 'Kadiv Program Non-Reguler', group: 'Bidang Eksternal', level: 'kadiv', avatar: '🎪' },

  // Kepala Divisi - Bidang Internal
  { id: 'kadiv_forum_kecamatan', name: 'Muhamad Rizkan H.', role: 'Kadiv Forum GenRe Kecamatan', group: 'Bidang Internal', level: 'kadiv', avatar: '📍' },
  { id: 'kadiv_duta', name: 'Melani Sofyan Putri', role: 'Kadiv Duta GenRe', group: 'Bidang Internal', level: 'kadiv', avatar: '🏆' },
  { id: 'kadiv_pikr', name: 'Ade Rifki Perdian', role: 'Kadiv PIK-R', group: 'Bidang Internal', level: 'kadiv', avatar: '🤝' },

  // Kepala Divisi - Bidang Branding
  { id: 'kadiv_pr', name: 'Muhammad Diva', role: 'Kadiv Public Relation', group: 'Bidang Branding', level: 'kadiv', avatar: '📢' },
  { id: 'kadiv_sosmed', name: 'Allya Nurul Febyana', role: 'Kadiv Social Media', group: 'Bidang Branding', level: 'kadiv', avatar: '📱' },
  { id: 'kadiv_design', name: 'Annisa Revy Alifiah', role: 'Kadiv Design', group: 'Bidang Branding', level: 'kadiv', avatar: '🖌️' },
  { id: 'kadiv_video', name: 'Plt. Kepala Divisi', role: 'Kadiv Video Editor', group: 'Bidang Branding', level: 'kadiv', avatar: '🎬' },

  // Staf - Contoh Representatif dari Tiap Divisi
  { id: 'staff_video_adrian', name: 'Adrian Saputra Kaban', role: 'Staff Divisi Video Editor', group: 'Bidang Branding', level: 'staff', avatar: '👤' },
  { id: 'staff_reguler_radit', name: 'Radit', role: 'Staff Divisi Program Reguler', group: 'Bidang Eksternal', level: 'staff', avatar: '👤' },
  { id: 'staff_nonreg_darlo', name: 'Darlo', role: 'Staff Divisi Program Non-Reguler', group: 'Bidang Eksternal', level: 'staff', avatar: '👤' },
  { id: 'staff_kec_frida', name: 'Frida Fatma Salsabila', role: 'Staff Divisi Forum GenRe Kec', group: 'Bidang Internal', level: 'staff', avatar: '👤' },
  { id: 'staff_duta_alya', name: 'Alya Citra Lestari', role: 'Staff Divisi Duta GenRe', group: 'Bidang Internal', level: 'staff', avatar: '👤' },
  { id: 'staff_pikr_natasya', name: 'Natasya Wulandari Priyanto', role: 'Staff Divisi PIK-R', group: 'Bidang Internal', level: 'staff', avatar: '👤' },
  { id: 'staff_pr_raihan', name: 'Raihan Sukmajaya', role: 'Staff Divisi Public Relation', group: 'Bidang Branding', level: 'staff', avatar: '👤' },
  { id: 'staff_sosmed_faza', name: 'Muhammad Faza', role: 'Staff Divisi Social Media', group: 'Bidang Branding', level: 'staff', avatar: '👤' },
  { id: 'staff_design_siti', name: 'Siti Nur Faizah', role: 'Staff Divisi Design', group: 'Bidang Branding', level: 'staff', avatar: '👤' }
];

// Helper Permission RBAC
export const isPengurusInti = (roleId) => {
  return ['inti', 'ketua', 'wakil', 'sekretaris', 'bendahara_1', 'bendahara_2'].includes(roleId);
};

export const canViewAdminFinance = (roleId) => {
  return isPengurusInti(roleId);
};

export const canApproveOrConfirm = (roleId) => {
  return ['inti', 'kabid', 'ketua', 'wakil', 'sekretaris', 'bendahara_1', 'bendahara_2', 'kabid_internal', 'kabid_eksternal', 'kabid_branding'].includes(roleId);
};

export const canViewAttendanceList = (roleId) => {
  return canApproveOrConfirm(roleId);
};

// Database 32 Jobdesc Resmi (Lama vs Perbaikan)
export const JOBDESC_DATA = [
  {
    no: 1,
    jabatan: "Pelindung 1 (Ayah GenRe Kota Depok)",
    jobdescLama: "Memberikan pengayoman, perlindungan, serta dukungan kebijakan tertinggi secara kelembagaan dan pemerintahan terhadap seluruh keberlangsungan program Forum GenRe Kota Depok.",
    jobdescPerbaikan: "Memberikan perlindungan dan dukungan kelembagaan terhadap keberlangsungan Forum GenRe Kota Depok, serta mendorong sinergi program organisasi dengan kebijakan dan prioritas pembangunan Pemerintah Kota Depok.",
    kategori: "Pimpinan Kehormatan"
  },
  {
    no: 2,
    jabatan: "Pelindung 2 (Bunda GenRe Kota Depok)",
    jobdescLama: "Memberikan pengayoman, dorongan moral, dan dukungan edukatif dalam penguatan ketahanan keluarga serta pembinaan karakter remaja.",
    jobdescPerbaikan: "Memberikan dukungan moral, edukatif, dan kelembagaan dalam pengembangan karakter remaja, penguatan ketahanan keluarga, serta mendorong peran keluarga dalam mendukung program-program Forum GenRe Kota Depok.",
    kategori: "Pimpinan Kehormatan"
  },
  {
    no: 3,
    jabatan: "Penasihat 1",
    jobdescLama: "Memberikan masukan dan arahan strategis terkait integrasi program Forum GenRe dengan kebijakan pemerintahan daerah.",
    jobdescPerbaikan: "Memberikan pertimbangan dan arahan strategis terkait kebijakan pemerintahan daerah, serta memfasilitasi sinergi Forum GenRe dengan perangkat daerah dan pemangku kepentingan terkait.",
    kategori: "Dewan Pertimbangan"
  },
  {
    no: 4,
    jabatan: "Penasihat 2",
    jobdescLama: "Memberikan pertimbangan strategis, masukan teknis, serta arahan dalam penyusunan kebijakan dan pelaksanaan program kerja organisasi.",
    jobdescPerbaikan: "Memberikan arahan strategis dan rekomendasi teknis terkait pengembangan organisasi, penyusunan program kerja, serta memastikan keselarasan kegiatan Forum GenRe dengan kebijakan dan program DP3AP2KB Kota Depok.",
    kategori: "Dewan Pertimbangan"
  },
  {
    no: 5,
    jabatan: "Pembina",
    jobdescLama: "Melakukan bimbingan teknis, pendampingan operasional harian, supervisi, serta pembinaan langsung terhadap pencapaian target organisasi.",
    jobdescPerbaikan: "Melaksanakan pembinaan, pendampingan teknis, dan supervisi terhadap jalannya organisasi; memberikan rekomendasi penyelesaian kendala; serta mengevaluasi pelaksanaan program kerja dan pencapaian target organisasi.",
    kategori: "Dewan Pembina"
  },
  {
    no: 6,
    jabatan: "Ketua Umum",
    pejabat: "Muhammad Ighasta Mughis",
    jobdescLama: "Memimpin, mengoordinasikan, dan bertanggung jawab penuh atas arah strategis, jalannya roda organisasi, serta perwakilan resmi lembaga.",
    jobdescPerbaikan: "Menetapkan arah strategis dan prioritas organisasi; memimpin serta mengoordinasikan seluruh unsur kepengurusan; mengambil keputusan strategis; mengawasi pencapaian target setiap bidang; mengevaluasi kinerja kepengurusan; serta menjadi representasi resmi Forum GenRe Kota Depok.",
    kategori: "Pengurus Inti"
  },
  {
    no: 7,
    jabatan: "Wakil Ketua Umum",
    pejabat: "Muhamad Arfan",
    jobdescLama: "Mendampingi Ketua dalam fungsi manajerial internal, mewakili Ketua jika berhalangan, serta memonitor alur kerja antar-bidang.",
    jobdescPerbaikan: "Mendampingi Ketua dalam mengendalikan dan mengoordinasikan pelaksanaan organisasi; memastikan koordinasi dan sinergi antarbidang berjalan efektif; memantau progres program kerja; membantu menyelesaikan kendala operasional; serta menjalankan tugas Ketua apabila berhalangan.",
    kategori: "Pengurus Inti"
  },
  {
    no: 8,
    jabatan: "Sekretaris Umum",
    pejabat: "Raihan Satria Elezar",
    jobdescLama: "Memimpin penataan administrasi, persuratan resmi, penyusunan proposal, LPJ, serta tata kelola arsip dokumen organisasi.",
    jobdescPerbaikan: "Bertanggung jawab atas keseluruhan tata kelola administrasi organisasi, termasuk persuratan, proposal, laporan pertanggungjawaban, pengarsipan, pendataan kelembagaan, serta standarisasi dokumen dan administrasi setiap bidang.",
    kategori: "Pengurus Inti"
  },
  {
    no: 9,
    jabatan: "Sekretaris II",
    pejabat: "Bantuan Kesekretariatan",
    jobdescLama: "Membantu Sekretaris I dalam pembuatan notulensi rapat, rekapitulasi data internal, serta distribusi surat-menyurat.",
    jobdescPerbaikan: "Mendukung pelaksanaan administrasi organisasi melalui penyusunan notulensi, rekapitulasi data pengurus dan kegiatan, pengelolaan agenda rapat, distribusi dokumen, serta membantu pemutakhiran arsip organisasi.",
    kategori: "Pengurus Inti"
  },
  {
    no: 10,
    jabatan: "Bendahara Controller",
    pejabat: "Nazwa Zahira",
    jobdescLama: "Mengontrol, mengaudit, dan mengawasi sirkulasi arus kas, pengeluaran anggaran, serta verifikasi laporan keuangan tiap bidang/divisi.",
    jobdescPerbaikan: "Melakukan pengendalian dan pengawasan keuangan organisasi melalui pemeriksaan pengajuan anggaran, verifikasi bukti transaksi, pemantauan realisasi anggaran, rekonsiliasi laporan keuangan, serta penyusunan laporan evaluasi keuangan secara berkala.",
    kategori: "Pengurus Inti"
  },
  {
    no: 11,
    jabatan: "Bendahara Treasure (BUMF)",
    pejabat: "Tiara Maulidia",
    jobdescLama: "Mengelola pembukuan kas rutin harian serta mengembangkan unit usaha mandiri melalui Badan Usaha Milik Forum (BUMF).",
    jobdescPerbaikan: "Mengelola pencatatan transaksi, penerimaan dan pengeluaran kas, serta administrasi keuangan organisasi; mengembangkan dan mengelola Badan Usaha Milik Forum (BUMF); mengidentifikasi peluang usaha dan sumber pendanaan mandiri; serta menyusun laporan keuangan dan perkembangan usaha secara berkala.",
    kategori: "Pengurus Inti"
  },
  {
    no: 12,
    jabatan: "Kepala Bidang Internal",
    pejabat: "Roidah A'isyi Shofwah",
    jobdescLama: "Mengordinasikan, mengawasi, dan mengendalikan program kerja operasional pada Divisi Duta, Divisi PIK-R, dan Divisi Forum GenRe.",
    jobdescPerbaikan: "Memimpin perencanaan, koordinasi, pengawasan, dan evaluasi seluruh program Bidang Internal; memastikan kinerja Divisi Duta, PIK-R, dan Forum GenRe berjalan sesuai target; serta menyusun laporan perkembangan dan rekomendasi pengembangan internal organisasi kepada Ketua.",
    kategori: "Kepala Bidang"
  },
  {
    no: 13,
    jabatan: "Koordinator Divisi Duta",
    pejabat: "Melani Sofyan Putri",
    jobdescLama: "Mengondisikan dan merencanakan proses seleksi, pembinaan, serta pemberdayaan Duta GenRe Kota Depok.",
    jobdescPerbaikan: "Merencanakan dan mengoordinasikan proses seleksi, pembinaan, pengembangan kapasitas, serta pemberdayaan Duta GenRe Kota Depok; menyusun agenda dan penugasan Duta; memantau keaktifan dan kontribusi Duta; serta mengevaluasi pelaksanaan tugas dan peran Duta sebagai representasi program GenRe.",
    kategori: "Bidang Internal"
  },
  {
    no: 14,
    jabatan: "Anggota Divisi Duta",
    pejabat: "Alya Citra Lestari, Khalimatussaqdiah",
    jobdescLama: "Mengeksekusi penugasan advokasi Duta GenRe sebagai role model remaja serta memfasilitasi program capacity building Duta.",
    jobdescPerbaikan: "Melaksanakan program pembinaan dan pengembangan kapasitas Duta GenRe; memfasilitasi penugasan advokasi dan edukasi remaja; mendukung koordinasi kegiatan Duta; serta melakukan pendataan, dokumentasi, dan evaluasi aktivitas serta kontribusi Duta GenRe.",
    kategori: "Bidang Internal"
  },
  {
    no: 15,
    jabatan: "Koordinator Divisi PIK-R",
    pejabat: "Ade Rifki Perdian",
    jobdescLama: "Memetakan dan mengoordinasikan pembinaan serta pemetaan jejaring kelompok PIK-R sekolah/masyarakat di Kota Depok.",
    jobdescPerbaikan: "Menyusun pemetaan dan basis data PIK-R di tingkat sekolah maupun masyarakat; mengoordinasikan pembinaan dan pengembangan jejaring PIK-R; memfasilitasi peningkatan kapasitas pengelola dan anggota PIK-R; serta memantau keaktifan, kebutuhan, dan perkembangan kelompok PIK-R di Kota Depok.",
    kategori: "Bidang Internal"
  },
  {
    no: 16,
    jabatan: "Anggota Divisi PIK-R",
    pejabat: "Natasya Wulandari Priyanto, Sulthon Prawirotomo",
    jobdescLama: "Membantu pendataan aktivitas kelompok PIK-R serta mendorong penguatan materi Pendidik Sebaya (PS) dan Konselor Sebaya (KS).",
    jobdescPerbaikan: "Melaksanakan pendataan dan pemutakhiran aktivitas kelompok PIK-R; membantu penyebarluasan materi substansi GenRe; mendukung pengembangan kapasitas Pendidik Sebaya (PS) dan Konselor Sebaya (KS); serta melakukan dokumentasi dan pelaporan perkembangan kegiatan PIK-R.",
    kategori: "Bidang Internal"
  },
  {
    no: 17,
    jabatan: "Koordinator Divisi Forum GenRe Kecamatan",
    pejabat: "Muhamad Rizkan H.",
    jobdescLama: "Mengordinasikan konsolidasi internal serta mempererat hubungan dengan kepengurusan Forum GenRe tingkat kecamatan/kelurahan.",
    jobdescPerbaikan: "Mengoordinasikan konsolidasi dan penguatan kelembagaan Forum GenRe Kecamatan; membangun komunikasi dan koordinasi rutin dengan seluruh ketua Forum GenRe Kecamatan; mengidentifikasi kebutuhan dan kendala wilayah; serta memastikan aspirasi dan informasi dari tingkat kecamatan tersampaikan kepada pengurus kota.",
    kategori: "Bidang Internal"
  },
  {
    no: 18,
    jabatan: "Anggota Divisi Forum GenRe Kecamatan",
    pejabat: "Frida Fatma Salsabila, Sinta Khairunisa, Muhammad Shidqi Fadhali",
    jobdescLama: "Menyelenggarakan kegiatan keakraban pengurus, penguatan keanggotaan, serta pemutakhiran database kader.",
    jobdescPerbaikan: "Melaksanakan pendataan dan pemutakhiran database pengurus serta kader Forum GenRe; memfasilitasi kegiatan penguatan kapasitas dan keakraban antarpengurus; mendukung konsolidasi dengan Forum GenRe Kecamatan; serta menghimpun aspirasi, kebutuhan, dan laporan perkembangan kader di setiap wilayah.",
    kategori: "Bidang Internal"
  },
  {
    no: 19,
    jabatan: "Kepala Bidang Eksternal",
    pejabat: "Agnia Khumaira",
    jobdescLama: "Mengordinasikan arah kebijakan kegiatan lapangan, keterlibatan publik, dan program kerja eksternal organisasi.",
    jobdescPerbaikan: "Memimpin perencanaan, koordinasi, dan evaluasi seluruh program eksternal organisasi; mengembangkan jejaring kolaborasi dengan pemerintah, komunitas, lembaga pendidikan, organisasi kepemudaan, dan mitra strategis; serta memastikan keterlibatan publik dan dampak program eksternal berjalan sesuai target.",
    kategori: "Kepala Bidang"
  },
  {
    no: 20,
    jabatan: "Koordinator Divisi Kegiatan Reguler",
    pejabat: "Muhammad Fauzan Al-Anshori",
    jobdescLama: "Merencanakan dan memimpin pelaksanaan agenda/program kerja tahunan rutin organisasi.",
    jobdescPerbaikan: "Menyusun perencanaan dan kalender program kerja reguler tahunan; mengoordinasikan persiapan, pelaksanaan, dan evaluasi kegiatan; memastikan kesiapan sumber daya, kepanitiaan, dan kebutuhan operasional; serta menyusun laporan capaian setiap kegiatan.",
    kategori: "Bidang Eksternal"
  },
  {
    no: 21,
    jabatan: "Anggota Divisi Kegiatan Reguler",
    pejabat: "Radit, Rayya, Fairuz",
    jobdescLama: "Menyusun rancangan teknis acara (rundown), kebutuhan operasional, dan mengeksekusi program utama di lapangan.",
    jobdescPerbaikan: "Menyusun kebutuhan teknis pelaksanaan kegiatan, termasuk rundown, konsep acara, perlengkapan, dan kebutuhan operasional; melaksanakan tugas kepanitiaan dan teknis lapangan; serta membantu dokumentasi, evaluasi, dan penyusunan laporan kegiatan.",
    kategori: "Bidang Eksternal"
  },
  {
    no: 22,
    jabatan: "Koordinator Divisi Kegiatan Non-Reguler",
    pejabat: "Fathir Muhammad Ramadhan",
    jobdescLama: "Mengondisikan penyusunan program insidental, proyek inovasi, serta respons aksi terhadap isu remaja terkini.",
    jobdescPerbaikan: "Mengidentifikasi isu dan kebutuhan remaja terkini sebagai dasar pengembangan program inovatif dan insidental; menginisiasi serta mengoordinasikan kegiatan responsif terhadap isu aktual; mengembangkan peluang kolaborasi program; serta mengevaluasi relevansi dan dampak kegiatan yang dilaksanakan.",
    kategori: "Bidang Eksternal"
  },
  {
    no: 23,
    jabatan: "Anggota Divisi Kegiatan Non-Reguler",
    pejabat: "Darlo, Tius, Ahmad Abidzahr, Sahara Ramadhani",
    jobdescLama: "Membantu pelaksanaan acara kolaborasi lintas komunitas/instansi serta eksekusi kegiatan event support pihak luar.",
    jobdescPerbaikan: "Mendukung perencanaan dan pelaksanaan program inovatif serta kegiatan insidental; memfasilitasi koordinasi teknis dengan komunitas dan instansi mitra; melaksanakan tugas operasional kegiatan; serta mendokumentasikan dan melaporkan hasil pelaksanaan program.",
    kategori: "Bidang Eksternal"
  },
  {
    no: 24,
    jabatan: "Kepala Bidang Branding",
    pejabat: "Teuku Andika Jalaluddin Rumi",
    jobdescLama: "Memimpin strategi Komunikasi, Informasi, dan Edukasi (KIE) publik serta menjaga identitas visual organisasi.",
    jobdescPerbaikan: "Menetapkan arah strategi branding dan komunikasi publik organisasi; mengoordinasikan Divisi Public Relation, Desain, Sosial Media, dan Video Editor; memastikan konsistensi identitas dan citra organisasi; mengembangkan strategi komunikasi, informasi, dan edukasi (KIE); serta mengevaluasi efektivitas publikasi dan jangkauan komunikasi organisasi.",
    kategori: "Kepala Bidang"
  },
  {
    no: 25,
    jabatan: "Koordinator Divisi Public Relation",
    pejabat: "Muhammad Diva",
    jobdescLama: "Mengelola hubungan dengan pihak eksternal, media massa, sponsor, dan menjadi narahubung/humas utama.",
    jobdescPerbaikan: "Menyusun dan mengoordinasikan strategi hubungan masyarakat; membangun serta memelihara kemitraan dengan instansi pemerintah, media, komunitas, sponsor, dan pemangku kepentingan lainnya; mengelola komunikasi dan korespondensi eksternal; serta menjadi narahubung resmi organisasi dalam urusan kehumasan.",
    kategori: "Bidang Branding"
  },
  {
    no: 26,
    jabatan: "Anggota Divisi Public Relation",
    pejabat: "Raihan Sukmajaya, A'idah Husniyah, Nur Anisah",
    jobdescLama: "Mengelola alur persuratan kemitraan, menyusun siaran pers (press release), serta mendampingi juru bicara acara.",
    jobdescPerbaikan: "Melaksanakan administrasi dan korespondensi kemitraan; menyusun proposal penawaran kerja sama, surat kemitraan, dan siaran pers; membantu koordinasi dengan mitra eksternal; serta mendukung kebutuhan kehumasan dan pendampingan narasumber maupun juru bicara dalam kegiatan organisasi.",
    kategori: "Bidang Branding"
  },
  {
    no: 27,
    jabatan: "Koordinator Divisi Desain",
    pejabat: "Annisa Revy Alifiah",
    jobdescLama: "Mengarahkan standar estetika dan brand guideline visual untuk seluruh materi publikasi organisasi.",
    jobdescPerbaikan: "Menyusun dan mengembangkan brand guideline organisasi; menetapkan standar identitas visual, desain, dan konsistensi komunikasi grafis; mengoordinasikan produksi kebutuhan desain; serta melakukan kontrol kualitas terhadap seluruh materi visual sebelum dipublikasikan.",
    kategori: "Bidang Branding"
  },
  {
    no: 28,
    jabatan: "Anggota Divisi Desain",
    pejabat: "Siti Nur Faizah",
    jobdescLama: "Memproduksi aset grafis seperti poster, feed/story Instagram, spanduk, banner, dan materi visual publikasi lainnya.",
    jobdescPerbaikan: "Memproduksi materi desain grafis untuk kebutuhan publikasi dan kegiatan organisasi; menerapkan identitas visual sesuai brand guideline; menyesuaikan desain berdasarkan kebutuhan program dan media publikasi; serta mengelola arsip dan file desain organisasi.",
    kategori: "Bidang Branding"
  },
  {
    no: 29,
    jabatan: "Koordinator Divisi Sosial Media",
    pejabat: "Allya Nurul Febyana",
    jobdescLama: "Merancang strategi content marketing, jadwal tayang, dan pengawasan operasional seluruh platform media sosial resmi.",
    jobdescPerbaikan: "Menyusun strategi komunikasi dan pengelolaan media sosial organisasi; menetapkan kalender serta content planner; mengoordinasikan produksi dan distribusi konten; memantau performa media sosial melalui data jangkauan, interaksi, dan pertumbuhan audiens; serta menyusun evaluasi efektivitas publikasi secara berkala.",
    kategori: "Bidang Branding"
  },
  {
    no: 30,
    jabatan: "Anggota Divisi Sosial Media",
    pejabat: "Muhammad Faza, Ahmad Kafka",
    jobdescLama: "Menyusun content planner, menulis caption, mengunggah konten tepat waktu, serta merespons interaksi audiensi (engagement).",
    jobdescPerbaikan: "Menyusun materi dan jadwal publikasi konten; menulis caption dan copywriting; mengelola pengunggahan konten sesuai kalender publikasi; merespons komentar dan pesan audiens; serta melakukan pemantauan dan rekapitulasi data interaksi media sosial.",
    kategori: "Bidang Branding"
  },
  {
    no: 31,
    jabatan: "Koordinator Divisi Video Editor",
    pejabat: "Plt. Koordinator",
    jobdescLama: "Mengarahkan konsep liputan audio-visual serta produksi konten video edukasi/kegiatan.",
    jobdescPerbaikan: "Merencanakan konsep dan strategi produksi konten audiovisual organisasi; mengoordinasikan proses pengambilan gambar, penyuntingan, dan publikasi video; menetapkan standar kualitas audiovisual; serta memastikan konten video memiliki pesan edukatif dan mendukung identitas branding organisasi.",
    kategori: "Bidang Branding"
  },
  {
    no: 32,
    jabatan: "Anggota Divisi Video Editor",
    pejabat: "Adrian Saputra Kaban",
    jobdescLama: "Mempelopori liputan dokumentasi, melakukan proses editing video (Reels/TikTok/Aftermovie), serta mengelola arsip video.",
    jobdescPerbaikan: "Melaksanakan peliputan dan dokumentasi audiovisual kegiatan; melakukan pengambilan gambar, penyuntingan, dan produksi video untuk kebutuhan edukasi maupun publikasi; mengembangkan konten kreatif sesuai karakteristik platform digital; serta mengelola dan mengarsipkan seluruh dokumentasi video organisasi.",
    kategori: "Bidang Branding"
  }
];

export const INITIAL_SURAT = [
  {
    id: 'SRT-001',
    nomor: '042/ST/FG-DPK/XI/2026',
    jenis: 'Surat Tugas',
    perihal: 'Penugasan Fasilitator Sosialisasi Triad KRR di SMAN 1 Kota Depok',
    pemohon: 'Muhammad Fauzan Al-Anshori (Kadiv Program Reguler)',
    divisi: 'Bidang Eksternal',
    tanggal: '04 November 2026',
    status: 'Menunggu ACC Ketua',
    tujuan: 'Kepala Sekolah SMAN 1 Depok',
    keterangan: 'Pemberian materi Triad KRR dan konseling sebaya PIK-R untuk 120 siswa kelas X.',
    urgensi: 'Tinggi',
    approvalHistory: [
      { step: 'Pengajuan oleh Divisi', actor: 'Muhammad Fauzan Al-Anshori', status: 'Disetujui', time: '02 Nov 2026, 14:00' },
      { step: 'Verifikasi Kabid Eksternal', actor: 'Agnia Khumaira', status: 'Disetujui', time: '02 Nov 2026, 16:30' },
      { step: 'Tata Naskah & Penomoran', actor: 'Raihan Satria Elezar (Sekretaris)', status: 'Disetujui', time: '03 Nov 2026, 09:15' },
      { step: 'Tanda Tangan Ketua', actor: 'Muhammad Ighasta Mughis', status: 'Pending', time: '-' }
    ]
  },
  {
    id: 'SRT-002',
    nomor: '041/SU/FG-DPK/XI/2026',
    jenis: 'Surat Undangan',
    perihal: 'Undangan Rapat Koordinasi Forum GenRe 11 Kecamatan se-Kota Depok',
    pemohon: 'Muhamad Rizkan H. (Kadiv Forum Kecamatan)',
    divisi: 'Bidang Internal',
    tanggal: '02 November 2026',
    status: 'Selesai / Terbit (QR ACC)',
    tujuan: 'Koordinator GenRe Kecamatan (Beji, Pancoran Mas, Sukmajaya, Cilodong, dll)',
    keterangan: 'Rapat evaluasi pembentukan PIK-R jalur masyarakat dan jambore kecamatan.',
    urgensi: 'Sedang',
    approvalHistory: [
      { step: 'Pengajuan oleh Divisi', actor: 'Muhamad Rizkan H.', status: 'Disetujui', time: '30 Okt 2026' },
      { step: 'Verifikasi Kabid Internal', actor: "Roidah A'isyi Shofwah", status: 'Disetujui', time: '30 Okt 2026' },
      { step: 'Tata Naskah & Penomoran', actor: 'Raihan Satria Elezar (Sekretaris)', status: 'Disetujui', time: '31 Okt 2026' },
      { step: 'Tanda Tangan Ketua', actor: 'Muhammad Ighasta Mughis', status: 'Disetujui (QR Verified)', time: '01 Nov 2026' }
    ]
  },
  {
    id: 'SRT-003',
    nomor: 'DRAFT-043/SPm/FG-DPK',
    jenis: 'Surat Permohonan',
    perihal: 'Permohonan Peminjaman Aula Gedung Balai Kota Depok untuk Grand Final Duta GenRe',
    pemohon: 'Melani Sofyan Putri (Kadiv Duta)',
    divisi: 'Bidang Internal',
    tanggal: '03 November 2026',
    status: 'Menunggu Review Kabid',
    tujuan: 'Kepala Bagian Umum Setda Kota Depok',
    keterangan: 'Peminjaman aula kapasitas 500 orang tanggal 28 November 2026.',
    urgensi: 'Tinggi',
    approvalHistory: [
      { step: 'Pengajuan oleh Divisi', actor: 'Melani Sofyan Putri', status: 'Diajukan', time: '03 Nov 2026, 11:20' },
      { step: 'Verifikasi Kabid Internal', actor: "Roidah A'isyi Shofwah", status: 'Pending', time: '-' }
    ]
  }
];

export const INITIAL_REIMBURSE = [
  {
    id: 'RMB-101',
    proker: 'GenRe Goes to School (Batch 3)',
    pemohon: 'Muhammad Fauzan Al-Anshori (Kadiv Program Reguler)',
    divisi: 'Bidang Eksternal',
    nominal: 450000,
    keterangan: 'Pembelian snack konsumsi narasumber dan print modul saku Triad KRR 50 rangkap',
    bank: 'Bank BCA',
    rekening: '8801239821 a.n Muhammad Fauzan',
    status: 'Menunggu Approval Bendahara',
    tanggal: '02 November 2026',
    buktiStruk: 'https://images.unsplash.com/photo-1554415707-9e49fe832807?w=500&auto=format&fit=crop&q=60',
    approvalChain: [
      { role: 'Kadiv / Inisiator', name: 'Muhammad Fauzan', status: 'Diajukan', date: '02 Nov 2026' },
      { role: 'Kabid Eksternal', name: 'Agnia Khumaira', status: 'Disetujui', date: '02 Nov 2026' },
      { role: 'Bendahara Controller', name: 'Nazwa Zahira', status: 'Verifikasi Berkas', date: 'In Review' },
      { role: 'Bendahara Treasure', name: 'Tiara Maulidia', status: 'Pencairan', date: 'Pending' }
    ]
  },
  {
    id: 'RMB-102',
    proker: 'Produksi Konten Podcast Remaja Eps 12',
    pemohon: 'Adrian Saputra Kaban (Staff Video Editor)',
    divisi: 'Bidang Branding',
    nominal: 280000,
    keterangan: 'Sewa clip-on wireless mic 1 hari dan baterai cadangan',
    bank: 'Bank Mandiri',
    rekening: '15700098231 a.n Adrian Saputra',
    status: 'Selesai / Dicairkan',
    tanggal: '30 Oktober 2026',
    buktiStruk: 'https://images.unsplash.com/photo-1554415707-9e49fe832807?w=500&auto=format&fit=crop&q=60',
    approvalChain: [
      { role: 'Staff Video Editor', name: 'Adrian Saputra', status: 'Diajukan', date: '29 Okt 2026' },
      { role: 'Kabid Branding', name: 'Teuku Andika Jalaluddin Rumi', status: 'Disetujui', date: '29 Okt 2026' },
      { role: 'Bendahara Controller', name: 'Nazwa Zahira', status: 'Disetujui', date: '30 Okt 2026' },
      { role: 'Bendahara Treasure', name: 'Tiara Maulidia', status: 'Ditransfer (Rp 280.000)', date: '30 Okt 2026' }
    ]
  },
  {
    id: 'RMB-103',
    proker: 'Rapat Roadshow 11 Kecamatan',
    pemohon: 'Muhamad Rizkan H. (Kadiv Forum Kecamatan)',
    divisi: 'Bidang Internal',
    nominal: 620000,
    keterangan: 'Bensin operasional survey 5 kecamatan barat & konsumsi perwakilan kecamatan',
    bank: 'Bank BJB',
    rekening: '0012938128 a.n Muhamad Rizkan',
    status: 'Menunggu ACC Ketua (Nominal > 500k)',
    tanggal: '03 November 2026',
    buktiStruk: 'https://images.unsplash.com/photo-1554415707-9e49fe832807?w=500&auto=format&fit=crop&q=60',
    approvalChain: [
      { role: 'Kadiv Kecamatan', name: 'Muhamad Rizkan', status: 'Diajukan', date: '03 Nov 2026' },
      { role: 'Kabid Internal', name: "Roidah A'isyi Shofwah", status: 'Disetujui', date: '03 Nov 2026' },
      { role: 'Bendahara Controller', name: 'Nazwa Zahira', status: 'Valid', date: '03 Nov 2026' },
      { role: 'Ketua Umum', name: 'Muhammad Ighasta Mughis', status: 'Pending Sign-off', date: 'In Review' }
    ]
  }
];

export const INITIAL_KEUANGAN = {
  saldoUtama: 18450000,
  pemasukanBulanIni: 6500000,
  pengeluaranBulanIni: 2150000,
  paguAnggaran: [
    { bidang: 'Bidang Eksternal (Program)', pagu: 15000000, terpakai: 7200000, persentase: 48 },
    { bidang: 'Bidang Internal (Center/Kec/Duta/PIK-R)', pagu: 12000000, terpakai: 4800000, persentase: 40 },
    { bidang: 'Bidang Branding (Humas/Media/Desain)', pagu: 8000000, terpakai: 3100000, persentase: 38.7 },
    { bidang: 'Operasional Inti & Kesekretariatan', pagu: 5000000, terpakai: 1850000, persentase: 37 }
  ],
  transaksiTerbaru: [
    { tgl: '03 Nov 2026', deskripsi: 'Pencairan Reimburse Podcast Eps 12', jenis: 'Keluar', nominal: 280000, kategori: 'Bidang Branding' },
    { tgl: '01 Nov 2026', deskripsi: 'Bantuan Operasional DP3AP2KB Tahap II', jenis: 'Masuk', nominal: 5000000, kategori: 'Hibah Pemerintah' },
    { tgl: '28 Okt 2026', deskripsi: 'Iuran Wajib Pengurus Bulan Oktober', jenis: 'Masuk', nominal: 1500000, kategori: 'Iuran Internal' },
    { tgl: '25 Okt 2026', deskripsi: 'Cetak Banner & Roll Up Booth GenRe Fair', jenis: 'Keluar', nominal: 420000, kategori: 'Bidang Eksternal' }
  ]
};

export const INITIAL_PENGUMUMAN = [
  {
    id: 'ANN-01',
    judul: 'URGENT: Gladi Bersih Grand Final Apresiasi Duta GenRe Kota Depok 2026',
    kategori: 'Urgent',
    tanggal: '03 Nov 2026, 18:00 WIB',
    penulis: 'Muhammad Ighasta Mughis (Ketua Umum)',
    target: 'Semua Pengurus & Finalis Duta',
    isi: 'Diberitahukan kepada seluruh panitia dan pengurus Forum GenRe Kota Depok, gladi bersih akan dilaksanakan pada hari Jumat, 6 November 2026 pukul 14.00 WIB bertempat di Aula BJB Margonda. Kehadiran wajib dan mengenakan PDH GenRe.',
    totalTarget: 46,
    // Daftar user yang sudah konfirmasi hadir / membaca
    readList: [
      { roleId: 'ketua', name: 'Muhammad Ighasta Mughis', role: 'Ketua Umum', confirmedAt: '03 Nov 2026, 18:05' },
      { roleId: 'wakil', name: 'Muhamad Arfan', role: 'Wakil Ketua Umum', confirmedAt: '03 Nov 2026, 18:12' },
      { roleId: 'sekretaris', name: 'Raihan Satria Elezar', role: 'Sekretaris Umum', confirmedAt: '03 Nov 2026, 18:15' },
      { roleId: 'bendahara_1', name: 'Nazwa Zahira', role: 'Bendahara Controller', confirmedAt: '03 Nov 2026, 18:20' },
      { roleId: 'kabid_internal', name: "Roidah A'isyi Shofwah", role: 'Kabid Internal', confirmedAt: '03 Nov 2026, 18:25' },
      { roleId: 'kabid_eksternal', name: 'Agnia Khumaira', role: 'Kabid Eksternal', confirmedAt: '03 Nov 2026, 18:30' },
      { roleId: 'kabid_branding', name: 'Teuku Andika Jalaluddin Rumi', role: 'Kabid Branding', confirmedAt: '03 Nov 2026, 18:35' },
      { roleId: 'kadiv_duta', name: 'Melani Sofyan Putri', role: 'Kadiv Duta GenRe', confirmedAt: '03 Nov 2026, 18:40' },
      { roleId: 'staff_video_adrian', name: 'Adrian Saputra Kaban', role: 'Staff Video Editor', confirmedAt: '03 Nov 2026, 18:45' }
    ]
  },
  {
    id: 'ANN-02',
    judul: 'Sosialisasi Alur Persuratan & Reimburse Baru (No More WhatsApp Lost-Chats!)',
    kategori: 'Umum',
    tanggal: '01 Nov 2026, 10:00 WIB',
    penulis: 'Raihan Satria Elezar (Sekretaris Umum)',
    target: 'Seluruh Kepala Bidang & Kepala Divisi',
    isi: 'Mulai 1 November 2026, segala permohonan surat tugas, surat keluar, dan klaim reimburse wajib melalui sistem portal website ini. Pengajuan melalui chat personal WA tidak akan diproses demi transparansi kas dan arsip.',
    totalTarget: 46,
    readList: [
      { roleId: 'sekretaris', name: 'Raihan Satria Elezar', role: 'Sekretaris Umum', confirmedAt: '01 Nov 2026, 10:02' },
      { roleId: 'ketua', name: 'Muhammad Ighasta Mughis', role: 'Ketua Umum', confirmedAt: '01 Nov 2026, 10:15' },
      { roleId: 'bendahara_2', name: 'Tiara Maulidia', role: 'Bendahara Treasure', confirmedAt: '01 Nov 2026, 10:20' },
      { roleId: 'kadiv_program_reguler', name: 'Muhammad Fauzan', role: 'Kadiv Program Reguler', confirmedAt: '01 Nov 2026, 10:30' }
    ]
  },
  {
    id: 'ANN-03',
    judul: 'Pengumpulan Data Direktori PIK-R Jalur Masyarakat 11 Kecamatan',
    kategori: 'Kecamatan',
    tanggal: '29 Okt 2026, 13:45 WIB',
    penulis: 'Muhamad Rizkan H. (Kadiv Forum Kecamatan)',
    target: 'Koordinator 11 Kecamatan & Pengurus Internal',
    isi: 'Mohon masing-masing PIC Kecamatan memperbarui jumlah PIK-R aktif di wilayahnya melalui modul Request Informasi paling lambat 10 November 2026.',
    totalTarget: 22,
    readList: [
      { roleId: 'kadiv_forum_kecamatan', name: 'Muhamad Rizkan H.', role: 'Kadiv Kecamatan', confirmedAt: '29 Okt 2026, 14:00' },
      { roleId: 'kabid_internal', name: "Roidah A'isyi Shofwah", role: 'Kabid Internal', confirmedAt: '29 Okt 2026, 14:15' },
      { roleId: 'staff_kec_frida', name: 'Frida Fatma Salsabila', role: 'Staff Divisi Kecamatan', confirmedAt: '29 Okt 2026, 14:30' }
    ]
  }
];

export const INITIAL_TIKET_INFO = [
  {
    id: 'REQ-201',
    judul: 'Permintaan Bahan Materi & Data Stunting Kota Depok untuk Konten Reels',
    dari: 'Allya Nurul Febyana (Kadiv Sosmed)',
    divisiAsal: 'Bidang Branding',
    tujuan: 'Bidang Internal / Duta GenRe',
    prioritas: 'Tinggi',
    deadline: '05 Nov 2026',
    status: 'In Progress',
    deskripsi: 'Tim Sosmed membutuhkan data prevalensi stunting per kecamatan di Depok beserta 5 langkah pencegahan dari materi modul BKKBN untuk postingan Hari Kesehatan.',
    respons: 'Data sudah kami kompilasi dari dinas DP3AP2KB, sedang ditinjau Kabid Internal (Kak Roidah) sebelum dilampirkan.'
  },
  {
    id: 'REQ-202',
    judul: 'Kontak Ketua PIK-R Kecamatan Sukmajaya & Cilodong',
    dari: 'Muhammad Fauzan (Kadiv Program Reguler)',
    divisiAsal: 'Bidang Eksternal',
    tujuan: 'Bidang Internal / Divisi Kecamatan',
    prioritas: 'Sedang',
    deadline: '08 Nov 2026',
    status: 'Selesai',
    deskripsi: 'Perlu nomor kontak aktif Ketua PIK-R Sukmajaya dan Cilodong untuk konfirmasi jadwal kunjungan Roadshow Goes to Community.',
    respons: 'Sudah dikirimkan nomor kontak via lampiran dokumen kontak PIK-R 2026 oleh Muhamad Rizkan. Tiket ditutup.'
  },
  {
    id: 'REQ-203',
    judul: 'Request Pembuatan Template Feed Instagram Kegiatan Duta',
    dari: 'Melani Sofyan Putri (Kadiv Duta)',
    divisiAsal: 'Bidang Internal',
    tujuan: 'Bidang Branding / Divisi Design',
    prioritas: 'Mendesak',
    deadline: '04 Nov 2026',
    status: 'Open',
    deskripsi: 'Membutuhkan 3 template carousel Canva beresolusi tinggi dengan bingkai foto finalis Duta GenRe 2026 sesuai brand kit resmi.',
    respons: 'Belum ada tanggapan. Menunggu Kadiv Design (Annisa Revy) mengambil tiket.'
  }
];

export const INITIAL_MEDIA_LIBRARY = {
  modulPengetahuan: [
    {
      id: 'MOD-1',
      judul: 'Modul Pegangan Triad KRR (Seksualitas, HIV/AIDS, & Napza)',
      kategori: 'Triad KRR',
      jenjang: 'Semua Jenjang',
      halaman: 48,
      tahun: 2026,
      format: 'PDF (Resmi BKKBN & DP3AP2KB)',
      size: '4.8 MB',
      deskripsi: 'Pedoman edukasi pencegahan pernikahan anak, seks pra-nikah, bahaya HIV/AIDS, dan pencegahan penyalahgunaan zat adiktif.'
    },
    {
      id: 'MOD-2',
      judul: 'Kurikulum Tentang Kita: Modul Berani (Usia 10 - 14 Tahun)',
      kategori: 'Modul Pelatihan',
      jenjang: 'Remaja Awal',
      halaman: 36,
      tahun: 2025,
      format: 'PDF Interaktif',
      size: '6.2 MB',
      deskripsi: 'Panduan fasilitator sebaya untuk remaja awal mengenai perubahan fisik pubertas, konsep diri positif, dan pertemanan sehat.'
    },
    {
      id: 'MOD-3',
      judul: 'Kurikulum Tentang Kita: Modul Beraksi (Usia 15 - 19 Tahun)',
      kategori: 'Modul Pelatihan',
      jenjang: 'Remaja Madya',
      halaman: 52,
      tahun: 2025,
      format: 'PDF Interaktif',
      size: '7.1 MB',
      deskripsi: 'Modul perencanaan masa depan, pendidikan tinggi, life skills pengambilan keputusan kritis, dan literasi digital.'
    },
    {
      id: 'MOD-4',
      judul: 'Kurikulum Tentang Kita: Modul Berkolaborasi (Usia 20 - 24 Tahun)',
      kategori: 'Modul Pelatihan',
      jenjang: 'Remaja Akhir',
      halaman: 44,
      tahun: 2025,
      format: 'PDF Interaktif',
      size: '5.9 MB',
      deskripsi: 'Pedoman kesiapan berkeluarga, perencanaan finansial muda, serta pencegahan stunting dari hulu.'
    },
    {
      id: 'MOD-5',
      judul: 'Panduan Edukasi 8 Fungsi Keluarga & Pencegahan Stunting',
      kategori: 'Keluarga & Stunting',
      jenjang: 'Umum & Kader',
      halaman: 32,
      tahun: 2026,
      format: 'PDF',
      size: '3.4 MB',
      deskripsi: 'Materi sosialisasi peran remaja dalam mencegah kelahiran stunting dengan memenuhi gizi seimbang & menghindari anemia.'
    }
  ],
  brandKit: {
    colorPalette: [
      { name: 'GenRe Navy Blue', hex: '#005BAC', desc: 'Warna identitas utama (Profesional & Terpercaya)' },
      { name: 'GenRe Energetic Orange', hex: '#FF8200', desc: 'Warna semangat remaja & optimisme masa depan' },
      { name: 'GenRe Pure White', hex: '#FFFFFF', desc: 'Warna netral & kebersihan administrasi' },
      { name: 'Depok Cyber Slate', hex: '#1E293B', desc: 'Warna tipografi teks & kontras modern' }
    ],
    logos: [
      { nama: 'Logo Resmi Forum GenRe Kota Depok (Master Crest)', format: 'Vector PNG HD', size: '521 KB', url: '/logo-genre-depok.png' },
      { nama: 'Logo Kemitraan DP3AP2KB Kota Depok', format: 'PNG Official', size: '109 KB', url: '/logo-dp3ap2kb.png' },
      { nama: 'Lambang Pemerintah Kota Depok (Paricara Dharma)', format: 'Vector PNG', size: '232 KB', url: '/logo-depok.png' }
    ],
    videoAssets: [
      { nama: 'Bumper Video Opening Resmi GenRe Depok (1080p 60fps)', format: 'MP4 / 4K', durasi: '00:06', size: '24 MB' },
      { nama: 'Bumper Video Closing & Social Media Endscreen', format: 'MP4', durasi: '00:08', size: '31 MB' },
      { nama: 'Audio Jingle Salam GenRe Remaja Berencana (Master WAV)', format: 'WAV Audio', durasi: '01:45', size: '18 MB' },
      { nama: 'B-Roll Footage Kegiatan Duta GenRe & Roadshow Depok', format: 'Google Drive Archive', durasi: 'Multi-clip', size: '1.8 GB' }
    ]
  }
};
