# Instruksi Agent — Portal Forum GenRe Kota Depok

## Cara bekerja dengan pemilik proyek

- Gunakan bahasa Indonesia yang santai, langsung, dan akurat. Istilah teknis boleh tetap berbahasa Inggris.
- Untuk tugas kecil, langsung kerjakan. Untuk tugas sedang atau besar, jelaskan temuan dan rencana singkat sebelum mengubah kode.
- Utamakan solusi paling sederhana yang benar, perubahan kecil, dan perilaku yang sudah ada. Jelaskan trade-off penting tanpa nasihat generik.
- Sebelum mengedit, baca bagian kode dan dokumentasi yang relevan, periksa `git status`, lalu jaga semua perubahan pengguna. Jangan commit, push, reset, atau menghapus pekerjaan pengguna tanpa diminta.
- Setelah mengedit, tinjau diff dan laporkan file yang berubah, pemeriksaan yang benar-benar dijalankan, serta batasan atau risiko yang masih ada. Jangan mengklaim fitur bekerja hanya dari pembacaan kode.

## Peta proyek

- Portal kepengurusan Forum GenRe Kota Depok, Kabinet PRIMERA periode 2026–2028. Stack saat ini: Next.js 16.4.5 App Router, React 19, TypeScript strict, Tailwind CSS 3, Lucide React, Supabase SSR, dan Zod. Gunakan Node.js 22 atau lebih baru serta `package-lock.json`.
- `src/app/` memuat halaman/layout server, login, loading/error, dan route portal. `src/components/` memuat header, navigasi, dialog, dan form modal. `src/features/` memisahkan administrasi, komunikasi, panitia, media, organisasi, autentikasi, dan data portal.
- `src/proxy.ts` memverifikasi user dan memperbarui cookie sesi. `src/features/auth/server.ts` menyediakan `getProfile`/`requireProfile` melalui `auth.getUser()` dan profil nyata. `src/features/auth/actions.ts` menangani login/logout; `permissions.ts` pada direktori yang sama memuat helper izin.
- `src/features/portal/data.ts` membaca data server secara bertahap; `schema.ts`, `mapping.ts`, dan `validation.ts` pada direktori yang sama memuat kontrak Zod, pemetaan, serta validasi input. `PortalProvider.tsx` mengelola context UI, modal, mutasi, dan Realtime. `useFeatureData.ts` melayani loader/subscription fitur. Mutasi berada pada Server Actions masing-masing fitur; ikuti alur existing.
- `src/lib/supabase/` memuat client browser/server, konfigurasi, dan `database.types.ts`. Kontrak TypeScript diturunkan dari SQL repo, bukan generated dari database live. Data operasional berasal dari Supabase; konten profil/jobdesc statis berada di `src/features/organisasi/`. Media memakai katalog Supabase dengan konten statis pendukung pada `src/features/media/`.
- `supabase_setup.sql` memuat baseline schema/RLS, sedangkan `supabase/migrations/` memuat hardening dan perubahan lanjutan. Jangan menjalankan baseline ulang pada database existing. `seed_users.sh` adalah alat admin manual. `public/` memuat aset logo; `tailwind.config.js` memuat warna `genre`. Pertahankan identitas GenRe dan PRIMERA.
- Gunakan `README.md` untuk kemampuan dan batas fitur, lalu cocokkan dengan kode. Bukti reimburse melalui link file Google Drive sudah tersedia; upload langsung, nomor surat resmi berurutan, QR verifikasi, dan approval bertingkat belum tersedia.

## Aturan implementasi

- Pertahankan autentikasi, alur persetujuan, dan integrasi Supabase. Perubahan hak akses harus ditinjau di UI **dan** kebijakan RLS; menyembunyikan tombol bukan mekanisme otorisasi.
- Gunakan profil tervalidasi dari `getProfile`/`requireProfile`, terutama `profile.level`, `bidang_id`, dan `divisi_id`, sebagai sumber izin. Jangan menghidupkan simulasi role switch atau menebak kewenangan dari jabatan/target teks bebas. Selaraskan level `inti`, `kabid`, `kadiv`, `staff` dengan helper izin dan RLS. Setiap Server Action harus memverifikasi ulang user, izin, dan input.
- Saat mengubah schema, query, atau payload, cocokkan baseline, migration, kontrak Zod/TypeScript, dan pemetaan data fitur. Gunakan client server dengan cookie user agar RLS tetap berlaku. Jangan menaruh service role key atau kredensial admin di browser. Konfigurasi public hanya `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`; variabel `VITE_*` tidak dipakai. Lihat `.env.example` tanpa membaca rahasia `.env.local`.
- Approval surat menggunakan RPC `approve_portal_surat`; pencairan menggunakan `disburse_portal_reimburse`. Keduanya menyimpan perubahan terkait dalam satu transaksi. Pencairan memakai row lock dan relasi ledger unik; jangan menggantinya dengan beberapa write terpisah. Kode lokal memakai `create_portal_reimburse`/`create_portal_mutasi` dengan ID tetap selama form terbuka untuk retry idempotent; memerlukan migration finance 20261108. Klaim historis cair tanpa ledger perlu rekonsiliasi, bukan pencairan ulang otomatis.
- Jaga format angka dan tanggal Indonesia, teks UI yang mudah dipahami pengurus, serta aksesibilitas dasar: label, fokus keyboard, state loading/error, dan layout mobile serta desktop.
- Ikuti pola TSX dan Tailwind yang ada. Pakai komponen atau helper yang sudah tersedia sebelum menambah abstraksi atau dependensi. Hindari refactor dan perubahan format di luar lingkup tugas.
- Jangan menjalankan `seed_users.sh`, menerapkan `supabase_setup.sql`, menyentuh data produksi, atau melakukan deploy sebagai efek samping tugas lokal. Tindakan ini mengubah layanan eksternal dan harus sesuai permintaan pengguna.

## Verifikasi

- Perintah tersedia: `npm run dev`, `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, dan `npm run format:check`. `npm run format` menulis ulang file; gunakan hanya sesuai lingkup. Dev/build memakai Webpack. Tidak ada script `preview`.
- `src/tests/` memuat unit test, test transaksi/RLS pada PostgreSQL sementara, serta Playwright dengan fixture Supabase lokal. Test database memerlukan `initdb`, `pg_ctl`, dan `psql`; E2E memerlukan browser Playwright. Keduanya tidak memverifikasi Supabase live. Jangan melaporkan hasil audit terdahulu sebagai test ulang sesi sekarang.
- Untuk perubahan kode, jalankan pemeriksaan yang relevan dan tinjau `git diff`. Untuk UI, periksa alur login serta tampilan mobile/desktop bila sarana tersedia. Untuk perubahan data atau izin, cek ulang RLS dan hasil untuk peran terkait; build saja tidak membuktikan integrasi Supabase berjalan.
- Jangan membaca atau menampilkan nilai rahasia dari `.env.local`. Gunakan `.env.example` untuk memahami konfigurasi. Biarkan file yang tidak terkait, termasuk file SQL lokal yang belum dilacak Git, tetap utuh.

## Snapshot verifikasi database live — 8 November 2026

- MCP Supabase berhasil mengakses proyek `kwwbqcamoyjhgzaidtbf` melalui pemeriksaan read-only. Klasifikasi development/staging/production dan kesamaan proyek dengan konfigurasi aplikasi/deploy belum dibuktikan. Jangan membaca `.env.local` untuk mencocokkannya.
- Introspeksi memeriksa tabel/kolom, RLS/policy, effective grant, definisi fungsi, constraint/index, trigger, publikasi Realtime, serta agregat penempatan akun tanpa mengambil identitas pribadi. Ada 17 tabel public dengan RLS aktif. Body 19 fungsi cocok dengan SQL repo setelah normalisasi komentar/whitespace; fungsi memakai `search_path` kosong dan tidak dapat dieksekusi oleh `anon`.
- Objek hardening, koordinasi, dan katalog media sudah tersedia: termasuk kedua RPC transaksi, foreign key bidang/divisi, index unik ledger reimburse dan Kadiv per divisi, serta trigger audit/deadline. Ada 12 entri media dengan `legacy_key`. Hasil ini memperbarui ketidakpastian objek live dalam README/handoff lama, tetapi tidak membuktikan seluruh isi katalog atau perilaku runtime.
- `list_migrations` mengembalikan daftar kosong. Jangan menyebut versi migration tercatat atau menyimpulkan SQL belum diterapkan hanya dari riwayat kosong. Jangan menerapkan ulang migration untuk mengisi riwayat sebagai efek samping verifikasi.
- Profil berjumlah 5 inti, 3 kabid, 9 Kadiv, dan 9 staff. Setiap divisi memiliki satu Kadiv dan satu staff; tidak ada penempatan bidang/divisi tidak valid atau Kadiv ganda. Seluruh Kadiv/staff memiliki bidang/divisi. Inti tidak memiliki penempatan; kabid memiliki bidang tanpa divisi, sesuai model existing.
- `anon` dan `authenticated` tidak memiliki izin INSERT/UPDATE/DELETE profil, termasuk UPDATE per kolom; policy `profiles_update_own` tidak ada. UPDATE langsung surat/reimburse dan write langsung history approval dicabut. UPDATE tiket bagi `authenticated` hanya pada kolom `status`/`respons`, dengan RLS pemohon atau pimpinan. Temuan ini memperbarui catatan lama tentang perubahan role sendiri, bukan sertifikasi seluruh keamanan.
- Publikasi `supabase_realtime` mencakup 16 tabel sesuai SQL repo. `pagu_anggaran` tidak termasuk publikasi, meskipun provider melakukan subscription tabel tersebut; perubahan pagu tidak terbukti memicu refresh otomatis. Pengiriman event live dan race refresh belum diuji.
- **Grant berlebih perlu ditinjau:** `anon` dan `authenticated` masih memiliki `TRUNCATE` pada 8 tabel: `profiles`, `surat`, `surat_approval`, `reimburse`, `reimburse_approval`, `kas_mutasi`, `pagu_anggaran`, dan `tiket_info`. RLS bukan pengganti pembatasan grant ini. Introspeksi tidak membuktikan bahwa operasi tersebut dapat dipanggil melalui API portal. Jangan mencoba operasi destruktif untuk membuktikannya.
- Security Advisor melaporkan [leaked password protection nonaktif](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) dan [14 fungsi SECURITY DEFINER yang dapat dipanggil pengguna login](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Akses fungsi sesuai pola RPC/helper repo; warning saja tidak membuktikan bypass. Tinjau pemeriksaan izin di fungsi sebelum mengubah grant.
- Tidak ada write, penerapan SQL, seed, atau perubahan konfigurasi Supabase pada verifikasi ini. Login tiap peran, mutasi/rollback/concurrency live, Realtime end-to-end, dan akses Drive belum diuji. Hasil metadata tidak menutup temuan aplikasi tentang realisasi anggaran, tracking reimburse, retry, dan refresh pada `docs/AUDIT_HANDOFF_2026-11-08.md`.

## Perubahan finance lokal — 8 November 2026

- Target `kwwbqcamoyjhgzaidtbf` dikonfirmasi pemilik sebagai development/uji coba. MCP read-only pada sesi implementasi memastikan URL target dan effective privilege TRUNCATE masih aktif bagi anon/authenticated pada delapan tabel temuan. Query `information_schema.role_table_grants` kosong untuk role read-only bukan bukti grant telah dicabut.
- Migration 202611080001–003 disiapkan untuk revoke TRUNCATE, relasi pos/tahun dan RPC atomik, lalu pencabutan direct INSERT reimburse/kas. Pemilik menjalankan SQL melalui SQL Editor setelah backup dan penghentian pengajuan sementara; agent tidak menerapkannya.
- Klaim baru dan kas keluar manual wajib memilih pos tahun berjalan WIB. Pending mereservasi; kas keluar berelasi menjadi realisasi. `terpakai` dan transaksi tanpa pos tetap historis, tidak dijumlahkan otomatis. Pembatalan pemohon/penolakan inti wajib alasan, hanya untuk pending.
- `list_portal_budgets` hanya mengekspos ID/nama/tahun kepada profil login. Angka keuangan tetap inti. Dashboard pribadi memfilter pemohon dan RLS existing tetap berlaku.
- Lihat `docs/FINANCE_ROLLOUT.md` untuk urutan, hasil verifikasi, batas retry, dan langkah setelah pemilik menerapkan SQL. Jangan menyamakan hasil test lokal dengan runtime Supabase.

## Skill dan alat khusus

- Jika tersedia dan relevan, gunakan skill `frontend-design` untuk pekerjaan desain UI atau redesign; pertahankan identitas GenRe dan alur bisnis yang ada.
- Gunakan `imagegen` hanya ketika tugas membutuhkan aset raster baru atau pengeditan gambar. Untuk diagram arsitektur atau alur yang diminta, gunakan `archify` jika tersedia.
- Skill dan plugin lain dipakai hanya saat tugasnya cocok. Penggunaan skill tidak memberi izin untuk publish, deploy, atau mengubah layanan eksternal di luar permintaan pengguna.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
