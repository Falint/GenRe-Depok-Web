import 'server-only';
import React from 'react';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  Document,
  Page,
  Text,
  View,
  Image as PdfImage,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { Row } from '@/features/portal/schema';
import { KABINET } from '@/features/organisasi/content';
import { formatDate } from '@/features/portal/mapping';

const styles = StyleSheet.create({
  page: {
    padding: 42,
    paddingBottom: 55,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.6,
    color: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    paddingBottom: 12,
    marginBottom: 22,
  },
  logo: { width: 33, height: 38, objectFit: 'contain', marginHorizontal: 3 },
  heading: { flex: 1, textAlign: 'center', fontSize: 8 },
  bold: { fontFamily: 'Helvetica-Bold' },
  paragraph: { marginBottom: 12, textAlign: 'justify' },
  signature: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-between' },
});

export async function renderSuratPdf(surat: Row<'surat'>) {
  const logos = await Promise.all(
    ['logo-depok.png', 'logo-dp3ap2kb.png', 'logo-salam-genre.png', 'logo-genre-depok.png'].map(
      (name) => readFile(path.join(process.cwd(), 'public', name)),
    ),
  );
  return renderToBuffer(
    <Document title={`${surat.jenis} - ${surat.nomor_surat}`} author="Forum GenRe Kota Depok">
      <Page size="A4" style={styles.page}>
        <View style={styles.header} wrap={false}>
          <PdfImage src={logos[0]} style={styles.logo} />
          <PdfImage src={logos[1]} style={styles.logo} />
          <View style={styles.heading}>
            <Text>PEMERINTAH KOTA DEPOK • DINAS DP3AP2KB</Text>
            <Text style={styles.bold}>FORUM GENERASI BERENCANA (GENRE) KOTA DEPOK</Text>
            <Text>Sekretariat: Gedung Dibaleka II Balai Kota Depok</Text>
            <Text>Jl. Margonda Raya No. 54</Text>
            <Text>SK Walikota Depok No. 100.3.3.3/61/Kpts/DP3AP2KB/Huk/2026</Text>
          </View>
          <PdfImage src={logos[2]} style={styles.logo} />
          <PdfImage src={logos[3]} style={styles.logo} />
        </View>
        <Text style={{ textAlign: 'right', marginBottom: 12 }}>
          Kota Depok, {formatDate(surat.tanggal, true)}
        </Text>
        <Text>Nomor: {surat.nomor_surat}</Text>
        <Text>Lampiran: - (Satu Berkas)</Text>
        <Text style={styles.bold}>
          Perihal: {surat.jenis}: {surat.perihal}
        </Text>
        <View style={{ marginVertical: 18 }} wrap={false}>
          <Text>Kepada Yth,</Text>
          <Text style={styles.bold}>{surat.tujuan}</Text>
          <Text>di Tempat</Text>
        </View>
        <Text style={styles.paragraph}>Dengan hormat,</Text>
        <Text style={styles.paragraph}>
          Salam Generasi Berencana! Teriring salam dan doa semoga Bapak/Ibu senantiasa dalam
          lindungan Tuhan Yang Maha Esa dan dilancarkan dalam menjalankan aktivitas sehari-hari.
        </Text>
        <Text style={styles.paragraph}>
          Sehubungan dengan pelaksanaan program kerja Forum GenRe Kota Depok masa bakti{' '}
          {KABINET.periode}, dengan ini kami sampaikan bahwa:
        </Text>
        <Text style={styles.paragraph}>{surat.keterangan || '-'}</Text>
        <Text style={styles.paragraph}>
          Demikian {surat.jenis.toLowerCase()} ini kami sampaikan. Atas perhatian, dukungan, dan
          kerja sama yang baik, kami ucapkan terima kasih.
        </Text>
        <View style={styles.signature} wrap={false}>
          <View style={{ maxWidth: '45%' }}>
            <Text>Diajukan oleh:</Text>
            <Text style={styles.bold}>{surat.pemohon_nama}</Text>
            <Text>{surat.divisi}</Text>
          </View>
          <View style={{ maxWidth: '50%', textAlign: 'center' }}>
            <Text>Mengetahui &amp; Menyetujui,</Text>
            <Text style={styles.bold}>Ketua Umum Forum GenRe Kota Depok</Text>
            <Text style={{ marginTop: 28, fontFamily: 'Helvetica-Bold' }}>
              Muhammad Ighasta Mughis
            </Text>
            <Text style={{ fontSize: 7 }}>DISETUJUI DI PORTAL</Text>
          </View>
        </View>
      </Page>
    </Document>,
  );
}
