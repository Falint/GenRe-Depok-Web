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
import { mapFinance, mapPengumuman, mapSurat } from '../features/portal/mapping';
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
