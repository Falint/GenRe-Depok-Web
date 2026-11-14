# Aktivasi Gmail dan role akun

Implementasi memakai email/password Supabase, bukan Google OAuth. Password portal terpisah dari password Gmail. Pendaftaran baru hanya menerima `@gmail.com`; kepemilikan dibuktikan melalui email konfirmasi. Akun baru selalu guest, bukan staff.

## Persiapan

1. Backup database dan tinjau daftar UUID akun buatan lama. Simpan daftar tersebut secara privat, bukan di Git.
2. Nonaktifkan pendaftaran publik selama rollout. Hentikan write sementara saat transisi role agar pekerjaan pending dapat ditinjau.
3. Terapkan seluruh migration pendahulu yang belum diterapkan, lalu `202611130001_guest_accounts.sql`. Jangan menjalankan ulang baseline atau migration historis yang sudah diterapkan. Riwayat migration kosong bukan bukti schema belum tersedia.
4. Atur `PORTAL_SITE_URL` pada server aplikasi ke origin kanonis, misalnya `https://portal.example.org`. Tidak boleh berisi path, query, atau kredensial. HTTP hanya untuk localhost/127.0.0.1. Atur juga Site URL dan redirect allowlist Supabase untuk development dan deploy yang benar. Jangan memakai wildcard domain produksi.
5. Aktifkan provider email, **Confirm Email**, dan password minimum 12 karakter di Supabase. Google OAuth tidak diperlukan.
6. Konfigurasikan custom SMTP, sender terverifikasi, dan rate limit email yang sesuai. SMTP bawaan Supabase bukan layanan pengiriman untuk pendaftaran umum. Kredensial SMTP hanya di Supabase, bukan pada bundle atau `NEXT_PUBLIC_*`.
7. Template **Confirm signup**:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Verifikasi Gmail</a>
   ```

   Template **Reset password**:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
     >Buat kata sandi baru</a
   >
   ```

   Kedua template menggunakan Site URL kanonis. Gunakan proyek uji terpisah atau ubah konfigurasi secara terkontrol saat pengujian localhost. Endpoint hanya menerima dua jenis token tersebut dan tidak mengikuti redirect dari pengguna.

## Aktivasi

1. Rilis aplikasi setelah migration tersedia. Jangan membuka signup sebelum pemeriksaan izin selesai.
2. Pemilik membuat akun Gmail melalui `/daftar` pada jendela uji terkontrol, membuka email verifikasi, lalu memastikan UUID akun di Supabase. Tutup signup kembali selama cutover.
3. Tinjau `supabase/admin/bootstrap_portal_admin.sql`. Ganti `target uuid := NULL` dengan UUID guest terverifikasi milik pemilik. Pemilik menjalankan skrip melalui SQL Editor. Tidak ada admin otomatis berdasarkan email pertama atau metadata. Akun admin punya seluruh hak bisnis dan hak pengelolaan akun.
4. Tinjau `supabase/admin/legacy_guest_cutover.sql`. Isi tabel sementara dengan UUID akun buatan yang disetujui. Jalankan seluruh transaksi sekaligus. Skrip menolak daftar kosong, admin, akun yang hilang, dan akun di luar domain lama. Snapshot lengkap disimpan dalam tabel owner-only; riwayat role juga dicatat. Jangan jalankan ulang skrip terhadap akun yang sama.
5. Pastikan akun lama guest, bidang/divisinya kosong, riwayat transaksi utuh, dan akses internal ditolak memakai sesi lama.
6. Buka signup. Pengurus daftar ulang menggunakan Gmail sendiri. Admin mencari akun di `/kelola-akun`, memeriksa identitas orang di luar portal, lalu mengisi role, jabatan, bidang, dan divisi.

## Perilaku dan batas

- Aplikasi memeriksa `portal_signup_ready` sebelum membuat akun. Jika migration belum tersedia, registrasi ditolak. Tetap tutup signup di Supabase selama rollout karena Auth API dapat dipanggil langsung.
- Guest hanya dapat membaca konten published dan profil akunnya sendiri. Akses tanpa akun ke `/publik` tetap tersedia.
- Role `admin` dikelola pemilik melalui SQL; panel tidak mengubah admin. Pengurus inti bukan admin akun.
- Perubahan role menggunakan row lock, versi akses, dan audit atomik. Kadiv ganda ditolak. Jika versi berubah, muat ulang daftar dan buka ulang form.
- Hak akses dicek ulang melalui profil database setiap request; sesi tidak perlu diganti. Guest dapat memakai tombol Periksa akses pengurus setelah diangkat; muat ulang untuk memperbarui tampilan. Informasi yang sudah sempat dilihat sebelum downgrade tidak dapat ditarik kembali dari ingatan atau screenshot pengguna.
- Konten publik dan struktur organisasi statis tidak disinkronkan otomatis dari perubahan role akun.
- Riwayat akun buatan tetap menggunakan UUID lama. Klaim pending dan pekerjaan panitia akun lama perlu ditinjau admin; tidak dipindahkan atau dicairkan otomatis.
- `seed_users.sh` dinonaktifkan. Jangan menghapus akun lama karena riwayat masih merujuk profilnya.

## Verifikasi rollout

Uji Gmail baru, email verifikasi nyata, resend, recovery, reset dan login ulang. Uji guest melalui route dan API langsung, published/draft, seluruh role pengurus, admin keuangan/approval/panitia, serta upgrade/downgrade pada sesi aktif. Uji mobile dan desktop. Test fixture lokal tidak membuktikan pengiriman SMTP atau perilaku Supabase live.

Jika ada masalah, tutup signup dan batasi akses sementara. Pertahankan RLS pembatas guest. Jangan mengembalikan aplikasi lama yang tidak memahami role guest/admin. Perbaiki aplikasi atau gunakan versi kompatibel; snapshot hanya untuk pemulihan role oleh pemilik setelah audit, bukan untuk menghidupkan kembali semua akun buatan.
