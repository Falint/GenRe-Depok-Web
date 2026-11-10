import assert from 'node:assert/strict';
import test from 'node:test';
import { publicContentInput, contentPage } from '../features/publik/schema';
import { fromWib } from '../features/portal/datetime';
import { canManageContent } from '../features/auth/permissions';
import { safeReturnPath } from '../features/portal/routes';

const news = {
  jenis: 'berita',
  judul: 'Berita',
  ringkasan: 'Ringkasan',
  isi: 'Isi',
  status: 'draft',
  mulai_at: null,
  selesai_at: null,
  lokasi: '',
};
test('public content validates types, limits and agenda chronology in WIB', () => {
  assert.equal(publicContentInput.safeParse(news).success, true);
  for (const patch of [
    { judul: ' ' },
    { ringkasan: 'x'.repeat(501) },
    { isi: 'x'.repeat(20001) },
    { status: 'scheduled' },
    { published_at: '2026-01-01' },
    { jenis: 'agenda' },
    { lokasi: 'Depok' },
  ])
    assert.equal(publicContentInput.safeParse({ ...news, ...patch }).success, false);
  const agenda = {
    ...news,
    jenis: 'agenda',
    lokasi: 'Depok',
    mulai_at: fromWib('2026-11-11T09:00'),
  };
  assert.equal(agenda.mulai_at, '2026-11-11T02:00:00.000Z');
  assert.equal(publicContentInput.safeParse(agenda).success, true);
  assert.equal(
    publicContentInput.safeParse({ ...agenda, selesai_at: fromWib('2026-11-11T08:59') }).success,
    false,
  );
  assert.equal(
    publicContentInput.safeParse({ ...agenda, selesai_at: agenda.mulai_at }).success,
    true,
  );
});
test('public content management follows inti/Branding, never a guest role', () => {
  for (const level of ['inti', 'kabid', 'kadiv', 'staff'] as const) {
    assert.equal(canManageContent({ level, bidang_id: 'branding' }), true);
    assert.equal(canManageContent({ level, bidang_id: 'internal' }), level === 'inti');
  }
  assert.equal(safeReturnPath('/konten-publik?page=2'), '/konten-publik?page=2');
  assert.equal(safeReturnPath('https://evil.example/konten-publik'), '/dashboard');
});
test('pagination bounds invalid values without accepting arrays or offsets', () => {
  for (const value of [undefined, '0', '-1', '1.5', 'Infinity', '1000000', ['2']])
    assert.equal(contentPage(value), 1);
  assert.equal(contentPage('2'), 2);
});
