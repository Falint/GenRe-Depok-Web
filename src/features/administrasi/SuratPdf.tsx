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
import { formatDate } from '@/features/portal/mapping';
import {
  SURAT_ATTACHMENT_LABEL,
  SURAT_OPENING,
  SURAT_SCHEDULE_INTRO,
  SURAT_SIGNATORIES,
  isSuratApproved,
  suratSchedule,
  suratClosing,
} from './suratTemplate';

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 44,
    paddingTop: 22,
    paddingBottom: 42,
    fontFamily: 'Times-Roman',
    fontSize: 11,
    lineHeight: 1.35,
    color: '#000000',
  },
  header: { alignItems: 'center', borderBottomWidth: 3, paddingBottom: 9, marginBottom: 14 },
  logo: { width: 58, height: 63, objectFit: 'contain', marginBottom: 5 },
  heading: { fontFamily: 'Times-Bold', fontSize: 13, textAlign: 'center' },
  bold: { fontFamily: 'Times-Bold' },
  paragraph: { marginBottom: 10, textAlign: 'justify' },
  watermark: {
    position: 'absolute',
    top: 270,
    left: 135,
    width: 325,
    height: 360,
    objectFit: 'contain',
    opacity: 0.1,
  },
  row: { flexDirection: 'row' },
  label: { width: 108 },
  colon: { width: 10 },
  value: { flex: 1 },
  signature: { marginTop: 10 },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#000000',
  },
  cell: { padding: 5, borderRightWidth: 1, borderColor: '#000000' },
});

export async function renderSuratPdf(surat: Row<'surat'>) {
  const logo = await readFile(path.join(process.cwd(), 'public', 'logo-genre-depok.png'));
  const approved = isSuratApproved(surat.status);
  const signatures = approved
    ? await Promise.all(
        SURAT_SIGNATORIES.map((signer) =>
          readFile(path.join(process.cwd(), 'assets', 'surat', `ttd-${signer.key}.png`)),
        ),
      )
    : [];
  const schedule = suratSchedule(surat);
  return renderToBuffer(
    <Document title={`${surat.jenis} - ${surat.nomor_surat}`} author="Forum GenRe Kota Depok">
      <Page size="A4" style={styles.page}>
        <PdfImage src={logo} style={styles.watermark} fixed />
        <View style={styles.header} wrap={false}>
          <PdfImage src={logo} style={styles.logo} />
          <Text style={styles.heading}>PENGURUS GENRE CABANG</Text>
          <Text style={styles.heading}>FORUM GENERASI BERENCANA KOTA DEPOK</Text>
          <Text style={{ fontFamily: 'Helvetica', fontSize: 9, marginTop: 3 }}>
            IG : @genre_kotadepok, Email : genre.depok@gmail.com
          </Text>
        </View>
        <View style={[styles.row, { marginBottom: 18 }]} wrap={false}>
          <View style={{ flex: 1 }}>
            {[
              ['Nomor', surat.nomor_surat],
              ['Lampiran', surat.lampiran_peserta?.length ? SURAT_ATTACHMENT_LABEL : '-'],
              ['Perihal', surat.perihal],
            ].map(([label, value]) => (
              <View key={label} style={styles.row}>
                <Text style={{ width: 48 }}>{label}</Text>
                <Text style={styles.colon}>:</Text>
                <Text style={[styles.value, label === 'Perihal' ? styles.bold : {}]}>{value}</Text>
              </View>
            ))}
          </View>
          <Text style={{ width: 145, textAlign: 'right' }}>
            Depok, {formatDate(surat.tanggal, true)}
          </Text>
        </View>
        <View style={{ marginBottom: 18 }} wrap={false}>
          <Text>Kepada Yth.</Text>
          <Text style={styles.bold}>{surat.tujuan}</Text>
          <Text>di Tempat</Text>
        </View>
        <Text>Dengan hormat,</Text>
        <Text style={[styles.paragraph, { textIndent: 24 }]}>{SURAT_OPENING}</Text>
        {surat.keterangan && (
          <Text style={[styles.paragraph, { textIndent: 24 }]}>{surat.keterangan}</Text>
        )}
        {schedule.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.paragraph}>{SURAT_SCHEDULE_INTRO}</Text>
            {schedule.map(([label, value]) => (
              <View key={label} style={[styles.row, { marginLeft: 24 }]} wrap={false}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.colon}>:</Text>
                <Text style={styles.value}>{value}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={[styles.paragraph, { textIndent: 24 }]}>{suratClosing(surat.jenis)}</Text>
        {approved && (
          <View style={styles.signature} wrap={false}>
            <Text style={{ textAlign: 'center', marginBottom: 4 }}>Hormat Kami,</Text>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              {SURAT_SIGNATORIES.map((signer, index) => (
                <View key={signer.key} style={{ width: '45%', alignItems: 'center' }}>
                  <Text style={[styles.bold, { height: 30, textAlign: 'center' }]}>
                    {signer.role}
                  </Text>
                  <PdfImage
                    src={signatures[index]}
                    style={{ width: 140, height: 68, objectFit: 'contain' }}
                  />
                  <Text style={[styles.bold, { textDecoration: 'underline' }]}>{signer.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>
      {Boolean(surat.lampiran_peserta?.length) && (
        <Page size="A4" style={styles.page}>
          <View fixed>
            <Text style={styles.bold}>Lampiran {surat.nomor_surat}</Text>
            <Text style={[styles.bold, { marginTop: 6, marginBottom: 10 }]}>
              Daftar Peserta {surat.lampiran_judul}
            </Text>
            <View style={[styles.tableRow, { borderTopWidth: 1 }]}>
              {['No.', 'Nama', 'Instansi', 'Unsur'].map((label, index) => (
                <Text
                  key={label}
                  style={[styles.cell, styles.bold, { width: index === 0 ? '10%' : '30%' }]}
                >
                  {label}
                </Text>
              ))}
            </View>
          </View>
          {surat.lampiran_peserta.map((participant, index) => (
            <View key={index} style={styles.tableRow} wrap={false}>
              {[String(index + 1), participant.nama, participant.instansi, participant.unsur].map(
                (value, column) => (
                  <Text key={column} style={[styles.cell, { width: column === 0 ? '10%' : '30%' }]}>
                    {value}
                  </Text>
                ),
              )}
            </View>
          ))}
        </Page>
      )}
    </Document>,
  );
}
