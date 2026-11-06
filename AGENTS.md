# Instruksi Agent — Portal Forum GenRe Kota Depok

## Cara bekerja dengan pemilik proyek

- Gunakan bahasa Indonesia yang santai, langsung, dan akurat. Istilah teknis boleh tetap berbahasa Inggris.
- Untuk tugas kecil, langsung kerjakan. Untuk tugas sedang atau besar, jelaskan temuan dan rencana singkat sebelum mengubah kode.
- Utamakan solusi paling sederhana yang benar, perubahan kecil, dan perilaku yang sudah ada. Jelaskan trade-off penting tanpa nasihat generik.
- Sebelum mengedit, baca bagian kode dan dokumentasi yang relevan, periksa `git status`, lalu jaga semua perubahan pengguna. Jangan commit, push, reset, atau menghapus pekerjaan pengguna tanpa diminta.
- Setelah mengedit, tinjau diff dan laporkan file yang berubah, pemeriksaan yang benar-benar dijalankan, serta batasan atau risiko yang masih ada. Jangan mengklaim fitur bekerja hanya dari pembacaan kode.

## Peta proyek

- Portal kepengurusan Forum GenRe Kota Depok masa bakti 2026/2027. Stack saat ini: React 18, JavaScript/JSX, Vite 5, Tailwind CSS 3, Lucide React, dan Supabase. Ini bukan proyek Next.js atau TypeScript.
- `src/App.jsx` mengatur sesi aktif, tab, modal, state data, dan handler mutasi. `src/components/Tabs/` berisi halaman utama; `src/components/` lainnya berisi header, navigasi, login, dan modal.
- `src/lib/supabaseAuth.js` menangani login, refresh sesi, profil, dan logout. `src/lib/portalData.js` menangani query, pemetaan data, mutasi, dan subscription Supabase. Ikuti alur yang sudah ada saat menambah fitur data.
- `src/data/mockData.js` masih memuat helper izin serta konten statis seperti struktur/jobdesc dan media library. Nama file itu tidak berarti seluruh aplikasi memakai data mock; data operasional surat, reimburse, kas, pengumuman, dan tiket berasal dari Supabase.
- `supabase_setup.sql` mendefinisikan skema dan Row Level Security (RLS). `seed_users.sh` membuat akun pada proyek Supabase secara langsung. `public/` memuat aset logo. `tailwind.config.js` memuat warna `genre`; pertahankan identitas visual ini.
- `README.md` adalah gambaran produk, tetapi sebagian deskripsi fitur adalah target atau warisan prototipe. Cocokkan klaim dengan kode sebelum merancang perubahan: login sudah memakai profil nyata, sedangkan beberapa alur seperti penomoran surat berurutan, upload struk, QR verifikasi, dan approval bertingkat belum lengkap.

## Aturan implementasi

- Pertahankan autentikasi, alur persetujuan, dan integrasi Supabase. Perubahan hak akses harus ditinjau di UI **dan** kebijakan RLS; menyembunyikan tombol bukan mekanisme otorisasi.
- Gunakan `auth.profile` dan `profile.level` sebagai sumber peran pengguna. Jangan menghidupkan kembali simulasi role switch dari dokumentasi lama. Periksa kesesuaian level `inti`, `kabid`, `kadiv`, `staff` dengan helper izin dan RLS.
- Saat mengubah skema, query, atau payload, cek nama kolom dan policy pada `supabase_setup.sql` serta pemetaan di `portalData.js`. Jangan menaruh service role key atau kredensial admin di kode browser. `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` adalah konfigurasi klien; rahasia lain harus tetap di luar frontend.
- Mutasi approval dan keuangan saat ini dapat melibatkan beberapa operasi database. Jangan menganggap operasi itu atomik atau sukses seluruhnya tanpa memeriksa hasilnya. Hindari duplikasi pencairan dan mutasi kas saat menyentuh alur tersebut.
- Jaga format angka dan tanggal Indonesia, teks UI yang mudah dipahami pengurus, serta aksesibilitas dasar: label, fokus keyboard, state loading/error, dan layout mobile serta desktop.
- Ikuti pola JSX dan Tailwind yang ada. Pakai komponen atau helper yang sudah tersedia sebelum menambah abstraksi atau dependensi. Hindari refactor dan perubahan format di luar lingkup tugas.
- Jangan menjalankan `seed_users.sh`, menerapkan `supabase_setup.sql`, menyentuh data produksi, atau melakukan deploy sebagai efek samping tugas lokal. Tindakan ini mengubah layanan eksternal dan harus sesuai permintaan pengguna.

## Verifikasi

- Perintah yang tersedia: `npm run dev`, `npm run build`, dan `npm run preview`. Belum ada script `test`, `lint`, atau typecheck pada `package.json`; jangan melaporkan pemeriksaan itu berhasil jika belum tersedia atau dijalankan.
- Untuk perubahan kode, jalankan pemeriksaan yang relevan dan tinjau `git diff`. Untuk UI, periksa alur login serta tampilan mobile/desktop bila sarana tersedia. Untuk perubahan data atau izin, cek ulang RLS dan hasil untuk peran terkait; build saja tidak membuktikan integrasi Supabase berjalan.
- Jangan membaca atau menampilkan nilai rahasia dari `.env.local`. Gunakan `.env.example` untuk memahami konfigurasi. Biarkan file yang tidak terkait, termasuk file SQL lokal yang belum dilacak Git, tetap utuh.

## Skill dan alat khusus

- Jika tersedia dan relevan, gunakan skill `frontend-design` untuk pekerjaan desain UI atau redesign; pertahankan identitas GenRe dan alur bisnis yang ada.
- Gunakan `imagegen` hanya ketika tugas membutuhkan aset raster baru atau pengeditan gambar. Untuk diagram arsitektur atau alur yang diminta, gunakan `archify` jika tersedia.
- Skill dan plugin lain dipakai hanya saat tugasnya cocok. Penggunaan skill tidak memberi izin untuk publish, deploy, atau mengubah layanan eksternal di luar permintaan pengguna.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
