# Handoff audit portal — 8 November 2026

## Tujuan dan konteks

Dokumen ini menyimpan hasil audit sesi Codex agar sesi berikutnya dapat melanjutkan berdasarkan bukti dan batas verifikasi yang jelas. Ini bukan laporan bahwa temuan sudah diperbaiki, bukan audit keamanan menyeluruh, dan bukan izin untuk mengubah layanan eksternal.

Portal mengelola surat, reimburse, kas, pengumuman, tiket, panitia, serta media pengurus Forum GenRe Kota Depok. Audit mengasumsikan pemakaian internal organisasi. Pemeriksaan difokuskan pada autentikasi, izin, mutasi data, keuangan, pemuatan data, SQL, dan dokumentasi; tidak seluruh komponen visual dibaca secara mendalam.

Stack aktual berdasarkan `package.json`: Next.js 16.4.5 App Router, React 19, TypeScript, Tailwind CSS 3, Supabase SSR, dan Zod. `AGENTS.md` masih memuat peta Vite/JSX lama. Gunakan kode dan konfigurasi terkini sebagai sumber fakta arsitektur, sambil tetap mengikuti aturan kerja dan keamanan pengguna.

## Bukti dan status sesi audit

Pemeriksaan berikut benar-benar dijalankan pada sesi audit 8 November 2026:

| Pemeriksaan                        | Hasil                                    |
| ---------------------------------- | ---------------------------------------- |
| `npm run test`                     | 31 test lolos; tidak ada gagal atau skip |
| `npm run lint`                     | Lolos                                    |
| `npm run typecheck`                | Lolos                                    |
| `npm run build`                    | Lolos                                    |
| `git status --short` setelah audit | Bersih                                   |

Test database memakai cluster PostgreSQL sementara dan SQL repository. Hasil ini membuktikan perilaku yang diuji secara lokal, termasuk izin, rollback, serta pencairan bersamaan tanpa ledger ganda. Hasil tersebut tidak membuktikan kondisi Supabase live.

E2E browser, pemeriksaan visual mobile/desktop, `format:check`, akses file Drive, dan Realtime terhadap Supabase sesungguhnya tidak dijalankan pada sesi audit ini. Laporan lama yang menyebut hasil E2E adalah bukti sesi lain, bukan pemeriksaan ulang sesi ini.

Tidak ada perbaikan kode aplikasi, penerapan SQL, seed, perubahan database eksternal, commit, push, atau deploy pada audit ini. Build sempat mengubah import generated pada `next-env.d.ts`; perubahan generated tersebut dikembalikan sehingga working tree bersih.

## Temuan yang perlu ditindaklanjuti

Semua temuan berikut berasal dari pembacaan kode dan penelusuran referensi. Skenario kegagalannya belum direproduksi secara khusus dalam browser atau Supabase live. Prioritas menunjukkan urutan tindak lanjut yang disarankan, bukan klaim insiden produksi.

### 1. Prioritas tinggi — realisasi anggaran belum mengikuti transaksi

- **Bukti:** `src/features/portal/mapping.ts`, fungsi `mapFinance`, menampilkan `pagu_anggaran.terpakai`. RPC `disburse_portal_reimburse` pada `supabase/migrations/202611060001_portal_hardening.sql` menulis kas, approval, dan status klaim, tetapi tidak memperbarui pagu. Tidak ditemukan penghubung otomatis lain pada jalur transaksi repository. Baseline juga memasukkan nilai realisasi awal pada `supabase_setup.sql`.
- **Dampak:** pencairan baru dapat mengurangi saldo kas tanpa menaikkan realisasi anggaran yang ditampilkan. Dashboard masih menuliskan tahun 2026 secara tetap.
- **Perbaikan minimum:** sepakati hubungan transaksi dengan bidang/tahun anggaran, lalu gunakan sumber realisasi yang dapat direkonsiliasi dengan ledger. Jangan menjumlahkan kategori teks bebas atau mengubah nilai historis berdasarkan tebakan. Sesuaikan label tahun dengan data yang ditampilkan.
- **Verifikasi:** catat pengeluaran pada bidang dan tahun tertentu; pastikan saldo serta realisasi sesuai. Uji retry pencairan, rollback, transaksi historis, dan pergantian tahun tanpa penghitungan ganda.

### 2. Prioritas tinggi — anggota belum memiliki tracking reimburse sendiri

- **Bukti:** `src/features/portal/DashboardTab.tsx` menyediakan `mySurat` dan bagian “Pengajuan Surat Saya”. Daftar reimburse berada di `src/features/administrasi/AdministrasiTab.tsx`, pada panel khusus inti. RLS existing mengizinkan pemohon membaca reimburse sendiri.
- **Dampak:** staff/Kadiv dapat mengajukan klaim, tetapi belum memiliki daftar klaim sendiri untuk memeriksa status pencairan.
- **Perbaikan minimum:** tambahkan “Reimburse Saya” pada dashboard menggunakan data existing yang difilter berdasarkan ID pemohon. Tampilkan nominal, status, dan riwayat yang tersedia tanpa memperluas izin database.
- **Verifikasi:** staff dan Kadiv dapat melihat klaim sendiri sebelum/sesudah pencairan, termasuk setelah reload. Klaim pengguna lain tetap tidak terbuka. Uji keadaan kosong dan gagal memuat data.

### 3. Prioritas tinggi — retry pembuatan klaim atau mutasi dapat menggandakan data

- **Bukti:** `addReimburse` dan `addMutasi` dalam `src/features/administrasi/actions.ts` melakukan insert baru tanpa ID pengajuan stabil dari form. `PortalProvider` menahan submit bersamaan hanya selama request berlangsung. Sebagai pembanding, request panitia sudah memakai ID tetap selama form dibuka.
- **Dampak:** database berhasil menyimpan tetapi respons terputus; pengguna mengulang pengajuan dan menghasilkan baris baru. Perlindungan pencairan satu klaim tidak mencegah dua klaim atau mutasi manual yang terpisah.
- **Perbaikan minimum:** pertahankan ID pengajuan selama form dibuka dan pastikan database menangani retry payload yang sama tanpa insert ganda. Payload berbeda dengan ID yang sama harus ditolak, bukan dianggap berhasil. Pertahankan validasi identitas dan RLS.
- **Verifikasi:** simulasikan respons hilang setelah commit, retry identik, request bersamaan, dan payload berubah pada ID yang sama. Pastikan hanya satu catatan tersimpan untuk satu pengajuan.

### 4. Prioritas menengah — refresh Realtime dapat melewatkan perubahan

- **Bukti:** `refreshData` pada `src/features/portal/PortalProvider.tsx` mengembalikan promise yang sedang berjalan tanpa menandai kebutuhan refresh berikutnya. Callback Realtime memakai satu timer untuk semua tabel; `router.refresh()` bergantung pada tabel event terakhir. `src/features/portal/useFeatureData.ts` sudah memiliki pola `repeat` untuk refresh susulan.
- **Dampak:** perubahan saat pembacaan berlangsung dapat tidak tercakup respons lama dan tidak memicu pembacaan susulan. Event tabel lain sesudah event `profiles` dapat membatalkan refresh profil sehingga tampilan peran tertinggal. Ini bukan bukti bypass izin Server Action/RLS.
- **Perbaikan minimum:** gunakan pola antrean refresh existing; simpan kebutuhan refresh profil terpisah dari event terakhir. Jangan membuat subscription atau lapisan state baru tanpa kebutuhan.
- **Verifikasi:** tahan respons loader, kirim event perubahan kedua, lalu pastikan refresh susulan berjalan. Uji event `profiles` disusul tabel lain, perubahan role, kegagalan loader, dan unmount.

### 5. Prioritas menengah — penerima tiket belum memperoleh hak tanggapan berdasarkan target

- **Bukti:** `canRespondToTicket` pada `src/features/auth/permissions.ts` mengizinkan pimpinan atau pemohon. `respondTiket` pada `src/features/komunikasi/actions.ts` memakai aturan tersebut. Policy tiket pada hardening mengikuti aturan yang sama. `target_bidang` masih teks bebas.
- **Dampak:** staff yang menjadi penerima permintaan antarbidang tidak otomatis dapat menjawab. Ini batas kemampuan existing yang sudah didokumentasikan, bukan regresi baru.
- **Perbaikan minimum:** sepakati apakah penerima yang boleh menjawab adalah Kabid, Kadiv, atau anggota bidang/divisi tujuan. Gunakan relasi ID organisasi untuk aturan tersebut, kemudian selaraskan UI, Server Action, dan RLS. Jangan memberi akses berdasarkan pencocokan nama jabatan atau teks target.
- **Verifikasi:** matriks pemohon, penerima yang berwenang, pimpinan, dan pengguna lain. Uji request langsung ke database serta perubahan penempatan akun. Aturan penerima memerlukan keputusan produk sebelum implementasi.

### 6. Prioritas tinggi sebelum rollout — kesesuaian database live belum diverifikasi

- **Bukti:** `README.md` menyatakan status penerapan berdasarkan konfirmasi pemilik, bukan introspeksi agent. Dua migration baru belum dikonfirmasi penerapannya. Lihat bagian status database di bawah dan `docs/COORDINATION_ROLLOUT.md`.
- **Dampak:** aplikasi lokal dapat lolos build/test sementara tabel, kolom, RPC, izin, atau penempatan akun pada proyek Supabase sebenarnya belum sesuai. Fitur baru bisa gagal atau belum dapat digunakan oleh akun terkait.
- **Perbaikan minimum:** bandingkan schema, grant, RLS, fungsi, publikasi Realtime, dan penempatan akun secara read-only. Susun selisih konkret sebelum mengusulkan migration apa pun. Jangan menjalankan ulang baseline pada database existing.
- **Verifikasi:** setelah penerapan yang memang diotorisasi, uji alur tiap peran, approval, pencairan, koordinasi, media, dan Realtime di lingkungan terkait. Test lokal saja tidak menutup temuan ini.

### 7. Prioritas menengah — dokumentasi instruksi agent tertinggal

- **Bukti:** `AGENTS.md` masih menyatakan React 18, Vite, JSX, `src/App.jsx`, dan tidak ada script test/lint/typecheck. `package.json`, README, serta struktur `src/app` menunjukkan stack dan perintah berbeda.
- **Dampak:** sesi agent berikutnya dapat mencari file yang sudah tidak ada atau melewatkan pemeriksaan yang tersedia.
- **Perbaikan minimum:** perbarui peta proyek, alur autentikasi/data, konfigurasi environment, dan daftar perintah berdasarkan implementasi aktual. Pertahankan instruksi pengguna, batas layanan eksternal, serta blok generated Next.js.
- **Verifikasi:** cocokkan path, nama variabel, dan script dengan repo. Pastikan tidak menyalin kredensial atau mengklaim pemeriksaan live sudah dilakukan.

## Backlog fitur, terpisah dari bug

Berikut kemampuan yang belum lengkap menurut README/kode. Bukan persetujuan untuk membangun semuanya:

- Reset/ganti password dan alur pemulihan akun dari portal.
- Penolakan atau permintaan revisi surat/reimburse dengan alasan serta riwayat.
- Nomor surat resmi berurutan dan penerbitan dokumen; nomor existing masih draf unik.
- Export laporan/LPJ/Excel, bukti transfer, dan cetak dokumen resmi sesuai kebutuhan organisasi.
- Approval bertingkat serta aturan nominal jika memang ditetapkan organisasi.

Upload bukti reimburse melalui link file Google Drive sudah didukung. Jangan mencatatnya sebagai fitur yang sepenuhnya belum ada. Upload langsung dari portal, QR verifikasi/tanda tangan elektronik, serta integrasi transfer bank belum tersedia.

Urutan awal yang disarankan: cocokkan database aktual, benahi tracking reimburse serta ketepatan pembukuan, lalu keandalan retry dan refresh. Kebutuhan fitur tambahan tetap perlu ditentukan pemilik.

## Status Supabase dan migration

“Database live” dalam audit berarti database aktual pada proyek Supabase yang digunakan aplikasi, bukan file SQL repository atau cluster test sementara. Istilah tersebut tidak otomatis berarti production; identifikasi dahulu apakah proyek merupakan development, staging, atau production.

- Pengguna menyatakan sudah menghubungkan Supabase. Pada pengecekan terakhir sesi audit, tool Supabase belum tersedia untuk agent. Koneksi tidak berhasil diverifikasi dan database eksternal belum diakses. Jangan menganggap status ini tetap sama pada sesi berikutnya; temukan tool yang tersedia kembali.
- Berdasarkan README dan konfirmasi pemilik yang tercatat, SQL sebelum fitur koordinasi, termasuk `202611060001_portal_hardening.sql` dan kedua RPC transaksi, sudah diterapkan. Ini bukan hasil pemeriksaan langsung agent.
- `202611070001_coordination.sql` dan `202611070002_media_catalog.sql` belum dikonfirmasi diterapkan. Jangan mengubah “belum dikonfirmasi” menjadi klaim “pasti belum diterapkan”.
- README juga menyebut tindak lanjut isu perubahan role sendiri masih ditunda pemilik, sedangkan SQL lokal mencabut write profil dan test lokal menolak promosi. Ketidakselarasan catatan ini perlu diperiksa terhadap policy/grant aktual; jangan menyatakan celah live pasti ada atau pasti tertutup.
- `docs/ENGINEERING_REPORT.md` dan sebagian `docs/MIGRATION.md` memuat status historis sebelum konfirmasi penerapan hardening. Gunakan README terbaru untuk status konfirmasi, lalu buktikan dengan introspeksi jika akses tersedia.
- Transparansi pembacaan surat, tiket, direktori, dan kehadiran masih luas menurut RLS baseline. Itu kebijakan existing; jangan mengklaim pembatasan tombol UI menjamin kerahasiaan database. Perubahan kebijakan membutuhkan keputusan pemilik.

## Langkah sesi Codex berikutnya

1. Baca `AGENTS.md`, README, dokumen ini, dan bagian kode yang terkait. Periksa Git status; jangan menimpa perubahan pengguna. Perlakukan laporan ini sebagai snapshot, bukan fakta yang selalu mutakhir.
2. Temukan tool Supabase yang tersedia. Jika tersedia, identifikasi proyek dan lingkungannya terlebih dahulu; gunakan akses read-only dan query metadata minimum yang diperlukan. Jangan mengambil seluruh data pribadi untuk audit schema.
3. Cocokkan tabel/kolom, RLS, grant, RPC, publikasi Realtime, dan penempatan peran dengan SQL repo. Laporkan ketidaksesuaian dan status migration berdasarkan bukti aktual. Jangan membaca atau mencetak rahasia `.env.local`.
4. Pilih temuan yang diminta pengguna untuk dikerjakan. Keputusan domain anggaran dan hak penerima tiket belum dikunci oleh audit ini. Jangan mengarang aturan bisnis untuk menutup temuan.
5. Untuk perubahan kode, telusuri caller dan RLS terkait, buat perubahan minimum, tambahkan regression test yang bermakna, jalankan pemeriksaan relevan, lalu tinjau diff.
6. Jangan menjalankan seed, menerapkan SQL, mengubah data eksternal, commit, push, atau deploy sebagai efek samping. Pembuatan dokumen ini hanya mengotorisasi dokumentasi, bukan perbaikan maupun rollout.

## Pembaruan implementasi finance — 8 November 2026

Bagian audit di atas merupakan snapshot sebelum implementasi. Pemilik kemudian menetapkan target development `kwwbqcamoyjhgzaidtbf`, pos tahun pengajuan, reservasi pending, pembatalan/penolakan beralasan, serta penerimaan klaim melebihi pagu dengan peringatan inti.

Kode lokal telah menambahkan Reimburse Saya, RPC pembuatan idempotent, keputusan atomik, relasi pos nullable, perhitungan reservasi/realisasi/sisa, filter tahun, serta antrean refresh susulan. Migration keamanan, schema, dan penghentian direct INSERT dipisah dalam tiga tahap. Data historis tidak dipetakan atau dihapus otomatis.

MCP sesi implementasi memastikan URL target dan effective privilege TRUNCATE masih aktif pada delapan tabel. Belum ada SQL diterapkan, mutasi live, atau deploy. Hasil pengujian dan langkah rollout berikutnya dicatat pada [FINANCE_ROLLOUT.md](FINANCE_ROLLOUT.md). Hak penerima tiket, approval bertingkat, export, dan rekonsiliasi historis tetap di luar lingkup.
