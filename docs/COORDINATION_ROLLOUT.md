# Rollout koordinasi panitia dan konten

## Status dan ruang lingkup

Perubahan ini disiapkan untuk dijalankan lokal/staging terlebih dahulu. Pembuatan file SQL tidak berarti SQL tersebut sudah diterapkan pada Supabase live. Konfirmasi pemilik mengenai database live berlaku untuk SQL yang sudah ada sebelum perubahan ini, termasuk `202611060001_portal_hardening.sql`.

Fitur baru meliputi master bidang/divisi, FR-REQ-001 panitia, jadwal dan pembatalan pengumuman, kalender WIB, deadline tiket terstruktur, katalog media dinamis, serta timestamp. Penugasan panitia tidak menulis ke daftar hadir dan tidak memakai tiket informasi.

## Aturan akun dan akses

- Satu profil memiliki paling banyak satu divisi. Divisi harus sesuai bidangnya. Inti/kabid boleh tidak memiliki divisi.
- Maksimal satu Kadiv pada setiap divisi. Kadiv aktif berarti profil saat ini berlevel `kadiv` dan ditempatkan pada divisi tersebut; tidak ada simulasi role di aplikasi.
- Migration memetakan email akun seed yang dikenal dengan level yang sesuai. Akun lain tetap tanpa penempatan dan harus diperiksa administrator. Jabatan berbentuk teks tidak memberikan kewenangan.
- Pemohon hanya Kadiv dengan divisi. Target harus divisi bidang lain dan memiliki Kadiv.
- Hanya Kadiv tujuan saat ini yang boleh mengambil keputusan dan menentukan staff divisinya. Inti/kabid membaca seluruh request, tanpa tombol maupun izin memprosesnya.
- Staff hanya melihat request tempat ia ditugaskan dan assignment miliknya. Staff tidak mendapat assignment anggota lain atau riwayat request, termasuk setelah pemohon diturunkan menjadi staff.
- Pengumuman dan media dikelola inti atau pengurus Bidang Branding, termasuk staff Branding. Kabid bidang lain tidak memperoleh izin pengelolaan konten. Izin surat dan keuangan mengikuti aturan existing.
- Perubahan profil/role/penempatan tetap lewat administrator tepercaya. Tidak ada layar promosi akun atau RPC admin yang dibuka ke browser.

## Siklus panitia

`pending` menjadi `approved` atau `rejected`. Sesudah disetujui, jumlah assignment menentukan `approved` (0), `partially_assigned` (kurang dari kebutuhan), atau `assigned` (sesuai kebutuhan).

Keputusan dan perubahan assignment memakai transaksi database, row lock, serta nomor versi. Request yang berubah oleh pengguna lain harus dimuat ulang sebelum diproses kembali. ID request tetap selama form pengajuan dibuka sehingga pengiriman ulang payload yang sama tidak membuat request atau audit ganda.

Assignment boleh bertahap, ditambah, diganti, atau dilepas sebelum waktu mulai. Anggota yang pindah divisi/peran tetap ditampilkan untuk dilepas, tetapi tidak boleh dipilih ulang sampai memenuhi syarat. Jumlah tidak boleh melebihi kebutuhan; duplikasi dan anggota dari divisi lain ditolak. Alasan wajib untuk penolakan dan perubahan assignment. Status, aktor, waktu, alasan, anggota ditambah/dilepas dicatat dalam history yang tidak bisa ditulis atau dihapus langsung oleh akun portal.

Deadline respons harus sebelum waktu mulai. Lewat deadline ditandai terlambat dan masih bisa diproses hingga waktu mulai. Setelah waktu mulai, keputusan dan perubahan assignment ditolak database. Tidak diperlukan cron atau scheduler.

## Jadwal, konfirmasi, dan media

- Semua input jadwal menggunakan WIB (`Asia/Jakarta`, UTC+07:00), lalu disimpan sebagai `timestamptz`.
- Kegiatan mengisi deadline konfirmasi, mulai, dan selesai secara lengkap. Pengumuman umum boleh tanpa ketiganya.
- Konfirmasi sesudah deadline sampai sebelum kegiatan dimulai tetap diterima dan diberi `is_late`. Kegiatan dibatalkan atau sudah mulai menolak konfirmasi baru, termasuk melalui akses database langsung. Konfirmasi terdahulu tetap tersimpan.
- Pembatalan menyimpan waktu dan alasan, tanpa hard delete. Perubahan pengumuman/media tercatat beserta snapshot sebelum/sesudah.
- Kalender menampilkan kegiatan, deadline konfirmasi, request panitia sesuai akses akun, serta `deadline_at` tiket. Deadline tiket lama berupa teks tidak ditebak; pemohon atau inti/kabid dapat menetapkan tanggal lewat “Atur deadline kalender”.
- Dua belas aset katalog lama disalin utuh. URL yang belum ada tetap kosong. Tanggal penambahan aset lama tetap NULL, bukan tanggal upload buatan. Logo lokal lama tetap bisa dibuka. Palet, identitas PRIMERA, dan empat template sekretariat tetap tersedia.
- File media baru atau penggantian URL harus berupa link file Google Drive. Upload dan izin berbagi tetap dilakukan di Drive. Tidak ada Storage bucket atau kredensial Drive baru.
- Arsip menyembunyikan media dari pembaca umum; pengelola dapat melihat arsip dan memulihkannya. Waktu penambahan katalog berbeda dengan waktu upload file di Drive.

## Urutan penerapan

1. Backup database dan aplikasi yang sedang berjalan. Gunakan backup Supabase atau dump administrator; jangan menyimpan dump/kredensial dalam Git.
2. Siapkan staging terisolasi dari database live. Bandingkan skema/policy dengan baseline dan hardening repository. Jangan menjalankan ulang `supabase_setup.sql` pada database existing.
3. Terapkan `supabase/migrations/202611070001_coordination.sql`, kemudian `supabase/migrations/202611070002_media_catalog.sql` pada staging. Masing-masing memakai transaksi. Migration pertama dijalankan sekali melalui migration runner/SQL editor; migration katalog aman diulang karena `legacy_key` unik.
4. Periksa penempatan akun dan Kadiv melalui query di bawah. Akun yang belum dipetakan tidak boleh diberi divisi berdasarkan tebakan nama jabatan.
5. Uji login dengan inti, kabid non-Branding, Kadiv pemohon, Kadiv tujuan, staff tujuan, dan staff lain. Coba juga payload langsung yang melanggar aturan. Jalankan test repository.
6. Terapkan dua migration pada live hanya melalui tindakan administrator yang disetujui, lalu rollout versi aplikasi ini. Build/install/start aplikasi tidak menjalankan SQL.
7. Verifikasi Realtime untuk tabel baru dan jalankan smoke test di bawah. Setelah itu pantau error mutasi/schema.

```sql
-- Akun Kadiv/staff yang memerlukan pemetaan administrator.
SELECT id, email, nama_lengkap, level, bidang_id, divisi_id
FROM public.profiles
WHERE level IN ('kadiv', 'staff') AND divisi_id IS NULL
ORDER BY email;

-- Penanggung jawab dan jumlah anggota setiap divisi.
SELECT d.id, d.nama, d.bidang_id,
       max(p.nama_lengkap) FILTER (WHERE p.level = 'kadiv') AS kadiv,
       count(*) FILTER (WHERE p.level = 'staff') AS jumlah_staff
FROM public.divisi d
LEFT JOIN public.profiles p ON p.divisi_id = d.id
GROUP BY d.id, d.nama, d.bidang_id
ORDER BY d.bidang_id, d.nama;

SELECT legacy_key, judul, url, created_at
FROM public.media_resources ORDER BY legacy_key;
```

Untuk koreksi penempatan, administrator memakai SQL tepercaya dalam transaksi dan menyebut ID akun secara eksplisit. Lepas Kadiv lama sebelum menetapkan Kadiv baru; unique index menolak dua Kadiv pada divisi yang sama. Jangan menggunakan service-role key di browser. Tidak ada perubahan penempatan live otomatis selain pemetaan email yang dinyatakan dalam migration ini.

## Smoke test dan batas verifikasi

1. Pemohon mengajukan request lintas bidang; target menyetujui, mengisi sebagian, lalu melengkapi panitia. Pemohon tidak bisa memilih anggota. Staff melihat assignment sendiri saja.
2. Target menolak request lain dengan alasan. Uji konflik versi, assignment ganda, anggota salah divisi, dan perubahan setelah mulai.
3. Staff Branding membuat/mengubah kegiatan, pengguna lain konfirmasi, lalu Branding membatalkan. Riwayat dan konfirmasi terdahulu tetap ada; konfirmasi baru ditutup.
4. Tambah media memakai Drive, ubah, arsipkan, dan pulihkan. Uji URL folder/host lain ditolak. Pastikan logo lama dan template tetap bisa dibuka.
5. Periksa kalender lintas bulan, waktu WIB, dan deadline tiket. Periksa mobile, keyboard, loading, dan kondisi gagal koneksi.

Test database membuat cluster PostgreSQL sementara dan menerapkan SQL repository di sana. E2E memakai fixture HTTP lokal, bukan Supabase live. Test lokal tidak membuktikan izin berbagi file Drive atau bahwa skema live telah diperbarui.

## Rollback tanpa kehilangan data

Jika rollout aplikasi bermasalah, kembalikan artefak aplikasi ke versi sebelumnya dan pertahankan tabel/kolom serta data baru. Jangan drop tabel, hapus history, atau menjalankan baseline ulang. Pembatasan konten tetap berlaku: versi lama mungkin masih menampilkan tombol broadcast kabid non-Branding, tetapi database menolak aksinya. Versi lama tetap dapat membuat pengumuman umum untuk inti/kabid Branding yang diizinkan.

Jika migration pertama gagal, transaksi membatalkan seluruh langkah migration tersebut. Jika migration katalog gagal setelah migration pertama sukses, perbaiki masalah lalu ulang migration katalog; portal utama tetap tersedia dan katalog menampilkan keadaan kosong/error sesuai hasil query. Jangan mengklaim rollout selesai sebelum kedua migration dan pemeriksaan akun lolos.

## Handoff implementasi lokal

Implementasi frontend, Server Actions, kontrak data, dua migration, serta dokumentasi tersedia di working tree. Tidak ada commit, push, deploy, seed akun, atau penerapan SQL ke layanan live dari pekerjaan ini.

Pemeriksaan lokal mencakup 31 test unit/database serta 10 skenario E2E pada desktop dan mobile (20 kombinasi). Pemeriksaan browser dilakukan melalui full run dan pengulangan terarah setelah perbaikan. Fokus verifikasi meliputi pemisahan panitia/absensi, otorisasi Kadiv tujuan, privasi assignment staff, konflik versi, transaksi bersamaan, rollback audit, tenggat, pembatalan, perpindahan divisi, media Drive, arsip/pemulihan, kalender, dan kegagalan loader fitur baru.

`npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build`, dan pemeriksaan whitespace diff juga lolos.

Tahap berikutnya adalah penerapan migration di staging, pemeriksaan penempatan akun, dan smoke test terhadap Supabase sesungguhnya. Akses file Drive serta Realtime live belum dibuktikan oleh fixture lokal. Penyiapan lokal tidak membutuhkan informasi tambahan dari pemilik.
