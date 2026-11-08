# Portal Forum GenRe Kota Depok

Ruang kerja pengurus untuk administrasi surat, klaim reimburse, buku kas, pengumuman dan konfirmasi kehadiran, tiket informasi, profil organisasi, struktur dan 32 jobdesc, serta katalog sumber daya. Identitas visual GenRe dan konten organisasi dipertahankan.

Identitas Kabinet PRIMERA (PRIME ERA), periode 2026–2028, hadir pada login, header, dasbor, profil, dan brand kit. Bagian identitas memakai palet PRIMERA; tema utama dan logo institusi GenRe tetap dipertahankan. Logo PRIMERA berupa SVG rancangan sementara, tersedia untuk diunduh dengan keterangan statusnya di brand kit. Pusat Sumber Daya juga menyediakan empat tautan template sekretariat dari dokumen evaluasi: Notulensi, MOU, Surat Dispensasi, dan Surat Undangan. Semua pengurus yang login dapat membukanya; akses Google Docs mengikuti izin dokumen, tanpa penyalinan atau pengubahan otomatis oleh portal.

## Stack dan prasyarat

- Next.js 16.4.5 App Router, React 19, TypeScript strict.
- Supabase Auth, PostgreSQL/RLS, Realtime; `@supabase/ssr` untuk cookie browser/server.
- Tailwind CSS 3, Lucide, Zod untuk validasi konfigurasi, profil, respons database, dan input.
- ESLint Next.js, Prettier, Node test runner + tsx, Playwright.
- Node.js 22 atau lebih baru dan npm. Gunakan satu lockfile: `package-lock.json`.
- Test database memerlukan PostgreSQL (`initdb`, `pg_ctl`, `psql`). Di CachyOS/Arch: paket `postgresql`.

## Menjalankan lokal

```bash
npm ci
cp .env.example .env.local
# Isi dua nilai public Supabase pada .env.local.
npm run dev
```

Buka `http://localhost:3000`. Jangan menimpa `.env.local` existing; perbarui nama variabelnya secara manual bila bermigrasi.

| Variabel                        | Kegunaan                                          |
| ------------------------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL proyek Supabase; HTTPS untuk layanan nonlokal |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key JWT atau publishable key Supabase        |

Jangan gunakan service-role atau `sb_secret_` pada konfigurasi public. Konfigurasi tidak valid membuat login nonaktif dengan pesan aman. Perubahan nilai `NEXT_PUBLIC_*` memerlukan build ulang karena Next.js menyertakannya pada bundle browser. Variabel `VITE_*` tidak lagi digunakan. Sesi localStorage lama tidak diimpor; pengguna perlu login ulang.

```bash
npm run build
npm start
```

Build memakai Webpack resmi karena worker CSS Turbopack ditolak oleh lingkungan sandbox yang dipakai saat migrasi. Tidak ada fitur framework eksperimental atau pengabaian error build. Font Plus Jakarta Sans di-host lokal dengan lisensi OFL; logo memakai `next/image`. Tidak ada request Google Fonts saat runtime atau build.

## Struktur

```text
src/
  app/                    # Server layouts/pages, login, enam route portal, error/loading/404
  components/             # Header, navigasi, dialog native dan form modal
  features/
    auth/                 # Form login, sesi server, izin profil
    administrasi/         # Surat, reimburse, kas, Server Actions terkait
    komunikasi/           # Pengumuman, kehadiran, tiket dan Server Actions terkait
    media/                # Katalog Supabase, pengelolaan konten dan brand kit
    panitia/              # Request lintas bidang, assignment dan audit
    organisasi/           # Profil organisasi, struktur dan konten jobdesc resmi
    portal/               # Context UI, schema, mapping, pembacaan data, shared mutation checks
  lib/
    supabase/             # Client browser/server, konfigurasi tervalidasi, kontrak schema
    errors.ts             # Result dan pesan error aman
  tests/                  # Unit, transaksi/RLS PostgreSQL sementara, E2E dan fixture protokol lokal
  proxy.ts                # Refresh cookie, verifikasi user, redirect login dan no-store
supabase/migrations/      # SQL hardening yang harus ditinjau dan diterapkan terpisah
```

`/` mengalihkan ke `/login` atau `/dashboard`. Halaman portal: `/dashboard`, `/profil`, `/struktur`, `/administrasi`, `/komunikasi`, `/media`. Halaman memerlukan user Supabase dan profil valid. Administrasi tersedia untuk inti/kabid; panel keuangan tetap khusus inti. Semua peran dapat mengajukan surat/reimburse dari dasbor. Parameter query pada deep link dipertahankan saat login; tujuan redirect dibatasi pada route portal sendiri.

## Data, autentikasi, dan otorisasi

Server Components memverifikasi user dengan `auth.getUser()`, kemudian membaca profil nyata dari `profiles`. Layout memuat data awal tanpa shared cache. Interaksi dan modal memakai Client Components per fitur. Setiap Server Action memverifikasi ulang user, izin dari profil, dan input runtime. RLS tetap berlaku karena client server memakai user cookie dan anon key, bukan service role.

Browser Supabase hanya menangani sesi cookie dan subscription Realtime. Token tidak diteruskan sebagai props dari server. Pembaruan Realtime digabung dengan debounce dan reload yang tidak tumpang tindih. Jika subscription gagal, pengguna mendapat tombol muat ulang. Query membaca halaman 200 row sampai lengkap agar batas respons default tidak memotong total kas. Roster hanya meminta kolom direktori yang dipakai UI.

`database.types.ts` diturunkan dari SQL repository, bukan hasil introspeksi database live. Cocokkan schema staging sebelum rollout. Tidak ada route atau client untuk WhatsApp, webhook, atau automation karena belum ada integrasi existing yang memerlukannya. Integrasi mendatang ditempatkan pada modul server dengan validasi input dan kredensial server; jangan memasukkan key provider ke `NEXT_PUBLIC_*`.

## Pembaruan finance lokal (8 November 2026)

Reimburse Saya, pembatalan/penolakan beralasan, retry idempotent, serta anggaran berdasarkan reservasi dan ledger sudah disiapkan di kode lokal. Pagu historis `terpakai` tampil terpisah; data tanpa pos tidak direkonsiliasi otomatis. Fitur ini membutuhkan tiga migration 20261108 yang **belum diterapkan agent**. Pemilik menjalankannya bertahap melalui SQL Editor development sesuai [panduan rollout finance](docs/FINANCE_ROLLOUT.md). Catatan status sebelumnya di bawah merupakan riwayat; snapshot metadata terbaru tersedia pada AGENTS.md.

## Supabase dan status database

`supabase_setup.sql` adalah setup baseline proyek, bukan migration runner otomatis. Jangan menjalankannya ulang pada database existing. Aplikasi tidak menerapkan SQL atau menjalankan seed saat install, build, test E2E, maupun startup.

**Berdasarkan konfirmasi pemilik proyek, database live berasal dari seluruh file SQL yang sudah ada sebelum penambahan fitur koordinasi, termasuk hardening dan kedua RPC transaksi yang sudah diterapkan.** Status ini berdasarkan konfirmasi pemilik, bukan hasil pemeriksaan langsung database live oleh agent. [SQL hardening](supabase/migrations/202611060001_portal_hardening.sql) dan [catatan migrasi](docs/MIGRATION.md) tetap menjadi referensi implementasi; catatan historis yang menyebut hardening belum diterapkan tidak lagi menggambarkan status penerapannya saat ini.

Dua SQL baru, `202611070001_coordination.sql` dan `202611070002_media_catalog.sql`, **belum dinyatakan diterapkan ke live**. SQL ini menambah master bidang/divisi, panitia lintas bidang dengan approval Kadiv tujuan, jadwal/pembatalan pengumuman, katalog media beserta audit, dan timestamp. Panduan penerapan, pemeriksaan akun, serta rollback tersedia di [Rollout Koordinasi](docs/COORDINATION_ROLLOUT.md).

Pengumuman dan media baru dikelola inti serta pengurus Bidang Branding. Penugasan panitia berada di tab **Kebutuhan Panitia** dalam Komunikasi dan terpisah dari absensi. Dasbor menyediakan kalender WIB; deadline tiket lama tetap berupa teks sampai tanggal kalender ditetapkan. Tanggal penambahan aset katalog lama tidak ditebak. Palet, PRIMERA, dan empat template tetap tersedia saat layanan katalog mengalami gangguan.

Isu perubahan role sendiri masih menjadi tindak lanjut yang perbaikannya ditunda oleh pemilik proyek. Status penerapan hardening di atas bukan pernyataan bahwa seluruh aspek keamanan sudah selesai ditinjau atau seluruh celah sudah ditutup.

RPC adalah pemanggilan fungsi database dari aplikasi. `approve_portal_surat` menyimpan persetujuan dan riwayat surat dalam satu transaksi. `disburse_portal_reimburse` mencatat kas keluar, riwayat persetujuan, dan status pencairan dalam satu transaksi. Jika salah satu langkah gagal, seluruh transaksi dibatalkan. Penguncian row dan relasi ledger unik mencegah pencairan berulang membuat catatan kas ganda. RPC pencairan hanya mencatat pencairan yang telah diverifikasi; tidak mentransfer uang ke bank.

Untuk perubahan database berikutnya:

1. Buat backup dan bandingkan schema/policy staging dengan SQL repository.
2. Tinjau perubahan SQL dan uji pada staging yang terisolasi sebelum diterapkan ke live. Jangan menjalankan ulang baseline pada database existing.
3. Rekonsiliasi klaim dan ledger historis jika perubahan menyentuh pencairan. Klaim legacy berstatus cair tanpa ledger terkait memerlukan rekonsiliasi manual; migration tidak menebak hubungan transaksi historis.
4. Uji tiap peran, login/logout, Realtime, seluruh write, dan transaksi historis sebelum rollout aplikasi dan database yang terkoordinasi.

`seed_users.sh` adalah alat admin manual untuk proyek yang memang hendak diinisialisasi. Memerlukan `SUPABASE_URL`, `SERVICE_ROLE_KEY`, dan `SEED_INITIAL_PASSWORD` dari environment server. Akun baru diberi profil staff oleh trigger, lalu script mengisi peran lewat service role. Script tidak mereset akun existing dan tidak mencetak password. Jika pembuatan akun berhasil tetapi pengisian profil gagal, hentikan dan perbaiki profil lewat administrator; jangan membuat akun duplikat. Password bersama yang pernah berada dalam histori Git harus dianggap terekspos; pengelolaan kredensial existing dilakukan administrator, bukan migrasi ini.

## Verifikasi

```bash
npm run lint
npm run typecheck
npm run test --if-present
npx playwright install chromium
npm run test:e2e
npm run format:check
npm run build
```

Unit test mencakup matriks izin empat peran, validasi nominal/input, format data, saldo lintas tahun, attendance dan redirect aman. Test database membuat cluster PostgreSQL baru di direktori sementara, menjalankan baseline, hardening, dan migration koordinasi/katalog **hanya di cluster itu**, menguji RLS, idempotency, rollback dan pencairan bersamaan, lalu menghapus cluster. Tidak membaca konfigurasi Supabase live.

Playwright menjalankan Next.js dan fixture HTTP Supabase di `127.0.0.1:3100` dan `127.0.0.1:54328`. Kredensial fiktif hanya ada di test. E2E mencakup browser Chromium desktop/mobile. Fixture tidak membuktikan konfigurasi Supabase live atau Realtime produksi; PostgreSQL test terpisah memverifikasi SQL asli. Bila memakai lokasi browser sementara, set `PLAYWRIGHT_BROWSERS_PATH` yang sama saat install dan test.

## Batas fitur existing

- Bukti reimburse dapat berupa satu link file Google Drive opsional. Anggota upload manual ke folder bersama organisasi, lalu menempelkan link file saat pengajuan. Pengurus inti membuka bukti melalui tombol "Lihat bukti" di administrasi. Kolom existing `foto_struk_url` menyimpan link; tidak perlu bucket, Google API, atau migration tambahan. Admin mengatur akses folder/file melalui akun Google pengurus terkait; login portal tidak memberi izin Drive. Portal memvalidasi format link, bukan keberadaan, isi, lokasi folder, atau izin file. Klaim lama tanpa link tetap didukung. Folder pada Drive pribadi tidak otomatis memindahkan kepemilikan atau kuota file ke pemilik folder.

- Nomor surat baru adalah nomor **draf unik**, bukan nomor resmi berurutan. Sekretariat tetap menetapkan nomor resmi.
- Approval saat ini final oleh pimpinan, belum rantai approval bertingkat atau aturan tambahan nominal tertentu.
- QR tanda tangan/sertifikasi elektronik, cetak dokumen resmi, export LPJ/Excel, upload struk langsung dari portal, serta upload berkas langsung belum tersedia. Link modul/video dapat ditambahkan melalui katalog Drive. UI menampilkan batas ini, bukan simulasi keberhasilan. Logo PNG yang tersedia dapat diunduh.
- Target tiket masih teks bebas. Izin tanggapan mengikuti RLS existing: pimpinan atau pemohon. Akses berdasarkan keanggotaan target perlu model relasi yang disetujui dahulu.
- RLS baseline memperbolehkan seluruh pengurus membaca direktori profil/kehadiran dan surat/tiket; UI pimpinan bukan batas kerahasiaan database. Tinjau kebijakan transparansi jika data ini perlu dibatasi.
- Periode kepengurusan ditampilkan konsisten sebagai 2026–2028 sesuai dokumen evaluasi dan konfirmasi pemilik. Tahun transaksi dan anggaran mengikuti data masing-masing.
- Registrasi mandiri dan reset kata sandi belum menjadi fitur portal.

Tidak ada deploy, perubahan Supabase live, rotasi kredensial, atau layanan berbayar yang dilakukan dalam migrasi ini.
