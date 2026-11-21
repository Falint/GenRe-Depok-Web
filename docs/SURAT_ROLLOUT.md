# Surat: penomoran, approval, PDF, dan Google Drive

## Perilaku

- Kabid, inti, dan admin bisa mengajukan. Hanya inti/admin bisa memberi ACC. Pengajuan inti/admin langsung disetujui.
- Nomor baru berbagi satu urutan lintas jenis, mulai `001` setiap tahun WIB: `001/ST/FG-DPK/XI/2026`. Nomor dialokasikan ketika pengajuan tersimpan, bukan saat ACC. Setelah 999, nomor menjadi 1000.
- Nomor, status, dan riwayat lama tidak diubah. Pengajuan kabid lama yang masih menunggu dapat disetujui inti/admin. Pengajuan lama tidak otomatis dikirim ke Drive; inti/admin bisa memakai tombol simpan salinan ke Google Drive.
- Retry dari form yang sama memakai ID tetap. Jika respons hilang, jangan membuka form baru sebelum memeriksa daftar surat. Mengubah payload setelah request tersimpan akan ditolak.
- Surat disimpan sebagai data di database dan pratinjau HTML di portal. PDF dibuat di memori server hanya ketika pengguna menekan **Unduh PDF** setelah ACC; file diunduh ke perangkat tanpa disimpan di server atau Supabase Storage. PDF menggunakan kop dan isi template portal. Template mengikuti surat referensi: satu logo, kop organisasi, watermark, paragraf pembuka tetap, paragraf pengantar dari pemohon, dan rincian kegiatan. Blok tanda tangan Ketua M. Ighasta Mughis dan Sekretaris Raihan Satria Elezar beserta gambar asli dari referensi hanya muncul setelah ACC. Aktor sebenarnya dicatat pada riwayat portal; nama pada output bukan bukti kedua pejabat pribadi mengklik ACC. Tidak ada tahap approval sekretaris tambahan.
- Gambar tanda tangan disimpan di aset server, bukan `public/`. Route gambar memeriksa sesi, profil pengurus, akses baca RLS, dan status ACC; respons tidak boleh disimpan cache. Pengurus yang dapat membaca surat disetujui tetap dapat menyimpan gambar dari dokumen tersebut.
- Aset tanda tangan diekstrak dari gambar dan soft mask halaman pertama PDF referensi, termasuk stempel sekretaris. Tidak ada tanda tangan baru yang dibuat.
- `keterangan` menjadi paragraf pengantar wajib untuk pengajuan baru. `tanggal_kegiatan`, `waktu_kegiatan`, dan `tempat_kegiatan` wajib untuk Tugas/Undangan, opsional untuk Permohonan/Rekomendasi; `sistem_pelaksanaan` selalu opsional. Form menampilkan contoh tanpa mengisinya otomatis. Surat lama tetap terbaca tanpa rincian kegiatan.
- Preview dan PDF yang diunduh ulang memakai template baru. Salinan Drive yang sudah ada tidak ditimpa. Surat tanpa lampiran menampilkan `-`; halaman lampiran referensi tidak disertakan.
- Dengan migration `202611200001_event_registration_attachments.sql`, pengajuan surat baru dapat memilih satu agenda dan peserta terdaftar untuk lampiran. Server menyalin nama, instansi, unsur, dan judul agenda dalam transaksi pengajuan. Lampiran tidak mengikuti perubahan peserta/agenda setelahnya. Pilihan peserta yang berubah pada retry ditolak; urutan ID pilihan tidak memengaruhi kesamaan request. Surat lama tidak ditambah lampiran.
- Kolom Lampiran menampilkan **`1 (satu) berkas`** ketika ada peserta terpilih, meskipun tabel beberapa halaman. Preview, PDF unduhan, dan salinan Drive memakai data lampiran sama: tabel No., Nama, Instansi, Unsur dengan teks/garis hitam dan latar putih. PDF memulai lampiran di halaman baru dan mengulang header tabel setiap halaman. Lampiran mengikuti izin baca surat existing; seluruh pengurus yang bisa membaca surat dapat melihat peserta yang disertakan.
- Unduhan PDF memeriksa sesi, profil pengurus, status ACC, dan akses baca surat melalui RLS. Guest tidak dapat mengunduh. Kebijakan baca surat existing tetap berlaku; perubahan ini tidak membatasi surat hanya kepada pemohonnya.
- Pengajuan dan approval tidak menjalankan upload Google Drive otomatis. Integrasi OAuth/Picker tetap tersedia untuk dikerjakan nanti. Inti/admin dapat memilih **Simpan salinan ke Google Drive** secara manual dari pratinjau. Upload gagal tidak membatalkan persetujuan. Tidak ada worker retry otomatis; proses terhenti bisa diulang setelah lease dua menit berakhir.
- File mengikuti izin folder Drive. Portal tidak menjadikan file publik atau memberikan akses Drive otomatis kepada pemohon.

## Urutan penerapan

1. Cadangkan database dan hentikan sementara pengajuan/approval surat. Modul lain tidak perlu dihentikan.
2. Terapkan seluruh migration prasyarat repo hingga `202611130001_guest_accounts.sql`, lalu `202611190001_surat_workflow.sql` dan `202611190002_surat_template.sql` pada target yang sudah dikonfirmasi. Jangan menjalankan baseline ulang pada database existing.
3. Untuk database yang sudah menerapkan workflow, cukup jalankan **202611190002_surat_template.sql**. Migration ini menambah empat kolom nullable dan memperbarui RPC create; tidak menomori ulang atau mengubah surat lama. Tutup form lama dan hentikan pengajuan selama pergantian: payload lama ditolak setelah migration. Deploy aplikasi yang sesuai migration. Versi lama masih dapat membaca surat, tetapi INSERT langsung sudah ditolak. Jangan membuka pengajuan lagi sebelum kode baru aktif.
4. Tanpa konfigurasi Google, surat dapat diajukan, disetujui, dilihat, dan diunduh sebagai PDF. Template baru memerlukan migration 202611190002; bucket Storage tidak diperlukan.
5. Uji satu surat kabid dan satu surat inti/admin: nomor berbeda, approval sesuai role, pratinjau tersedia, dan unduhan PDF berhasil. Konfigurasi Google berikut opsional, hanya untuk menyimpan salinan ke Drive.

SQL, deploy, dan konfigurasi akun Google merupakan tindakan operator; pekerjaan lokal tidak menerapkannya otomatis.

## Konfigurasi Google Cloud (opsional)

Gunakan satu Google Cloud project untuk OAuth, Drive API, dan Google Picker API.

1. Aktifkan Google Drive API dan Google Picker API.
2. Atur OAuth consent screen. Untuk prototype, tambahkan akun organisasi sebagai test user. Gunakan scope `https://www.googleapis.com/auth/drive.file`.
3. Buat OAuth client bertipe Web application. Authorized JavaScript origin harus sama dengan origin portal. Authorized redirect URI harus persis `https://<domain-portal>/auth/google-drive/callback`. Untuk lokal gunakan `http://localhost:3000/auth/google-drive/callback`, atau origin lokal aktual.
4. Buat API key untuk Picker. Batasi HTTP referrer ke domain portal **dan** `https://docs.google.com/*` sesuai petunjuk Google Picker. Batasi API ke Google Picker API; tambahkan Drive API bila konfigurasi Google memerlukannya. Key Picker bukan secret; browser admin menerimanya saat pemilihan folder.
5. Isi environment server dari `.env.example`: `PORTAL_SITE_URL`, `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_TOKEN_KEY`, `GOOGLE_PICKER_API_KEY`, dan `GOOGLE_CLOUD_PROJECT_NUMBER`. Project number adalah angka project, bukan project ID.
6. Buat `GOOGLE_DRIVE_TOKEN_KEY` dengan `openssl rand -hex 32`. Simpan sebagai secret server dan pertahankan nilainya lintas restart/deploy. Jangan menaruh secret dalam Git, browser, atau variabel `NEXT_PUBLIC_*`.
7. Login sebagai admin, buka Administrasi, klik **Hubungkan Google Drive**, berikan izin akun Google organisasi, lalu klik **Pilih folder Drive**. Pilih folder existing yang dapat ditulisi akun tersebut. Link folder saja tidak cukup untuk memberikan izin OAuth.

Refresh token dienkripsi AES-256-GCM sebelum disimpan. Tabel koneksi/counter/export tidak memiliki direct grant untuk anon/authenticated. RPC koneksi hanya mengembalikan ciphertext kepada inti/admin; hanya server dengan encryption key dapat membuka token. Browser admin menerima access token singkat untuk Picker, bukan refresh token.

Google OAuth external dalam status Testing dapat menerbitkan refresh token yang kedaluwarsa setelah tujuh hari. Jika izin dicabut atau kedaluwarsa, admin perlu menghubungkan ulang. Reconnect menghapus pilihan folder agar folder akun lama tidak dipakai tanpa konfirmasi.

Referensi: [scope Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server), [Google Picker](https://developers.google.com/workspace/drive/picker/guides/web-picker), [retry dengan ID file tetap](https://developers.google.com/workspace/drive/api/guides/create-file).

## Kegagalan dan pemulihan

- Unduhan PDF gagal: periksa sesi dan koneksi, lalu ulangi **Unduh PDF**. Data surat tetap tersimpan; tidak perlu mengajukan ulang.
- Salinan Drive gagal: klik **Simpan salinan ke Google Drive** sebagai inti/admin setelah memperbaiki konfigurasi. Unduhan langsung dari portal tetap tersedia tanpa Google.
- Proses berhenti saat `uploading`: tunggu dua menit lalu coba lagi. Claim baru menggantikan claim lama; respons lama tidak boleh menimpa hasil retry.
- Respons upload hilang setelah file tersimpan: retry menggunakan ID Drive yang sama. HTTP 409 diverifikasi terhadap ID surat dan MIME PDF sebelum hasil dinyatakan tersedia.
- Storage penuh, folder dihapus, atau izin berubah: perbaiki akses/kuota, pilih folder lagi bila perlu, lalu retry.
- Encryption key hilang/berubah: koneksi lama tidak dapat didekripsi. Pulihkan key yang sama atau hubungkan ulang akun dan pilih ulang folder. File yang sudah dibuat tidak dihapus.
- Tidak ada pembuatan QR verifikasi, sertifikasi elektronik, editor isi per jenis, atau penomoran ulang surat historis.

## Rollback tanpa kehilangan data

Hentikan pengajuan/approval surat sebelum rollback aplikasi. Pertahankan kedua migration serta data rincian kegiatan/nomor/approval/file yang sudah tersimpan. Kolom baru tetap nullable; aplikasi lama bisa membaca, tetapi payload pengajuan lama tidak kompatibel dengan RPC terbaru. Jangan mengembalikan grant INSERT atau hak approval kabid sebagai jalan pintas agar versi lama bekerja. Jalankan versi lama dengan fitur tulis surat dinonaktifkan sampai versi yang kompatibel dipulihkan. Modul lain dan pembacaan surat dapat tetap berjalan.

Tidak ada down migration destruktif otomatis. Pemulihan penuh schema lama membutuhkan backup serta rekonsiliasi nomor dan surat yang terbit sejak perubahan; jangan menghapus tabel counter atau mengulang urutan pada tahun yang sama.

## Verifikasi lokal

Unit test memeriksa matriks role, input, enkripsi, PDF beberapa halaman, validasi folder, serta kegagalan dan retry upload memakai HTTP mock. Test PostgreSQL sementara memeriksa SQL asli, concurrency, pergantian tahun WIB, rollback, grant, dan lease export. E2E memakai fixture Supabase lokal untuk form, auto-approval, batas role, dan penanganan OAuth gagal.

Test lokal tidak membuktikan akun Google, callback deploy, file Drive, atau kebijakan Supabase live. Catat hasil uji operator setelah konfigurasi dan migration diterapkan.

Verifikasi template 19 November 2026: 61 unit/database test, 10 E2E desktop/mobile, lint, typecheck, format check, dan production build lulus. Test memeriksa pembuka tetap, paragraf pemohon, tanggal valid, kewajiban jadwal per jenis, preservasi surat lama, retry/concurrency, serta penolakan akses gambar/PDF sebelum ACC dan tanpa sesi pengurus. Contoh PDF A4 dan preview desktop diperiksa visual. Test isi PDF memakai `pdftotext` dari paket Poppler. SQL hanya dijalankan pada PostgreSQL sementara, bukan Supabase live. Login Google, pemilihan folder Google Picker, dan upload ke Drive nyata belum diuji.
