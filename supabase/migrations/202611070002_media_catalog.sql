-- Preserve the existing catalog; unknown upload/addition dates remain NULL.
BEGIN;
INSERT INTO public.media_resources (legacy_key,jenis,judul,deskripsi,url,kategori,jenjang,halaman,tahun,format,size,durasi,created_at) VALUES
('MOD-1','modul','Modul Pegangan Triad KRR (Seksualitas, HIV/AIDS, & Napza)','Pedoman edukasi pencegahan pernikahan anak, seks pra-nikah, bahaya HIV/AIDS, dan pencegahan penyalahgunaan zat adiktif.',NULL,'Triad KRR','Semua Jenjang',48,2026,'PDF (Resmi BKKBN & DP3AP2KB)','4.8 MB','',NULL),
('MOD-2','modul','Kurikulum Tentang Kita: Modul Berani (Usia 10 - 14 Tahun)','Panduan fasilitator sebaya untuk remaja awal mengenai perubahan fisik pubertas, konsep diri positif, dan pertemanan sehat.',NULL,'Modul Pelatihan','Remaja Awal',36,2025,'PDF Interaktif','6.2 MB','',NULL),
('MOD-3','modul','Kurikulum Tentang Kita: Modul Beraksi (Usia 15 - 19 Tahun)','Modul perencanaan masa depan, pendidikan tinggi, life skills pengambilan keputusan kritis, dan literasi digital.',NULL,'Modul Pelatihan','Remaja Madya',52,2025,'PDF Interaktif','7.1 MB','',NULL),
('MOD-4','modul','Kurikulum Tentang Kita: Modul Berkolaborasi (Usia 20 - 24 Tahun)','Pedoman kesiapan berkeluarga, perencanaan finansial muda, serta pencegahan stunting dari hulu.',NULL,'Modul Pelatihan','Remaja Akhir',44,2025,'PDF Interaktif','5.9 MB','',NULL),
('MOD-5','modul','Panduan Edukasi 8 Fungsi Keluarga & Pencegahan Stunting','Materi sosialisasi peran remaja dalam mencegah kelahiran stunting dengan memenuhi gizi seimbang & menghindari anemia.',NULL,'Keluarga & Stunting','Umum & Kader',32,2026,'PDF','3.4 MB','',NULL),
('LOGO-1','logo','Logo Resmi Forum GenRe Kota Depok (Master Crest)','Logo Resmi Forum GenRe Kota Depok (Master Crest)','/logo-genre-depok.png','','',NULL,NULL,'PNG HD','521 KB','',NULL),
('LOGO-2','logo','Logo Kemitraan DP3AP2KB Kota Depok','Logo Kemitraan DP3AP2KB Kota Depok','/logo-dp3ap2kb.png','','',NULL,NULL,'PNG Official','109 KB','',NULL),
('LOGO-3','logo','Lambang Pemerintah Kota Depok (Paricara Dharma)','Lambang Pemerintah Kota Depok (Paricara Dharma)','/logo-depok.png','','',NULL,NULL,'PNG','232 KB','',NULL),
('VIDEO-1','video','Bumper Video Opening Resmi GenRe Depok (1080p 60fps)','Bumper Video Opening Resmi GenRe Depok (1080p 60fps)',NULL,'','',NULL,NULL,'MP4 / 4K','24 MB','00:06',NULL),
('VIDEO-2','video','Bumper Video Closing & Social Media Endscreen','Bumper Video Closing & Social Media Endscreen',NULL,'','',NULL,NULL,'MP4','31 MB','00:08',NULL),
('VIDEO-3','video','Audio Jingle Salam GenRe Remaja Berencana (Master WAV)','Audio Jingle Salam GenRe Remaja Berencana (Master WAV)',NULL,'','',NULL,NULL,'WAV Audio','18 MB','01:45',NULL),
('VIDEO-4','video','B-Roll Footage Kegiatan Duta GenRe & Roadshow Depok','B-Roll Footage Kegiatan Duta GenRe & Roadshow Depok',NULL,'','',NULL,NULL,'Google Drive Archive','1.8 GB','Multi-clip',NULL)
ON CONFLICT (legacy_key) DO NOTHING;
COMMIT;
