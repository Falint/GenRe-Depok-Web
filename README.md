# Portal Forum GenRe Kota Depok

Ruang kerja pengurus untuk administrasi surat, klaim reimburse, buku kas, pengumuman dan konfirmasi kehadiran, tiket informasi, profil organisasi, struktur dan 32 jobdesc, serta katalog sumber daya. Identitas visual GenRe dan konten organisasi dipertahankan.

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
    media/                # Katalog dan brand kit statis
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

## Supabase dan prasyarat rollout

`supabase_setup.sql` adalah setup baseline proyek, bukan migration runner otomatis. Jangan menjalankannya ulang pada database existing. Aplikasi tidak menerapkan SQL atau menjalankan seed saat install, build, test E2E, maupun startup.

**Hardening database belum diterapkan ke layanan live.** Tinjau [SQL hardening](supabase/migrations/202611060001_portal_hardening.sql) dan [catatan migrasi](docs/MIGRATION.md) sebelum rollout:

1. Buat backup dan bandingkan schema/policy staging dengan SQL repository.
2. Audit profil yang sudah ada: policy lama mengizinkan perubahan level sendiri dan trigger lama mempercayai metadata signup.
3. Rekonsiliasi klaim yang sudah dicairkan dan ledger lama. Migration tidak menebak hubungan transaksi historis.
4. Terapkan SQL pada staging yang terisolasi setelah disetujui. SQL menambahkan `kas_mutasi.reimburse_id` dan index unik, memperketat grants/policy, serta menyediakan dua RPC transaksi.
5. Uji tiap peran, login/logout, Realtime, seluruh write, dan klaim historis pada staging sebelum rollout aplikasi dan database yang terkoordinasi.

`approve_portal_surat` dan `disburse_portal_reimburse` mengunci row dan menulis status, audit history, serta kas dalam satu transaksi. Pencairan berulang tidak membuat ledger ganda. Klaim legacy berstatus cair tanpa ledger terkait ditolak untuk rekonsiliasi manual. RPC hanya mencatat pencairan yang telah diverifikasi; tidak mentransfer uang ke bank.

Tanpa RPC tersebut, pengajuan/read biasa tetap memakai schema existing; approval surat/pencairan memberi error eksplisit. Tidak ada fallback ke write terpisah yang dapat membuat pencairan parsial. **Policy lama masih rentan melalui REST langsung sampai SQL hardening diterapkan; server validation saja tidak memperbaikinya.**

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

Unit test mencakup matriks izin empat peran, validasi nominal/input, format data, saldo lintas tahun, attendance dan redirect aman. Test database membuat cluster PostgreSQL baru di direktori sementara, menjalankan baseline dan hardening **hanya di cluster itu**, menguji RLS, idempotency, rollback dan pencairan bersamaan, lalu menghapus cluster. Tidak membaca konfigurasi Supabase live.

Playwright menjalankan Next.js dan fixture HTTP Supabase di `127.0.0.1:3100` dan `127.0.0.1:54328`. Kredensial fiktif hanya ada di test. E2E mencakup browser Chromium desktop/mobile. Fixture tidak membuktikan konfigurasi Supabase live atau Realtime produksi; PostgreSQL test terpisah memverifikasi SQL asli. Bila memakai lokasi browser sementara, set `PLAYWRIGHT_BROWSERS_PATH` yang sama saat install dan test.

## Batas fitur existing

- Nomor surat baru adalah nomor **draf unik**, bukan nomor resmi berurutan. Sekretariat tetap menetapkan nomor resmi.
- Approval saat ini final oleh pimpinan, belum rantai approval bertingkat atau aturan tambahan nominal tertentu.
- QR tanda tangan/sertifikasi elektronik, cetak dokumen resmi, export LPJ/Excel, upload struk, serta berkas modul/video belum tersedia. UI menampilkan batas ini, bukan simulasi keberhasilan. Logo PNG yang tersedia dapat diunduh.
- Target tiket masih teks bebas. Izin tanggapan mengikuti RLS existing: pimpinan atau pemohon. Akses berdasarkan keanggotaan target perlu model relasi yang disetujui dahulu.
- RLS baseline memperbolehkan seluruh pengurus membaca direktori profil/kehadiran dan surat/tiket; UI pimpinan bukan batas kerahasiaan database. Tinjau kebijakan transparansi jika data ini perlu dibatasi.
- Konten periode organisasi existing tidak konsisten antara 2026/2027 dan 2026/2028; tidak ditebak ulang saat migrasi.
- Registrasi mandiri dan reset kata sandi belum menjadi fitur portal.

Tidak ada deploy, perubahan Supabase live, rotasi kredensial, atau layanan berbayar yang dilakukan dalam migrasi ini.
