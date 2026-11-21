import assert from 'node:assert/strict';
import test from 'node:test';
import { registrationInput, registrationOpen } from '../features/publik/registrationSchema';
import { canViewParticipants } from '../features/auth/permissions';
import { suratInput } from '../features/portal/validation';
import { rowSchemas } from '../features/portal/schema';

test('registration accepts free text, normalizes whitespace and preserves capitalization', () => {
  assert.deepEqual(
    registrationInput.parse({
      nama: ' Andi   Pratama ',
      instansi: ' SMA\nNegeri 1 Depok ',
      unsur: 'PIK-R / GenRe',
    }),
    {
      nama: 'Andi Pratama',
      instansi: 'SMA Negeri 1 Depok',
      unsur: 'PIK-R / GenRe',
    },
  );
  const input = { nama: 'Andi', instansi: 'Umum', unsur: 'Lainnya' };
  for (const patch of [
    { nama: ' ' },
    { instansi: '' },
    { unsur: '\t' },
    { nama: 'a'.repeat(301) },
    { kode: 'forged' },
    { pemohon_id: 'forged' },
  ])
    assert.equal(registrationInput.safeParse({ ...input, ...patch }).success, false);
});

test('registration closes at event start and never accepts news, drafts or disabled events', () => {
  const event = {
    jenis: 'agenda',
    status: 'published',
    mulai_at: '2026-11-21T09:00:00+07:00',
    pendaftaran_dibuka: true,
  };
  const start = Date.parse(event.mulai_at);
  assert.equal(registrationOpen(event, start - 1), true);
  assert.equal(registrationOpen(event, start), false);
  for (const patch of [
    { jenis: 'berita' },
    { status: 'draft' },
    { pendaftaran_dibuka: false },
    { mulai_at: null },
    { mulai_at: 'invalid' },
  ])
    assert.equal(registrationOpen({ ...event, ...patch }, start - 1), false);
});

test('participant access includes letter creators and Branding, excludes guests and other members', () => {
  for (const level of ['admin', 'inti', 'kabid', 'kadiv', 'staff', 'guest'] as const)
    for (const bidang_id of ['branding', 'internal', null])
      assert.equal(
        canViewParticipants({ level, bidang_id }),
        level !== 'guest' &&
          (['admin', 'inti', 'kabid'].includes(level) || bidang_id === 'branding'),
      );
});

test('letter attachment requires an event and unique participant IDs without client snapshots', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const input = {
    request_id: id,
    jenis: 'Surat Permohonan',
    perihal: 'Kegiatan',
    tujuan: 'Sekolah',
    urgensi: 'Sedang',
    keterangan: 'Pengantar',
    tanggal_kegiatan: '',
    waktu_kegiatan: '',
    tempat_kegiatan: '',
    sistem_pelaksanaan: '',
  };
  assert.equal(suratInput.safeParse(input).success, true);
  assert.equal(
    suratInput.safeParse({ ...input, lampiran_agenda_id: id, lampiran_peserta_ids: [id] }).success,
    true,
  );
  for (const patch of [
    { lampiran_agenda_id: id },
    { lampiran_peserta_ids: [id] },
    { lampiran_agenda_id: id, lampiran_peserta_ids: [id, id] },
    { lampiran_peserta: [{ nama: 'Forged' }] },
  ])
    assert.equal(suratInput.safeParse({ ...input, ...patch }).success, false);
  assert.deepEqual(rowSchemas.surat.shape.lampiran_peserta.parse(undefined), []);
});
