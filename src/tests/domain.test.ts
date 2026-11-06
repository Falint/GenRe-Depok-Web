import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canApproveOrConfirm,
  canRespondToTicket,
  canViewAdminFinance,
  profileToRole,
  requirePermission,
} from '../features/auth/permissions';
import {
  draftNumber,
  mutasiInput,
  parseInput,
  reimburseInput,
  suratInput,
  pengumumanInput,
  INPUT_LIMITS,
} from '../features/portal/validation';
import { mapFinance, mapPengumuman, mapReimburse, mapSurat } from '../features/portal/mapping';
import { rowSchemas, ROLE_LEVELS, type Profile, type Row } from '../features/portal/schema';
import { getSupabaseConfig } from '../lib/supabase/config';
import { safeReturnPath } from '../features/portal/routes';
import { PortalError, safeError } from '../lib/errors';

const id = '00000000-0000-4000-8000-000000000001';
const profile: Profile = {
  id,
  email: 'test@example.org',
  nama_lengkap: 'Pengurus',
  jabatan: 'Bendahara',
  bidang_divisi: 'Inti',
  kelompok: 'Inti',
  level: 'inti',
  avatar: null,
  telepon_wa: null,
  created_at: null,
};
const mutation = (
  date: string,
  nominal: number,
  jenis: Row<'kas_mutasi'>['jenis'] = 'Masuk',
): Row<'kas_mutasi'> => ({
  id,
  created_at: null,
  tgl: date,
  nominal,
  jenis,
  deskripsi: 'Kas',
  kategori: 'Operasional',
  sumber_dana: 'Kas',
  dicatat_oleh: id,
  dicatat_oleh_nama: 'Pengurus',
});

test('permission matrix uses profile.level for all four roles', () => {
  for (const level of ROLE_LEVELS) {
    assert.equal(canViewAdminFinance(level), level === 'inti');
    assert.equal(canApproveOrConfirm(level), ['inti', 'kabid'].includes(level));
    assert.equal(profileToRole({ ...profile, level }).isBendahara, level === 'inti');
    assert.equal(canRespondToTicket({ id, level }, null), ['inti', 'kabid'].includes(level));
    assert.equal(canRespondToTicket({ id, level }, id), true);
  }
  assert.throws(() => requirePermission(false), PortalError);
});
test('cash totals include all history but monthly totals require matching year and Jakarta month', () => {
  const rows = [
    mutation('2025-11-03', 100),
    mutation('2026-11-03', 300),
    mutation('2026-11-04', 50, 'Keluar'),
    mutation('2026-10-31', 75),
  ];
  const totals = mapFinance(rows, [], new Date('2026-11-05T00:00:00Z'));
  assert.equal(totals.saldoUtama, 425);
  assert.equal(totals.pemasukanBulanIni, 300);
  assert.equal(totals.pengeluaranBulanIni, 50);
  assert.equal(mapFinance([], []).saldoUtama, 0);
  assert.throws(
    () =>
      mapFinance([mutation('2026-11-01', Number.MAX_SAFE_INTEGER), mutation('2026-11-01', 1)], []),
    PortalError,
  );
});
test('money rejects zero, negative, fractional, infinite and unsafe amounts', () => {
  for (const nominal of [0, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(
      reimburseInput.safeParse({
        proker: 'Proker',
        nominal,
        keterangan: '',
        bank: 'BCA',
        rekening: '123',
      }).success,
      false,
    );
    assert.equal(
      mutasiInput.safeParse({
        nominal,
        jenis: 'Masuk',
        deskripsi: 'Kas',
        kategori: 'Iuran',
        sumberDana: 'Bank',
      }).success,
      false,
    );
  }
});
test('server input rejects forged identity, whitespace and excessive content', () => {
  const input = {
    jenis: 'Surat Tugas',
    perihal: 'Tugas',
    tujuan: 'Sekolah',
    urgensi: 'Rendah',
    keterangan: '',
  };
  assert.equal(suratInput.safeParse(input).success, true);
  assert.equal(suratInput.safeParse({ ...input, pemohon_id: id }).success, false);
  assert.equal(suratInput.safeParse({ ...input, perihal: '  ' }).success, false);
  assert.equal(suratInput.safeParse({ ...input, urgensi: 'Biasa' }).success, false);
  assert.equal(
    suratInput.safeParse({ ...input, perihal: 'x'.repeat(INPUT_LIMITS.TITLE + 1) }).success,
    false,
  );
  assert.throws(() => parseInput(pengumumanInput, {}), PortalError);
  assert.match(
    draftNumber('Surat Rekomendasi', id, new Date('2027-01-01T00:00:00Z')),
    /\/SR\/FG-DPK\/2027$/,
  );
});
test('reimburse accepts optional Drive file links and rejects unsafe or folder URLs', () => {
  const input = {
    proker: 'Proker',
    nominal: 25000,
    keterangan: '',
    bank: 'BCA',
    rekening: '123',
  };
  assert.equal(reimburseInput.safeParse(input).success, true);
  for (const link of [
    '',
    '   ',
    'https://drive.google.com/file/d/receipt_123-abc/view?usp=sharing&resourcekey=key',
    'https://drive.google.com/file/d/receipt_123-abc/preview',
    'https://drive.google.com/open?id=receipt_123-abc',
  ]) {
    assert.equal(reimburseInput.safeParse({ ...input, foto_struk_url: link }).success, true);
  }
  const link = 'https://drive.google.com/file/d/receipt_123-abc/view';
  assert.equal(
    reimburseInput.parse({ ...input, foto_struk_url: ` ${link} ` }).foto_struk_url,
    link,
  );
  for (const invalid of [
    'javascript:alert(1)',
    'data:text/html,test',
    'http://drive.google.com/file/d/receipt/view',
    'https:drive.google.com/file/d/receipt/view',
    'https://example.org/receipt.jpg',
    'https://drive.google.com.evil.example/file/d/receipt/view',
    'https://drive.google.com@evil.example/file/d/receipt/view',
    'https://user:password@drive.google.com/file/d/receipt/view',
    'https://drive.google.com:8443/file/d/receipt/view',
    'https://drive.google.com/drive/folders/folder_123',
    'https://drive.google.com/open',
    'https://drive.google.com/open?id=',
    'https://drive.google.com/file/d//view',
    'https://drive.google.com/file/d/receipt/view/extra',
    `https://drive.google.com/file/d/${'x'.repeat(2048)}/view`,
  ]) {
    assert.equal(
      reimburseInput.safeParse({ ...input, foto_struk_url: invalid }).success,
      false,
      invalid,
    );
  }
});
test('reimburse mapping hides missing and unsafe stored links without dropping the claim', () => {
  const claim: Row<'reimburse'> = {
    id,
    proker: 'Proker',
    nominal: 25000,
    keterangan: null,
    bank: 'BCA',
    rekening: '123',
    pemohon_id: id,
    pemohon_nama: 'Pengurus',
    divisi: 'Inti',
    status: null,
    tanggal: '07 November 2026',
    created_at: null,
    foto_struk_url: null,
    bukti_transfer_url: null,
  };
  for (const link of [null, '', 'javascript:alert(1)', 'https://example.org/receipt.jpg']) {
    const result = mapReimburse({ ...claim, foto_struk_url: link }, []);
    assert.equal(result.id, id);
    assert.equal(result.buktiStruk, null);
  }
  const link = 'https://drive.google.com/file/d/receipt_123/view?resourcekey=key';
  assert.equal(mapReimburse({ ...claim, foto_struk_url: link }, []).buktiStruk, link);
});
test('external rows validate nullable fields, role and money before rendering', () => {
  assert.equal(rowSchemas.profiles.safeParse(profile).success, true);
  assert.equal(rowSchemas.profiles.safeParse({ ...profile, level: 'admin' }).success, false);
  assert.equal(
    rowSchemas.kas_mutasi.safeParse(mutation('2026-11-03', Number.MAX_SAFE_INTEGER + 1)).success,
    false,
  );
});
test('attendance maps stable user IDs and handles empty roster', () => {
  const ann: Row<'pengumuman'> = {
    id,
    created_at: null,
    judul: 'Rapat',
    kategori: 'Umum',
    target: 'Semua',
    isi: 'Undangan',
    penulis_id: id,
    penulis_nama: 'Pengurus',
    total_target: null,
  };
  const read = { id, pengumuman_id: id, user_id: id, confirmed_at: null };
  assert.equal(mapPengumuman(ann, [read], [profile]).readList[0].userId, id);
  assert.equal(mapPengumuman(ann, [], []).totalTarget, 0);
  const letter: Row<'surat'> = {
    id,
    created_at: null,
    pemohon_id: id,
    pemohon_nama: 'Pengurus',
    divisi: 'Inti',
    nomor_surat: 'DRAFT',
    jenis: 'Surat Tugas',
    perihal: 'Kegiatan',
    tujuan: 'Sekolah',
    keterangan: null,
    urgensi: null,
    status: null,
    tanggal: '2026-11-03',
    file_pdf_url: null,
  };
  assert.equal(mapSurat(letter, []).status, 'Menunggu Review Kabid');
});
test('public configuration rejects privileged keys without printing their content', () => {
  const previous = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_secret_test';
    assert.throws(getSupabaseConfig);
    const token = [
      'eyJhbGciOiJIUzI1NiJ9',
      Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'),
      'test',
    ].join('.');
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = token;
    assert.throws(getSupabaseConfig);
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_test';
    assert.equal(getSupabaseConfig().url, 'https://example.supabase.co');
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://public.example.org';
    assert.throws(getSupabaseConfig);
  } finally {
    if (previous.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previous.key;
  }
  assert.equal(safeError(new PortalError('Action refusée'), 'test'), 'Action refusée');
});

test('return URL preserves known deep-link query and rejects external redirects', () => {
  assert.equal(safeReturnPath('/media?filter=logo#brand'), '/media?filter=logo#brand');
  for (const input of [
    'https://evil.example.org',
    '//evil.example.org',
    '/\\evil.example.org',
    'javascript:alert(1)',
    '/unknown',
    ['media'],
    null,
  ])
    assert.equal(safeReturnPath(input), '/dashboard');
});

test('WIB input handles midnight, leap days and invalid dates without browser timezone dependence', async () => {
  const { fromWib, wibInput, attendanceOpen } = await import('../features/portal/datetime');
  assert.equal(fromWib('2028-02-29T00:30'), '2028-02-28T17:30:00.000Z');
  assert.equal(wibInput('2028-02-28T17:30:00Z'), '2028-02-29T00:30');
  for (const value of ['2027-02-29T00:30', '2028-02-30T00:30', '2028-01-01T25:00', 'invalid'])
    assert.throws(() => fromWib(value));
  const now = Date.parse('2028-01-01T00:00:00Z');
  assert.equal(attendanceOpen({}, now), true);
  assert.equal(attendanceOpen({ cancelled_at: '2027-01-01' }, now), false);
  assert.equal(attendanceOpen({ mulai_at: '2028-01-01T00:00:00Z' }, now), false);
  assert.equal(attendanceOpen({ mulai_at: '2028-01-01T00:00:01Z' }, now), true);
});
test('content management uses explicit bidang, independently of letter and finance permissions', async () => {
  const { canManageContent } = await import('../features/auth/permissions');
  assert.equal(canManageContent({ level: 'kabid', bidang_id: 'internal' }), false);
  assert.equal(canManageContent({ level: 'staff', bidang_id: null }), false);
  for (const level of ['kabid', 'kadiv', 'staff'] as const)
    assert.equal(canManageContent({ level, bidang_id: 'branding' }), true);
  assert.equal(canManageContent({ level: 'inti' }), true);
});

test('calendar respects WIB dates across midnight, month boundaries and multi-day assignments', async () => {
  const { entriesOnDate } = await import('../features/portal/datetime');
  const entries = [
    { id: 'deadline', date: '2028-01-31T18:00:00Z' },
    { id: 'panitia', date: '2028-01-31T03:00:00Z', end: '2028-02-02T09:00:00Z' },
  ];
  assert.deepEqual(
    entriesOnDate(entries, '2028-01-31').map((e) => e.id),
    ['panitia'],
  );
  assert.deepEqual(
    entriesOnDate(entries, '2028-02-01').map((e) => e.id),
    ['deadline', 'panitia'],
  );
  assert.deepEqual(
    entriesOnDate(entries, '2028-02-02').map((e) => e.id),
    ['panitia'],
  );
  assert.deepEqual(entriesOnDate(entries, '2028-02-03'), []);
});

test('only current staff in the destination division can receive a new assignment', async () => {
  const { canAssignMember } = await import('../features/panitia/schema');
  assert.equal(canAssignMember({ level: 'staff', divisi_id: 'design' }, 'design'), true);
  assert.equal(canAssignMember({ level: 'staff', divisi_id: 'video' }, 'design'), false);
  assert.equal(canAssignMember({ level: 'kadiv', divisi_id: 'design' }, 'design'), false);
  assert.equal(canAssignMember({ level: 'staff', divisi_id: null }, null), false);
});
