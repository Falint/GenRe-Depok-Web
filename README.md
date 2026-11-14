# Portal Forum GenRe Kota Depok

Ruang kerja pengurus untuk administrasi surat, klaim reimburse, buku kas, pengumuman dan konfirmasi kehadiran, tiket informasi, profil organisasi, struktur dan 32 jobdesc, serta katalog sumber daya. Identitas visual GenRe dan konten organisasi dipertahankan.

Portal juga menyediakan bagian eksternal melalui tombol **Masuk sebagai tamu** pada login. `/publik` memuat profil, struktur beserta jobdesc resmi, berita, agenda, dan kontak. Tamu tidak membutuhkan akun; tautan publik dapat langsung dibagikan. Nama pengurus dan jobdesc resmi ditampilkan, sedangkan catatan jobdesc lama tetap internal.

Pengurus inti dan bidang Branding mengelola berita/agenda melalui `/konten-publik`: simpan draft, terbitkan, edit, dan tarik publikasi. Data tersimpan pada tabel `public_content`, terpisah dari pengumuman internal. Tamu hanya dapat membaca konten published melalui RLS. Fitur ini memerlukan migration `202611100001_public_content.sql`; lihat [panduan portal publik](docs/PUBLIC_PORTAL_ROLLOUT.md). Tidak ada upload gambar, pendaftaran kegiatan, atau penjadwalan publikasi otomatis. Profil, struktur, dan kontak masih diperbarui melalui kode.

Identitas Kabinet PRIMERA (PRIME ERA), periode 2026–2028, hadir pada login, header, dasbor, profil, dan brand kit. Bagian identitas memakai palet PRIMERA; tema utama dan logo institusi GenRe tetap dipertahankan. Logo PRIMERA memakai aset JPEG yang tersedia untuk diunduh di brand kit, dengan tagline #EraBaruLebihSeru. Pusat Sumber Daya juga menyediakan empat tautan template sekretariat dari dokumen evaluasi: Notulensi, MOU, Surat Dispensasi, dan Surat Undangan. Semua pengurus yang login dapat membukanya; akses Google Docs mengikuti izin dokumen, tanpa penyalinan atau pengubahan otomatis oleh portal.

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
  app/                    # Server layouts/pages, login, route internal/publik, error/loading/404
  components/             # Header, navigasi, dialog native dan form modal
  features/
    auth/                 # Form login, sesi server, izin profil
    administrasi/         # Surat, reimburse, kas, Server Actions terkait
    komunikasi/           # Pengumuman, kehadiran, tiket dan Server Actions terkait
    media/                # Katalog Supabase, pengelolaan konten dan brand kit
    panitia/              # Request lintas bidang, assignment dan audit
    organisasi/           # Profil organisasi, struktur dan konten jobdesc resmi
    portal/               # Context UI, schema, mapping, pembacaan data, shared mutation checks
    publik/               # Berita/agenda publik, validasi, loader dan editor internal
  lib/
    supabase/             # Client browser/server, konfigurasi tervalidasi, kontrak schema
    errors.ts             # Result dan pesan error aman
  tests/                  # Unit, transaksi/RLS PostgreSQL sementara, E2E dan fixture protokol lokal
  proxy.ts                # Refresh cookie, verifikasi user, redirect login dan no-store
supabase/migrations/      # SQL hardening yang harus ditinjau dan diterapkan terpisah
```

`/` mengalihkan pengunjung ke `/login`, guest ke `/publik`, pengurus ke `/dashboard`, dan admin ke `/kelola-akun`. Halaman portal internal: `/dashboard`, `/profil`, `/struktur`, `/administrasi`, `/komunikasi`, `/media`, `/konten-publik` (admin/inti/Branding), dan `/kelola-akun` (khusus admin). Portal internal memerlukan user Supabase dan profil pengurus/admin yang valid. Administrasi tersedia untuk admin/inti/kabid; panel keuangan khusus admin/inti. Semua pengurus dan admin dapat mengajukan surat/reimburse dari dasbor. Parameter query pada deep link dipertahankan saat login; tujuan redirect dibatasi pada route portal sendiri.

## Data, autentikasi, dan otorisasi

Server Components memverifikasi user dengan `auth.getUser()`, kemudian membaca profil nyata dari `profiles`. Layout memuat data awal tanpa shared cache. Interaksi dan modal memakai Client Components per fitur. Setiap Server Action memverifikasi ulang user, izin dari profil, dan input runtime. RLS tetap berlaku karena client server memakai user cookie dan anon key, bukan service role.

Browser Supabase hanya menangani sesi cookie dan subscription Realtime. Token tidak diteruskan sebagai props dari server. Pembaruan Realtime digabung dengan debounce dan reload yang tidak tumpang tindih. Jika subscription gagal, pengguna mendapat tombol muat ulang. Query membaca halaman 200 row sampai lengkap agar batas respons default tidak memotong total kas. Roster hanya meminta kolom direktori yang dipakai UI.

`database.types.ts` diturunkan dari SQL repository, bukan hasil introspeksi database live. Cocokkan schema staging sebelum rollout. Tidak ada route atau client untuk WhatsApp, webhook, atau automation karena belum ada integrasi existing yang memerlukannya. Integrasi mendatang ditempatkan pada modul server dengan validasi input dan kredensial server; jangan memasukkan key provider ke `NEXT_PUBLIC_*`.

## Pembaruan finance (8 November 2026)

Reimburse Saya, pembatalan/penolakan beralasan, retry idempotent, serta anggaran berdasarkan reservasi dan ledger sudah disiapkan di kode lokal. Pagu historis `terpakai` tampil terpisah; data tanpa pos tidak direkonsiliasi otomatis. Fitur ini membutuhkan tiga migration 20261108. Pemilik menjalankannya bertahap melalui SQL Editor development sesuai [panduan rollout finance](docs/FINANCE_ROLLOUT.md); agent tidak menerapkannya. Snapshot metadata dan batas verifikasi tersedia pada AGENTS.md.

## Supabase dan status database

`supabase_setup.sql` adalah setup baseline proyek, bukan migration runner otomatis. Jangan menjalankannya ulang pada database existing. Aplikasi tidak menerapkan SQL atau menjalankan seed saat install, build, test E2E, maupun startup.

Target Supabase `kwwbqcamoyjhgzaidtbf` dikonfirmasi pemilik sebagai development/uji coba. Pemeriksaan metadata read-only pada 8 November 2026 menemukan objek hardening, RPC transaksi, koordinasi, dan katalog media sesuai SQL repository. Riwayat migration kosong tidak berarti objek tersebut belum diterapkan. Detail dan batas pemeriksaan tersedia pada AGENTS.md.

Migration koordinasi `202611070001_coordination.sql` dan katalog `202611070002_media_catalog.sql` tetap menjadi referensi schema. Panduan penerapan dan rollback tersedia di [Rollout Koordinasi](docs/COORDINATION_ROLLOUT.md). Jangan menerapkan ulang migration untuk mengisi riwayat yang kosong.

Untuk portal publik, migration `202611100001_public_content.sql` menambahkan tabel terpisah, RLS pembaca publik, dan RPC pengelolaan khusus inti/Branding. Pemilik telah mengonfirmasi pengujian fitur berhasil setelah implementasi. Agent tidak menerapkan migration atau memverifikasi ulang Supabase live; konfirmasi pemilik tidak menggantikan audit database. Ikuti [panduan portal publik](docs/PUBLIC_PORTAL_ROLLOUT.md) untuk pemasangan baru dan rollback.

Pengumuman dan media baru dikelola inti serta pengurus Bidang Branding. Penugasan panitia berada di tab **Kebutuhan Panitia** dalam Komunikasi dan terpisah dari absensi. Dasbor menyediakan kalender WIB; deadline tiket lama tetap berupa teks sampai tanggal kalender ditetapkan. Tanggal penambahan aset katalog lama tidak ditebak. Palet, PRIMERA, dan empat template tetap tersedia saat layanan katalog mengalami gangguan.

Snapshot 8 November 2026 menemukan bahwa `anon` dan `authenticated` tidak memiliki izin write profil, termasuk perubahan role sendiri. Pemeriksaan metadata ini bukan sertifikasi seluruh keamanan atau bukti perilaku runtime. Temuan dan tindak lanjut lainnya dicatat pada AGENTS.md.

RPC adalah pemanggilan fungsi database dari aplikasi. `approve_portal_surat` menyimpan persetujuan dan riwayat surat dalam satu transaksi. `disburse_portal_reimburse` mencatat kas keluar, riwayat persetujuan, dan status pencairan dalam satu transaksi. Jika salah satu langkah gagal, seluruh transaksi dibatalkan. Penguncian row dan relasi ledger unik mencegah pencairan berulang membuat catatan kas ganda. RPC pencairan hanya mencatat pencairan yang telah diverifikasi; tidak mentransfer uang ke bank.

Untuk perubahan database berikutnya:

1. Buat backup dan bandingkan schema/policy staging dengan SQL repository.
2. Tinjau perubahan SQL dan uji pada staging yang terisolasi sebelum diterapkan ke live. Jangan menjalankan ulang baseline pada database existing.
3. Rekonsiliasi klaim dan ledger historis jika perubahan menyentuh pencairan. Klaim legacy berstatus cair tanpa ledger terkait memerlukan rekonsiliasi manual; migration tidak menebak hubungan transaksi historis.
4. Uji tiap peran, login/logout, Realtime, seluruh write, dan transaksi historis sebelum rollout aplikasi dan database yang terkoordinasi.

Pendaftaran Gmail, guest, dan admin khusus disiapkan melalui migration `202611130001_guest_accounts.sql`. Akun baru memerlukan verifikasi email dan password portal terpisah. `seed_users.sh` dinonaktifkan; akun buatan lama diturunkan melalui skrip transisi yang ditinjau pemilik. Ikuti [panduan aktivasi auth](docs/AUTH_ROLLOUT.md) sebelum membuka signup; ketersediaan fitur live bergantung pada migration dan konfigurasi SMTP.

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

Unit test mencakup matriks izin empat peran, validasi nominal/input, format data, saldo lintas tahun, attendance, redirect aman, serta validasi berita/agenda. Test database membuat cluster PostgreSQL baru di direktori sementara, menjalankan baseline dan migration terkait **hanya di cluster itu**, menguji RLS, idempotency, rollback, pencairan bersamaan, publikasi/penarikan konten, dan konflik edit, lalu menghapus cluster. Tidak membaca konfigurasi Supabase live.

Playwright menjalankan Next.js dan fixture HTTP Supabase di `127.0.0.1:3100` dan `127.0.0.1:54328`. Kredensial fiktif hanya ada di test. E2E mencakup browser Chromium desktop/mobile: login pengurus, akses tamu, navigasi publik, pagination berita, agenda mendatang/lampau, draft tersembunyi, publikasi/penarikan, izin pengelola, dan pemulihan error. Fixture tidak membuktikan konfigurasi Supabase live atau Realtime produksi; PostgreSQL test terpisah memverifikasi SQL asli. Bila memakai lokasi browser sementara, set `PLAYWRIGHT_BROWSERS_PATH` yang sama saat install dan test.

## Batas fitur existing

- Bukti reimburse dapat berupa satu link file Google Drive opsional. Anggota upload manual ke folder bersama organisasi, lalu menempelkan link file saat pengajuan. Pengurus inti membuka bukti melalui tombol "Lihat bukti" di administrasi. Kolom existing `foto_struk_url` menyimpan link; tidak perlu bucket, Google API, atau migration tambahan. Admin mengatur akses folder/file melalui akun Google pengurus terkait; login portal tidak memberi izin Drive. Portal memvalidasi format link, bukan keberadaan, isi, lokasi folder, atau izin file. Klaim lama tanpa link tetap didukung. Folder pada Drive pribadi tidak otomatis memindahkan kepemilikan atau kuota file ke pemilik folder.

- Nomor surat baru adalah nomor **draf unik**, bukan nomor resmi berurutan. Sekretariat tetap menetapkan nomor resmi.
- Approval saat ini final oleh pimpinan, belum rantai approval bertingkat atau aturan tambahan nominal tertentu.
- QR tanda tangan/sertifikasi elektronik, cetak dokumen resmi, export LPJ/Excel, upload struk langsung dari portal, serta upload berkas langsung belum tersedia. Link modul/video dapat ditambahkan melalui katalog Drive. UI menampilkan batas ini, bukan simulasi keberhasilan. Logo PNG yang tersedia dapat diunduh.
- Target tiket masih teks bebas. Izin tanggapan mengikuti RLS existing: pimpinan atau pemohon. Akses berdasarkan keanggotaan target perlu model relasi yang disetujui dahulu.
- RLS baseline memperbolehkan seluruh pengurus membaca direktori profil/kehadiran dan surat/tiket; UI pimpinan bukan batas kerahasiaan database. Tinjau kebijakan transparansi jika data ini perlu dibatasi.
- Periode kepengurusan ditampilkan konsisten sebagai 2026–2028 sesuai dokumen evaluasi dan konfirmasi pemilik. Tahun transaksi dan anggaran mengikuti data masing-masing.
- Registrasi mandiri dan reset kata sandi belum menjadi fitur portal.

Agent tidak melakukan deploy, menerapkan SQL ke Supabase live, merotasi kredensial, atau mengaktifkan layanan berbayar. Penerapan SQL oleh pemilik dan hasil pengujiannya dicatat terpisah di atas.
