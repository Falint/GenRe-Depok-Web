# Portal publik dan pengelolaan konten

## Alur

- `/` tetap menuju login untuk pengunjung tanpa sesi, atau dashboard bagi pengurus.
- Tombol **Masuk sebagai tamu** membuka `/publik` tanpa membuat akun atau sesi tamu.
- `/publik/profil`, `/publik/struktur`, dan `/publik/kontak` memakai konten organisasi existing. Jobdesc lama tidak dikirim ke halaman publik.
- `/publik/berita` dan `/publik/agenda` menampilkan konten published, 12 item per halaman. Detail memakai ID UUID. Draft dan ID yang tidak ditemukan tampil sebagai halaman tidak ditemukan, termasuk ketika pengelola membuka URL publik.
- Agenda dipisahkan berdasarkan waktu mulai: mendatang (mulai belum lewat) dan lampau. Input dan tampilan menggunakan WIB, database menyimpan TIMESTAMPTZ.
- `/konten-publik` hanya untuk inti dan bidang Branding. Berita/agenda memakai teks biasa tanpa HTML. Publikasi langsung berlaku; penarikan mengubah status ke draft. Publikasi ulang menggunakan waktu publikasi baru.
- Publik membaca perubahan saat membuka ulang halaman. Tidak ada subscription Realtime publik.

## Penerapan database

Migration disiapkan di repository, tidak diterapkan otomatis oleh aplikasi atau agent.

1. Pastikan target database dan backup sesuai prosedur proyek. Migration memerlukan schema existing, `profiles`, serta `can_manage_content()` dari migration koordinasi. Urutan repository: migration koordinasi/media dan finance terlebih dahulu.
2. Jalankan `supabase/migrations/202611100001_public_content.sql` **satu kali** melalui prosedur deployment database. File ini memakai transaksi, membuat tabel kosong, index, RLS, grant SELECT, dan RPC penyimpanan. Jangan menjalankan ulang baseline atau migration ini pada objek yang sudah ada.
3. Deploy kode aplikasi setelah migration berhasil. Halaman berita/agenda dan editor menampilkan error bila tabel belum tersedia; profil, struktur, kontak, dan beranda publik tetap tidak membutuhkan tabel baru.
4. Uji dengan akun inti, anggota Branding, dan pengurus bidang lain. Buat draft uji, pastikan tamu tidak melihatnya, terbitkan, buka detail dari browser tanpa sesi, lalu tarik publikasi dan pastikan konten hilang.
5. Pastikan tamu tetap diarahkan ke login saat membuka dashboard, administrasi, dan editor konten publik. Periksa login pengurus dan fitur internal existing.

`anon` dan `authenticated` hanya mendapat SELECT pada tabel baru. RLS membatasi publik ke published; pengelola dapat membaca draft. RPC `save_portal_public_content(target_id, expected_version, input)` memverifikasi profil dan izin lagi serta memvalidasi input. Versi `-1` membuat konten, versi nonnegatif mengedit dengan row lock. Edit bersamaan atau pengulangan request yang telah tersimpan ditolak agar tidak menimpa konten. UI meminta pengguna memuat ulang setelah konflik; isian tetap tersedia selama dialog terbuka.

Jika respons penyimpanan terputus, tutup form dan muat ulang daftar sebelum membuat konten baru. ID stabil selama form terbuka mencegah pembuatan ganda dari pengiriman ulang form yang sama; tidak ada pemulihan draft lokal lintas reload.

## Rollback dan batas bukti

Untuk menarik fitur, rollback kode aplikasi. Biarkan tabel dan RPC baru tetap ada untuk menjaga konten yang sudah ditulis. Penarikan satu berita/agenda dilakukan lewat **Tarik publikasi**, bukan menghapus tabel. Jangan menghapus data sebagai efek samping rollback.

Test PostgreSQL memakai cluster sementara, sedangkan E2E memakai fixture protokol lokal. Keduanya tidak membuktikan penerapan migration atau perilaku Supabase live. Tidak ada perubahan layanan eksternal maupun deployment otomatis pada pekerjaan ini.
