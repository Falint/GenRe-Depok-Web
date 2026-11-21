# Portal publik dan pengelolaan konten

## Alur

- `/` tetap menuju login untuk pengunjung tanpa sesi, atau dashboard bagi pengurus.
- Tombol **Masuk sebagai tamu** membuka `/publik` tanpa membuat akun atau sesi tamu.
- `/publik/profil`, `/publik/struktur`, dan `/publik/kontak` memakai konten organisasi existing. Jobdesc lama tidak dikirim ke halaman publik.
- `/publik/berita` dan `/publik/agenda` menampilkan konten published, 12 item per halaman. Detail memakai ID UUID. Draft dan ID yang tidak ditemukan tampil sebagai halaman tidak ditemukan, termasuk ketika pengelola membuka URL publik.
- Agenda dipisahkan berdasarkan waktu mulai: mendatang (mulai belum lewat) dan lampau. Input dan tampilan menggunakan WIB, database menyimpan TIMESTAMPTZ.
- `/konten-publik` hanya untuk inti dan bidang Branding. Berita/agenda memakai teks biasa tanpa HTML. Publikasi langsung berlaku; penarikan mengubah status ke draft. Publikasi ulang menggunakan waktu publikasi baru.
- Publik membaca perubahan saat membuka ulang halaman. Tidak ada subscription Realtime publik.

## Pendaftaran kegiatan dan lampiran surat

- Pengelola konten existing (inti, admin, dan pengurus Branding) dapat memilih **Buka pendaftaran kegiatan** pada editor agenda. Default agenda lama/baru tertutup. Form hanya tersedia pada agenda published yang pendaftarannya dibuka dan waktu mulai belum lewat. Penarikan publikasi, penutupan manual, atau waktu mulai kegiatan menutup pendaftaran; server/RPC memeriksa ulang walau form pengunjung masih terbuka.
- Pendaftaran gratis tanpa akun. Nama lengkap, instansi, dan unsur wajib teks bebas, maksimal 300 karakter per isian. Catatan penulisan memberi contoh kapitalisasi sesuai EYD dan singkatan resmi; aplikasi mempertahankan kapitalisasi pengguna dan merapikan spasi.
- Kombinasi nama, instansi, dan unsur yang sama pada kegiatan sama ditolak, tanpa membedakan kapitalisasi atau spasi berlebih. Orang berbeda dengan ketiga isian identik perlu menghubungi pengurus. Tidak ada verifikasi identitas, email/WA, kuota, pembayaran, CAPTCHA, atau check-in. Kode bukti bukan verifikasi identitas; risiko spam tetap ada.
- Bukti berisi kode acak, kegiatan, dan data yang didaftarkan. Peserta dapat menyalin atau mencetaknya. Bukti tidak dikirim lewat email dan tidak tersedia pencarian/pemulihan publik. Simpan bukti sebelum meninggalkan halaman.
- Request ID tetap selama form terbuka; retry dengan payload sama mengembalikan kode sebelumnya, termasuk jika kegiatan sudah ditutup. Retry berbeda payload ditolak. Bila koneksi terputus, pertahankan form/isian dan kirim ulang; reload dapat menghilangkan akses ke bukti yang belum sempat diterima.
- Pengelola membuka tombol **Peserta** pada agenda di Konten Publik. Inti, admin, seluruh kabid, dan pengurus Branding dapat membaca daftar peserta; pengurus lain dan guest tidak dapat membaca daftar. `anon` tidak memiliki SELECT atau direct write; `authenticated` hanya mendapat SELECT kolom pendataan melalui RLS, tanpa kolom kode bukti. Keduanya hanya bisa mendaftar melalui RPC tervalidasi.
- Surat baru dapat memilih agenda dan mencentang peserta, mencari peserta, atau memilih semua. Server mengambil data sumber berdasarkan ID dan membekukannya dalam transaksi pengajuan surat. Lampiran yang sudah masuk surat mengikuti izin baca surat existing. Tidak ada perubahan lampiran setelah pengajuan. Lihat [panduan surat](SURAT_ROLLOUT.md).

### Penerapan tambahan

1. Cadangkan target yang sudah dikonfirmasi. Pastikan migration sebelumnya hingga `202611130001_guest_accounts.sql`, `202611190001_surat_workflow.sql`, dan `202611190002_surat_template.sql` sudah diterapkan. Jangan menjalankan baseline ulang.
2. Hentikan sementara perubahan agenda dan pengajuan surat. Operator menerapkan `supabase/migrations/202611200001_event_registration_attachments.sql` satu kali melalui prosedur database existing, lalu deploy aplikasi yang sesuai. Agent tidak menerapkan SQL live atau melakukan deploy otomatis.
3. Migration menambah flag agenda, tabel/RLS/RPC pendaftaran, kolom snapshot surat, dan memperbarui kedua RPC pengelolaan agenda/pengajuan surat. Tidak mengubah nomor/status/riwayat surat atau membuka agenda otomatis. Payload lama tanpa field baru masih diterima. Daftar peserta memakai paging internal agar tidak berhenti pada batas default Supabase.
4. Uji satu agenda sebagai pengelola: buka pendaftaran, daftar dari browser tanpa sesi, simpan bukti, periksa penolakan duplikat, lalu tutup pendaftaran. Uji akses inti/admin/kabid/Branding serta penolakan guest/staff bidang lain.
5. Ajukan surat dengan sebagian peserta, periksa preview dan PDF sesudah ACC: `1 (satu) berkas`, tabel hitam-putih, dan peserta sesuai pilihan. Periksa surat lama tetap utuh. Salinan Drive memakai PDF sama, tetapi akses Drive nyata perlu pengujian operator tersendiri.

Rollback aplikasi tidak menghapus pendaftaran atau lampiran. Sebelum rollback, tutup semua pendaftaran dengan kode baru dan hentikan pengajuan surat. Pertahankan migration/data; versi lama tidak menampilkan snapshot lampiran, jadi nonaktifkan unduhan/export surat selama rollback agar tidak menghasilkan dokumen tanpa lampiran. Pulihkan versi kompatibel sebelum membuka fitur kembali.

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
