# Rencana dan catatan migrasi

## Baseline yang diperiksa

Aplikasi React 18/Vite 5 memiliki satu URL `/`, tanpa React Router, query router, parameter route, atau deep link. Enam tab dikendalikan `App.jsx`. Build awal berhasil, dengan bundle JavaScript 579,73 kB (gzip 150,30 kB). Tidak ada test, lint, atau TypeScript.

| Fitur lama              | Route baru                            | Sumber data / penulis                                                                       |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Login pada `/`          | `/login`, `/` mengalihkan sesuai sesi | Supabase Auth dan `profiles`                                                                |
| Dasbor                  | `/dashboard`                          | Ringkasan surat, reimburse, kas, pengumuman, tiket                                          |
| Profil organisasi       | `/profil`                             | Konten statis organisasi                                                                    |
| Struktur dan 32 jobdesc | `/struktur`                           | Konten statis resmi                                                                         |
| Administrasi            | `/administrasi`                       | `surat`, `surat_approval`, `reimburse`, `reimburse_approval`, `kas_mutasi`, `pagu_anggaran` |
| Komunikasi              | `/komunikasi`                         | `pengumuman`, `pengumuman_kehadiran`, `tiket_info`, roster profil                           |
| Media library           | `/media`                              | Katalog statis, PNG lokal, clipboard                                                        |

Pembaca: semua pengurus terautentikasi, dengan pembatasan RLS reimburse/kas. Penulis: semua pengurus untuk pengajuan dan konfirmasi sendiri; inti/kabid untuk surat dan siaran; inti untuk pencairan/kas. Identitas selalu berasal dari profil server, bukan payload browser.

## Urutan

1. Pertahankan markup, aset, konten resmi, dan bentuk tabel; pindahkan ke App Router dan TypeScript strict.
2. Pisahkan browser/server Supabase; validasi konfigurasi dan profil; verifikasi user pada setiap operasi server.
3. Pisahkan data, mutasi, izin, dan UI. Jadikan navigasi URL nyata; pisahkan bundle per halaman.
4. Validasi input mutasi; paginasi pembacaan agar batas default Supabase tidak memotong saldo/data.
5. Siapkan SQL hardening opsional untuk RLS dan approval atomik; jangan jalankan pada layanan live.
6. Uji izin, mapping, validasi, mutasi, SSR/login, lint, types, dan build. Catat batas verifikasi eksternal.

## Risiko audit

- `profiles_update_own` dapat mengubah `level` sendiri; trigger signup mempercayai `user_metadata.level`. Server Actions saja tidak menutup jalur REST langsung.
- INSERT surat/reimburse/tiket tidak mengikat identitas pemohon; pemohon surat dapat mengubah status langsung.
- Pencairan memakai tiga write terpisah tanpa transaksi atau idempotency; saldo bulan membandingkan bulan tanpa tahun.
- Auth REST manual memakai localStorage, mematikan auto refresh, dan memakai dua penyimpanan sesi terpisah.
- Semua query tanpa pagination; saldo dapat salah ketika jumlah mutasi melewati batas respons Supabase.
- Form punya data palsu yang tidak dipersist (tanggal, chain, foto struk), urgensi `Biasa` tidak sesuai CHECK SQL `Rendah`.
- Download modul/video, export, cetak, QR dan approval bertingkat masih simulasi. Jangan klaim tersedia bila backend/aset belum ada.
- Seed memakai password bersama yang tertulis di repo dan dicetak. Nilai lama tidak boleh dipakai untuk akun baru.
- Periode organisasi tidak konsisten: 2026/2027 dan 2026/2028. Konten resmi dipertahankan sampai pemilik mengonfirmasi.

## Kompatibilitas dan rollback

Nama tabel/kolom dan data existing dipertahankan. Cookie baru memerlukan login ulang; token localStorage lama tidak diimpor secara diam-diam. Konfigurasi baru memakai `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Tidak ada deploy atau perubahan database live. Rollback aplikasi memakai revisi Git sebelum migrasi serta konfigurasi Vite sebelumnya; SQL hardening lokal tidak berlaku sampai ditinjau dan diterapkan terpisah. Jangan melemahkan RLS saat rollback.
