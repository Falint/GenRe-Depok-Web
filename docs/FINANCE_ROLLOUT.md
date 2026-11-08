# Rollout finance internal — 8 November 2026

Target yang disepakati: development/uji coba `kwwbqcamoyjhgzaidtbf`. SQL berikut belum diterapkan oleh agent. Baseline dan migration lama tidak dijalankan ulang pada database existing.

## Perubahan yang disiapkan

- Reimburse Saya untuk setiap peran, dengan status, riwayat/alasan, pos/tahun, refresh, dan pembatalan pending. Inti dapat menolak pending dengan alasan.
- ID pengajuan tetap selama satu form terbuka. RPC memeriksa pemilik dan field pengajuan, memakai advisory transaction lock untuk creation serta row lock untuk keputusan/pencairan. Retry identik sesudah commit, pencairan, perubahan nama, atau pergantian tahun tidak menggandakan transaksi. Payload berubah dengan ID sama ditolak.
- Klaim baru memilih pos tahun berjalan berdasarkan waktu server WIB. Kas keluar manual juga wajib pos; kas masuk tidak memakai pos. Pencairan menyalin pos klaim, dengan tanggal kas saat pencairan.
- Pending berelasi mereservasi anggaran; ledger keluar berelasi menjadi realisasi. Sisa = pagu − reservasi − realisasi. Melebihi pagu tetap diterima dan ditandai untuk inti. Angka `terpakai` lama tampil terpisah. Catatan tanpa pos ditandai belum direkonsiliasi.
- Antrean refresh menampung pembacaan susulan, menangani kegagalan loader, dan mempertahankan kebutuhan refresh profil di antara event tabel lain. Pagu ditambahkan ke publikasi Realtime.

## Urutan penerapan oleh pemilik

1. Pastikan backup development tersedia dan dapat dipulihkan. Hentikan sementara pengajuan/pencairan serta pencatatan kas selama pergantian versi. Simpan jumlah row dan agregat kas sebelum rollout.
2. Jalankan hanya [202611080001_revoke_truncate.sql](../supabase/migrations/202611080001_revoke_truncate.sql) melalui SQL Editor. Minta agent memverifikasi effective privilege melalui MCP. Jangan mencoba TRUNCATE live.
3. Jalankan [202611080002_finance_budget.sql](../supabase/migrations/202611080002_finance_budget.sql). Verifikasi kolom nullable, foreign key, index unik nama/tahun, empat RPC baru, definisi RPC pencairan, grant EXECUTE, dan publikasi pagu. Bandingkan jumlah transaksi serta nilai historis dengan backup. NULL link pada data lama disengaja.
4. Jalankan aplikasi versi ini terhadap development. Kode baru membutuhkan RPC metadata anggaran; sebelum tahap 2, pemuatan data portal dapat gagal. Pastikan pos tahun berjalan tersedia melalui administrasi database pemilik, tanpa menebak pemetaan data lama.
5. Setelah aplikasi memakai RPC baru, jalankan [202611080003_finance_rpc_only.sql](../supabase/migrations/202611080003_finance_rpc_only.sql). Verifikasi direct INSERT tidak tersedia; SELECT/RLS dan RPC tetap sesuai peran. Jangan aktifkan kembali pengajuan umum sebelum tahap ini selesai.
6. Bersama pemilik, uji staff/Kadiv melihat milik sendiri, inti menolak/mencairkan, retry, serta pembaruan dua sesi termasuk perubahan profil/pagu. Bandingkan saldo, reservasi, realisasi, dan history. Buka pengajuan kembali setelah hasil sesuai.

Agent dapat memverifikasi setiap tahap secara read-only setelah pemilik mengonfirmasi penerapannya. Deploy hosting tidak termasuk.

## Query verifikasi read-only

```sql
SELECT t,
  has_table_privilege('anon', 'public.' || t, 'TRUNCATE') AS anon_truncate,
  has_table_privilege('authenticated', 'public.' || t, 'TRUNCATE') AS authenticated_truncate
FROM unnest(ARRAY['profiles','surat','surat_approval','reimburse',
  'reimburse_approval','kas_mutasi','pagu_anggaran','tiket_info']) t;

SELECT t,
  has_table_privilege('authenticated', 'public.' || t, 'INSERT') AS direct_insert
FROM unnest(ARRAY['reimburse','kas_mutasi']) t;

SELECT tablename FROM pg_publication_tables
WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='pagu_anggaran';

SELECT count(*) AS claims, count(*) FILTER (WHERE pagu_anggaran_id IS NULL) AS without_budget
FROM public.reimburse;
SELECT count(*) AS ledger_rows, coalesce(sum(CASE WHEN jenis='Masuk' THEN nominal ELSE -nominal END),0) AS balance
FROM public.kas_mutasi;
SELECT reimburse_id, count(*) FROM public.kas_mutasi
WHERE reimburse_id IS NOT NULL GROUP BY reimburse_id HAVING count(*) > 1;
```

Untuk role MCP read-only, `information_schema.role_table_grants` dapat kosong karena keterbatasan visibility. Gunakan effective privilege di atas.

## Batas dan pemulihan

- Menutup/membuka form menghasilkan ID baru. Dua form berbeda untuk pengeluaran sama tidak dideduplikasi. Setelah respons gagal, ulangi di form yang sama dengan payload identik.
- Selama beberapa query pembacaan berlangsung, tampilan dapat sementara tertinggal dari transaksi terbaru. Mapper mengecualikan reservasi jika ledger klaim sudah terbaca agar klaim tidak dihitung ganda; refresh susulan memperbarui tampilan.
- Klaim historis pending tanpa pos tetap bisa diproses. Klaim historis cair tanpa ledger menolak pencairan ulang otomatis. Rekonsiliasi historis tidak dibangun.
- Jika aplikasi bermasalah, hentikan mutasi terkait dan pertahankan data/schema tambahan serta history. Jangan memulihkan TRUNCATE atau menghapus transaksi untuk rollback.
- Leaked password protection tetap tindak lanjut Dashboard Supabase pemilik. Tidak ada perubahan paket berbayar atau konfigurasi Auth oleh agent.
- Verifikasi live setelah penerapan dan alur peran bersama pemilik masih tertunda. Test lokal tidak membuktikan Realtime live atau akses Drive.

## Verifikasi lokal

- `npm run test`: 39 test lulus pada cluster PostgreSQL sementara dan unit test, termasuk grant, migration berulang/data lama, concurrency creation, race keputusan, rollback audit, retry setelah pergantian tahun, simulasi Desember–Januari WIB, perhitungan anggaran, dan antrean refresh.
- `npm run lint` dan `npm run typecheck`: lulus setelah perbaikan lifecycle antrean refresh.
- `npm run build`: lulus di luar sandbox. Percobaan sandbox gagal membaca output subprocess TypeScript; tidak ada konfigurasi validasi yang dinonaktifkan.
- Format file TS/TSX/Markdown yang berubah dan `git diff --check` diperiksa. SQL diuji dengan PostgreSQL, bukan formatter Prettier.
- E2E desktop/mobile belum terverifikasi: fixture awal tertolak socket sandbox; percobaan di luar sandbox berhenti karena executable Chromium Playwright belum tersedia. Download sandbox gagal DNS dan percobaan berikutnya terinterupsi. Sesuai arahan terbaru pemilik, tidak dilanjutkan dengan lebih banyak test browser.
- Satu build selesai sebelum perapian terakhir teks pesan retry; perubahan terakhir hanya copy pesan dan dokumentasi. Tidak ada deploy, mutasi live, atau verifikasi end-to-end Supabase pada sesi ini.
