# Laporan audit dan migrasi — 6 November 2026

Migrasi kode lokal selesai dan pemeriksaan lokal lolos. Rollout produksi belum dilakukan. Konfigurasi public pada smoke test belum tersedia atau belum valid; login production menampilkan pesan konfigurasi yang aman. Approval dan pencairan memerlukan SQL tambahan yang belum diterapkan ke Supabase live.

## A. Architecture Summary

**Sebelumnya:** React 18, JSX, Vite 5, satu URL dengan enam tab state di `App.jsx`, REST Auth manual/localStorage, client database dengan refresh token nonaktif, tanpa types/lint/test.

**Sekarang:** Next.js 16.4.5 App Router, React 19, TypeScript strict. Server layout menangani identitas dan initial read; fitur interaktif memakai Client Components per halaman. Server Actions dibagi antara auth, administrasi, komunikasi, dan refresh data. Browser/server Supabase terpisah memakai cookie SSR; `proxy.ts` memperbarui sesi dan mencegah shared caching.

Folder utama: `src/app`, `src/components`, `src/features/{auth,administrasi,komunikasi,media,organisasi,portal}`, `src/lib/supabase`, `src/tests`, serta `supabase/migrations`.

Keputusan utama:

- Mempertahankan markup, Tailwind 3, Lucide, logo, dan konten resmi untuk mengurangi risiko regresi visual.
- Memindahkan write ke server dengan user-scoped client. RLS tetap diperlukan; tidak ada service role pada aplikasi.
- Menggunakan RPC transaksi untuk approval dan pencairan karena beberapa request REST tidak atomik.
- Memakai Webpack resmi. Turbopack gagal pada worker CSS dengan `binding to a port: Operation not permitted`, termasuk setelah eskalasi lingkungan.
- Tidak membuat API provider, webhook, queue, maupun lapisan repository yang belum dibutuhkan fitur existing.

## B. Migration Summary

| Fitur existing               | Route / implementasi baru                  |
| ---------------------------- | ------------------------------------------ |
| Login pada root              | `/login`; `/` mengalihkan berdasarkan sesi |
| Dasbor                       | `/dashboard`                               |
| Profil forum                 | `/profil`                                  |
| Struktur dan 32 jobdesc      | `/struktur`                                |
| Surat, reimburse, kas        | `/administrasi`, form mandiri dari dasbor  |
| Pengumuman, kehadiran, tiket | `/komunikasi`                              |
| Media library dan brand kit  | `/media`                                   |

Sebelumnya tidak ada React Router, parameter route, atau deep link tab. Navigasi sekarang memakai `Link` dan App Router, mendukung reload/back. Login mempertahankan query deep link untuk route portal yang diizinkan dan menolak redirect eksternal. Metadata, loading/error/404, noindex untuk portal private, serta viewport yang mengizinkan zoom disediakan.

Semua fitur operasional existing tetap mengarah ke Supabase, bukan mock aplikasi. Cookie menggantikan localStorage dan sesi manual; pengguna perlu login ulang. Nama tabel/kolom existing dipertahankan. Kontrak database diturunkan dari SQL repository dan respons divalidasi runtime; belum diintrospeksi terhadap schema live.

File Vite, entry SPA, JSX lama, data operasional mock yang tidak dipakai, dependency Vite, dan output `dist` dihapus. `AGENTS.md` existing pengguna tetap utuh. Seed tidak dijalankan; perubahan pada `supabase_setup.sql` hanya menghapus password literal dari contoh komentar. Hardening baru berada pada file migration terpisah.

## C. Refactoring Summary

- Domain entities, peran, input, hasil operasi, modal state, dan kontrak query memakai types eksplisit tanpa `any`, `@ts-ignore`, atau pengabaian lint.
- Zod memvalidasi config public, profil, data database, UUID, nominal integer positif/aman, kategori, dan panjang teks; field identitas browser ditolak.
- Helper izin hanya menerima empat level profil nyata. Data simulasi role switch dihapus.
- Navigasi desktop/mobile memakai satu implementasi. Dialog native menyatukan focus trap, Escape, focus return, scroll lock, dan busy state. Suspense modal terpisah mencegah lazy import menyembunyikan halaman dan menghilangkan fokus.
- Fake tanggal, foto struk, approval chain, dan nomor resmi acak pada payload form dihapus. Nomor draf memakai UUID unik dan tahun aktual; `Surat Rekomendasi` memakai kode `SR`. Urgensi `Rendah` sesuai CHECK SQL.
- Konfirmasi pengumuman dasbor sekarang dipersist dan tetap terlihat setelah reload. Konfirmasi ulang menggunakan conflict-ignore atas constraint unik existing.
- Saldo bulanan membandingkan bulan **dan tahun**, dengan format Indonesia dan zona waktu Jakarta. Total yang melampaui integer aman ditolak.
- Pembacaan memakai pagination 200 row sampai count lengkap; data yang terpotong tidak dianggap lengkap. Roster hanya meminta kolom direktori yang dipakai.
- Reload Realtime di-debounce dan tidak tumpang tindih. Mutasi menahan submit ganda selama request berlangsung dan menampilkan kegagalan refresh secara terpisah dari keberhasilan write.
- UI status kosong/error, label form, kontrol keyboard, reduced motion, dan layout nomor draf panjang diperbaiki. Logo dioptimalkan dengan `next/image`; Plus Jakarta Sans di-host lokal dengan lisensi OFL.
- Status domain dan batas validasi/query/feedback ditempatkan pada konfigurasi domain. Literal konten resmi dan nilai CSS yang maknanya jelas tetap dibaca langsung.

Pemisahan bundle per route dan lazy modal dapat dilihat dari konfigurasi/import. Tidak ada klaim peningkatan latency, Core Web Vitals, atau penghematan bundle yang diukur. Build awal Vite menghasilkan JS 579,73 kB (gzip 150,30 kB); angka itu tidak dibandingkan langsung dengan chunk framework Next.js.

## D. Security Review

| Temuan                                                                        | Penanganan                                                                                           | Status                                                      |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Profil dapat mengubah level sendiri; signup mempercayai metadata level        | Revoke write profil, signup staff, perubahan peran lewat admin                                       | SQL lokal, belum berlaku di live                            |
| INSERT dapat memalsukan pemohon/penulis; pemohon surat dapat mengganti status | Identitas server dan policy/grant yang mengikat user; approval lewat RPC                             | Validasi server aktif; policy live perlu migration          |
| Pencairan tiga write tanpa transaksi/idempotency                              | Row lock, ledger berelasi unik, history dan status dalam transaksi                                   | RPC diuji PostgreSQL lokal; live perlu migration            |
| Password seed bersama tertulis dan dicetak                                    | Environment password wajib, JSON encoder aman, fail-fast HTTP, profil diisi lewat service role admin | Script lokal diperbaiki; credential existing tidak dirotasi |
| Session manual, refresh nonaktif, dua penyimpanan token                       | Supabase SSR cookie, getUser server, client/server terpisah                                          | Implementasi dan fixture E2E lolos                          |
| Input browser tidak tervalidasi                                               | Schema strict, checks izin di setiap write, nominal aman                                             | Unit dan E2E lolos                                          |
| Config public dapat salah diisi privileged key                                | Validasi config saat Next config dimuat dan saat runtime                                             | Unit validator lolos; tidak membaca nilai `.env.local`      |
| Data private berpotensi tersimpan pada shared cache                           | Dynamic server rendering dan private/no-store                                                        | Header production smoke test lolos                          |
| Advisory transitif minimatch di tooling ESLint                                | Override khusus parser ke patch `>=11.0.1`; API yang dipakai tetap `minimatch()`                     | Lint/typecheck/build dan audit npm lolos                    |

Audit Git lanjutan memeriksa 85 file working tree yang tidak di-ignore dan menelusuri 55 blob pada histori yang terjangkau dari refs lokal; konten binary dilewati. Pemeriksaan pola private key, token provider, privileged JWT, dan credential literal tidak menemukan temuan pada file aktif. Password seed lama ditemukan pada histori `seed_users.sh` dan `supabase_setup.sql`; nilainya tidak disertakan dalam laporan. `.env.local` dan file ignored tidak dibaca. Scan berbasis pola ini bukan jaminan bebas seluruh jenis rahasia atau audit environment/deployment eksternal.

`.gitignore` melindungi seluruh `.env*` dengan pengecualian `.env.example`, private key/sertifikat, output build, dependency, hasil test, dan metadata Vercel. `.vercel/README.txt` serta `.vercel/project.json` dilepas dari index Git; file lokal tetap disimpan. Penghapusan tracking sudah staged, tetapi belum di-commit. Tidak ada perubahan histori atau rotasi credential.

**Risiko yang masih berlaku:** RLS lama tetap memungkinkan eskalasi lewat REST langsung sampai hardening diterapkan. Akun yang memakai password lama dalam histori repository harus dianggap terdampak dan ditangani administrator. Migration tidak otomatis mengidentifikasi promosi profil tidak sah atau merekonsiliasi transaksi lama.

## E. Verification Results

| Pemeriksaan                                     | Hasil                                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Baseline `npm run build` Vite                   | Lolos; warning bundle besar tercatat                                                                                           |
| `npm run lint`                                  | Lolos, nol warning                                                                                                             |
| `npm run typecheck`                             | Lolos, strict                                                                                                                  |
| `npm run test --if-present`                     | 18 test lolos                                                                                                                  |
| `npm run test:e2e`                              | 10 test lolos, Chromium desktop dan Pixel 7                                                                                    |
| `npm run format:check`                          | Lolos                                                                                                                          |
| `npm run build`                                 | Lolos, Next.js/Webpack; sembilan entry termasuk root/login/404 dan enam fitur                                                  |
| `npm start -- --hostname 127.0.0.1 --port 3101` | Server siap; smoke test HTTP lolos                                                                                             |
| Smoke HTTP                                      | Root/protected memakai redirect login (termasuk streaming redirect Next.js), login 200, 404 benar, no-store/nosniff/DENY benar |
| `npm audit --json`                              | Nol vulnerability pada lockfile final                                                                                          |
| `git diff --check`, `bash -n seed_users.sh`     | Lolos                                                                                                                          |
| Pemeriksaan graph import runtime                | Tidak ditemukan circular import                                                                                                |
| Pemeriksaan screenshot                          | Dasbor desktop dan mobile diperiksa                                                                                            |

Unit mencakup permission matrix empat peran, money/input validation, mapping/nullability, saldo lintas tahun, ID attendance, return URL, pagination 1.005 row, respons terpotong/malformed, serta encoding payload seed. Test seed hanya mengeksekusi encoder JSON terisolasi, bukan script seed atau request eksternal.

PostgreSQL sementara menjalankan baseline dan hardening asli untuk membuktikan penolakan promosi profil, forged ownership, update approval langsung, akses keuangan terlarang, idempotency, rollback setelah audit failure, tiga pencairan bersamaan menghasilkan satu ledger, serta penolakan repayment klaim legacy tanpa linkage. Tidak ada database live yang disentuh.

E2E memakai fixture protokol HTTP Supabase pada localhost: login gagal/berhasil, deep link/query, protected route, semua navigasi, reload/back/logout, empat form operasional, broadcast, tanggapan tiket, attendance persisten, empty/error/retry, focus return/Escape, dan wrapping surat panjang. Missing RPC diuji sebagai error yang aman. Hasil ini tidak membuktikan Auth/Realtime/RLS pada proyek Supabase live.

## F. Remaining Issues

Prasyarat sebelum rollout:

1. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` pada environment target, lalu build ulang. File `.env.local` existing tidak diubah otomatis.
2. Bandingkan schema/policy staging dengan repository. Tinjau dan terapkan `supabase/migrations/202611060001_portal_hardening.sql` secara terpisah setelah backup dan persetujuan.
3. Audit profil existing, tangani credential lama yang terekspos, dan rekonsiliasi klaim historis. Jangan mencairkan ulang klaim legacy secara otomatis.
4. Verifikasi akun nyata tiap peran, token refresh, Realtime, seluruh read/write, serta transaksi historis pada staging. Konfigurasi layanan dan koneksi live belum diuji.
5. Hosting harus memakai runtime Next.js/Node dan build/start baru; pengaturan proyek hosting eksternal tidak diubah.

Batas fitur baseline yang tetap didokumentasikan: nomor resmi berurutan, approval bertingkat, QR/tanda tangan elektronik, cetak resmi, export LPJ/Excel, upload struk, serta file modul/video belum tersedia. Kontrol semu tidak lagi mengaku berhasil. Logo PNG existing dapat diunduh.

Target bidang tiket dan sasaran pengumuman masih teks bebas. Akses tanggapan mengikuti policy existing: pimpinan atau pemohon. Direktori profil/kehadiran serta surat/tiket masih memiliki kebijakan transparansi authenticated; UI pimpinan tidak menjadikan data itu private pada database. Periode 2026/2027 versus 2026/2028 membutuhkan konfirmasi pemilik.

Tidak ada deploy, provisioning, perubahan Supabase live, rotasi credential, commit, atau push. Tidak ada integrasi berbayar, WhatsApp/n8n, atau webhook baru.

## Rujukan teknis

- [Next.js App Router dan instalasi](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js ESLint](https://nextjs.org/docs/app/api-reference/config/eslint)
- [Supabase SSR browser/server clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
