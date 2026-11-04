# Portal Forum GenRe Kota Depok

Sistem Administrasi, Komunikasi, dan Basis Data Terpadu untuk Forum GenRe Kota Depok masa bakti 2026/2027.

## Fitur Utama

1. **Role-Based Access Control (RBAC)**:
   - Pengurus Inti: Ketua Umum, Wakil Ketua, Sekretaris, Bendahara 1 & 2.
   - Kepala Bidang: Program, GenRe Center, Branding.
   - Kepala Divisi: Reguler, Non-reguler, Duta GenRe, PR, Forum GenRe Kecamatan, Social Media Specialist, Video Editor, Desain Grafis.
   - Staf & Anggota Aktif.
   - Fitur simulasi penggantian peran langsung di antarmuka (Header switcher) untuk menguji hak akses & alur persetujuan.

2. **Modul Administrasi & Keuangan**:
   - **E-Surat**: Generator draf surat dinas resmi, penomoran otomatis berurutan baku, alur validasi bertingkat, dan stempel QR code verifikasi digital.
   - **E-Reimburse**: Klaim pencairan dana proker dengan foto bukti nota/struk, rekening bank penerima, dan rantai approval berjenjang.
   - **Buku Kas & Keuangan**: Laporan saldo kas utama, riwayat mutasi kas masuk/keluar, dan visualisasi persentase realisasi anggaran per bidang.

3. **Modul Komunikasi & Koordinasi**:
   - **Papan Pengumuman Digital**: Siaran info resmi bergradasi (Urgent, Umum, Khusus 11 Kecamatan) dengan fitur konfirmasi baca (*read receipt*).
   - **Tiket Request Informasi (SLA)**: Pengajuan permintaan data antarbidang dan perorangan untuk menggantikan chat WA yang rentan tercecer.

4. **Media Library (Pusat Sumber Daya)**:
   - **Modul Pengetahuan**: Materi Triad KRR (Seksualitas, HIV/AIDS, Napza), Kurikulum Tentang Kita (Berani, Beraksi, Berkolaborasi), dan Modul 8 Fungsi Keluarga & Stunting.
   - **Bank Aset Resmi**: Panduan kode warna hex GenRe (One-click copy), logo suite (vector SVG/PNG), dan aset video bumper/jingle audio.

5. **Antarmuka Mobile-First**:
   - Navigasi ramah jempol (Bottom Navigation Bar).
   - Floating Action Button (FAB) untuk pembuatan surat instan.

## Menjalankan Aplikasi Lokal

```bash
# Instal dependensi (sudah terinstal)
npm install

# Konfigurasi Supabase Auth (gunakan URL proyek dan anon key, bukan service-role key)
cp .env.example .env

# Jalankan server pengembangan
npm run dev
```

Akses portal melalui browser di `http://localhost:3000`.

Login memerlukan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` pada `.env`. Akun dan profil dibuat sesuai `supabase_setup.sql`; pendaftaran mandiri dan reset kata sandi belum disediakan oleh proyek ini.
