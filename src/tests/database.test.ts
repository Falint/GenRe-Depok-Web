import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'genre-db-test-'));
const cluster = join(directory, 'data');
const args = ['-h', directory, '-p', '54329', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'];
let started = false;
const sql = (statement: string) =>
  execFileSync('psql', args, {
    input: statement,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
const id = (value: number) => `00000000-0000-4000-8000-${value.toString().padStart(12, '0')}`;
const asUser = (value: number, statement: string) =>
  `SET ROLE authenticated; SET request.jwt.claim.sub = '${id(value)}'; ${statement}`;

before(() => {
  execFileSync('initdb', ['-D', cluster, '--auth=trust', '--no-locale', '-E', 'UTF8'], {
    stdio: 'pipe',
  });
  execFileSync(
    'pg_ctl',
    [
      '-D',
      cluster,
      '-l',
      join(directory, 'postgres.log'),
      '-o',
      `-k ${directory} -p 54329 -c listen_addresses=''`,
      '-w',
      'start',
    ],
    { stdio: 'pipe' },
  );
  started = true;
  sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE PUBLICATION supabase_realtime; GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
  sql(readFileSync('supabase_setup.sql', 'utf8'));
  sql(
    'GRANT USAGE ON SCHEMA public TO anon, authenticated; GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;',
  );
  sql(readFileSync('supabase/migrations/202611060001_portal_hardening.sql', 'utf8'));
  sql(readFileSync('supabase/migrations/202611070001_coordination.sql', 'utf8'));
  for (const [index, level] of ['inti', 'kabid', 'kadiv', 'staff'].entries()) {
    sql(
      `INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES ('${id(index + 1)}','test${index + 1}@example.org','{"level":"inti","jabatan":"Ketua"}');`,
    );
    assert.equal(
      sql(`SELECT level FROM public.profiles WHERE id='${id(index + 1)}'`),
      'staff',
      'signup metadata must not grant leadership',
    );
    sql(
      `UPDATE public.profiles SET level='${level}', kelompok='Bidang', jabatan='${level}' WHERE id='${id(index + 1)}';`,
    );
  }
  sql(`INSERT INTO public.reimburse (id,proker,pemohon_id,pemohon_nama,divisi,nominal,bank,rekening)
    VALUES ('${id(10)}','Proker','${id(4)}','test4','Bidang',100,'Bank','123'), ('${id(11)}','Rollback','${id(4)}','test4','Bidang',200,'Bank','123'), ('${id(12)}','Concurrent','${id(4)}','test4','Bidang',300,'Bank','123');
    INSERT INTO public.surat (id,nomor_surat,jenis,perihal,pemohon_id,pemohon_nama,divisi,tujuan) VALUES ('${id(20)}','DRAFT','Surat Tugas','Tugas','${id(4)}','test4','Bidang','Sekolah');`);
});
after(() => {
  if (started)
    execFileSync('pg_ctl', ['-D', cluster, '-m', 'immediate', '-w', 'stop'], { stdio: 'pipe' });
  rmSync(directory, { recursive: true, force: true });
});

test('RLS prevents promotion, forged ownership, and direct approval', () => {
  assert.throws(
    () => sql(asUser(4, `UPDATE public.profiles SET level='inti' WHERE id='${id(4)}'`)),
    /permission denied/,
  );
  assert.throws(
    () =>
      sql(
        asUser(
          4,
          `INSERT INTO public.reimburse (proker,pemohon_id,pemohon_nama,divisi,nominal,bank,rekening) VALUES ('Forged','${id(1)}','test1','Bidang',100,'Bank','1')`,
        ),
      ),
    /row-level security/,
  );
  assert.throws(
    () =>
      sql(
        asUser(
          4,
          `UPDATE public.surat SET status='Selesai / Terbit (QR ACC)' WHERE id='${id(20)}'`,
        ),
      ),
    /permission denied/,
  );
  assert.throws(
    () => sql(asUser(2, `SELECT public.disburse_portal_reimburse('${id(10)}')`)),
    /Permission denied/,
  );
  assert.throws(
    () => sql(asUser(4, `SELECT public.approve_portal_surat('${id(20)}')`)),
    /Permission denied/,
  );
  assert.equal(sql(asUser(4, `SELECT count(*) FROM public.kas_mutasi`)).split('\n').at(-1), '0');
  assert.equal(sql(asUser(3, `SELECT count(*) FROM public.reimburse`)).split('\n').at(-1), '0');
});
test('disbursement is idempotent and writes status, history and linked cash together', () => {
  sql(
    asUser(
      1,
      `SELECT public.disburse_portal_reimburse('${id(10)}'); SELECT public.disburse_portal_reimburse('${id(10)}');`,
    ),
  );
  assert.equal(
    sql(`SELECT status FROM public.reimburse WHERE id='${id(10)}'`),
    'Selesai / Dicairkan',
  );
  assert.equal(
    sql(`SELECT count(*) FROM public.reimburse_approval WHERE reimburse_id='${id(10)}'`),
    '1',
  );
  assert.equal(sql(`SELECT count(*) FROM public.kas_mutasi WHERE reimburse_id='${id(10)}'`), '1');
});
test('failed audit write rolls back cash and status', () => {
  sql(`CREATE FUNCTION public.test_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected audit failure'; END; $$;
    CREATE TRIGGER test_reject_audit BEFORE INSERT ON public.reimburse_approval FOR EACH ROW EXECUTE FUNCTION public.test_reject_audit();`);
  try {
    assert.throws(
      () => sql(asUser(1, `SELECT public.disburse_portal_reimburse('${id(11)}')`)),
      /Injected audit failure/,
    );
  } finally {
    sql(
      'DROP TRIGGER test_reject_audit ON public.reimburse_approval; DROP FUNCTION public.test_reject_audit();',
    );
  }
  assert.equal(
    sql(`SELECT status FROM public.reimburse WHERE id='${id(11)}'`),
    'Menunggu Approval Bendahara',
  );
  assert.equal(sql(`SELECT count(*) FROM public.kas_mutasi WHERE reimburse_id='${id(11)}'`), '0');
});
test('concurrent disbursements produce exactly one cash entry', async () => {
  const call = () =>
    new Promise<void>((resolve, reject) => {
      const process = spawn('psql', args, { stdio: ['pipe', 'ignore', 'pipe'] });
      let error = '';
      process.stderr.on('data', (data) => {
        error += String(data);
      });
      process.on('error', reject);
      process.on('close', (code) => (code === 0 ? resolve() : reject(new Error(error))));
      process.stdin.end(asUser(1, `SELECT public.disburse_portal_reimburse('${id(12)}')`));
    });
  await Promise.all([call(), call(), call()]);
  assert.equal(sql(`SELECT count(*) FROM public.kas_mutasi WHERE reimburse_id='${id(12)}'`), '1');
  assert.equal(
    sql(`SELECT count(*) FROM public.reimburse_approval WHERE reimburse_id='${id(12)}'`),
    '1',
  );
});
test('legacy paid claim without linkage refuses automatic repayment', () => {
  sql(`UPDATE public.reimburse SET status='Selesai / Dicairkan' WHERE id='${id(11)}'`);
  assert.throws(
    () => sql(asUser(1, `SELECT public.disburse_portal_reimburse('${id(11)}')`)),
    /Legacy disbursement requires reconciliation/,
  );
  assert.equal(sql(`SELECT count(*) FROM public.kas_mutasi WHERE reimburse_id='${id(11)}'`), '0');
});
test('kabid approval is idempotent and uses trusted profile actor', () => {
  sql(
    asUser(
      2,
      `SELECT public.approve_portal_surat('${id(20)}'); SELECT public.approve_portal_surat('${id(20)}');`,
    ),
  );
  assert.equal(
    sql(`SELECT status FROM public.surat WHERE id='${id(20)}'`),
    'Selesai / Terbit (QR ACC)',
  );
  assert.equal(sql(`SELECT count(*) FROM public.surat_approval WHERE surat_id='${id(20)}'`), '1');
  assert.equal(
    sql(`SELECT actor_name FROM public.surat_approval WHERE surat_id='${id(20)}'`),
    'test2',
  );
});

function setupCoordination() {
  for (const [value, role, field, division] of [
    [30, 'kadiv', 'eksternal', 'reguler'],
    [31, 'kadiv', 'branding', 'design'],
    [32, 'staff', 'branding', 'design'],
    [33, 'staff', 'branding', 'design'],
    [34, 'kadiv', 'internal', 'duta'],
    [35, 'staff', 'internal', 'duta'],
  ] as const) {
    sql(
      `INSERT INTO auth.users(id,email) VALUES ('${id(value)}','coord${value}@example.org'); UPDATE public.profiles SET level='${role}',bidang_id='${field}',divisi_id='${division}' WHERE id='${id(value)}';`,
    );
  }
}
const requestValues = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    judul: 'Bantuan acara',
    deskripsi: 'Dokumentasi',
    divisi_tujuan_id: 'design',
    jumlah: 2,
    deadline_respons: '2099-01-01T00:00:00Z',
    mulai_at: '2099-01-02T00:00:00Z',
    selesai_at: '2099-01-03T00:00:00Z',
    ...overrides,
  });
test('panitia requires explicit placement, a target Kadiv, and cross-bidang routing', () => {
  setupCoordination();
  assert.throws(
    () =>
      sql(
        `UPDATE public.profiles SET level='kadiv',bidang_id='branding',divisi_id='design' WHERE id='${id(4)}'`,
      ),
    /duplicate key/,
  );
  assert.throws(
    () =>
      sql(`UPDATE public.profiles SET bidang_id='internal',divisi_id='design' WHERE id='${id(4)}'`),
    /foreign key/,
  );
  assert.throws(
    () => sql(asUser(3, `SELECT public.create_panitia_request('${id(40)}','${requestValues()}')`)),
    /Permission denied/,
  );
  assert.throws(
    () => sql(asUser(31, `SELECT public.create_panitia_request('${id(40)}','${requestValues()}')`)),
    /bidang lain/,
  );
  assert.throws(
    () =>
      sql(
        asUser(
          30,
          `SELECT public.create_panitia_request('${id(40)}','${requestValues({ divisi_tujuan_id: 'video' })}')`,
        ),
      ),
    /belum memiliki Kadiv/,
  );
  sql(
    asUser(
      30,
      `SELECT public.create_panitia_request('${id(40)}','${requestValues()}'); SELECT public.create_panitia_request('${id(40)}','${requestValues()}');`,
    ),
  );
  assert.equal(
    sql(`SELECT count(*) FROM public.panitia_history WHERE request_id='${id(40)}'`),
    '1',
  );
  assert.throws(
    () =>
      sql(
        asUser(
          30,
          `SELECT public.create_panitia_request('${id(40)}','${requestValues({ jumlah: 3 })}')`,
        ),
      ),
    /Pengajuan berubah/,
  );
  assert.throws(
    () =>
      sql(
        asUser(
          30,
          `INSERT INTO public.panitia_assignments(request_id,user_id,nama) VALUES ('${id(40)}','${id(32)}','Forged')`,
        ),
      ),
    /permission denied/,
  );
});
test('only target Kadiv decides and assigns, partial assignment is atomic and private', () => {
  for (const actor of [1, 2, 30, 32, 34])
    assert.throws(
      () => sql(asUser(actor, `SELECT public.decide_panitia_request('${id(40)}',0,true,'')`)),
      /Permission denied/,
    );
  sql(asUser(31, `SELECT public.decide_panitia_request('${id(40)}',0,true,'Siap')`));
  assert.throws(
    () => sql(asUser(31, `SELECT public.decide_panitia_request('${id(40)}',0,false,'Duplikat')`)),
    /Data berubah/,
  );
  assert.throws(
    () =>
      sql(
        asUser(
          30,
          `SELECT public.set_panitia_assignments('${id(40)}',1,ARRAY['${id(32)}']::uuid[],'Ambil anggota')`,
        ),
      ),
    /Permission denied/,
  );
  assert.throws(
    () =>
      sql(
        asUser(
          31,
          `SELECT public.set_panitia_assignments('${id(40)}',1,ARRAY['${id(35)}']::uuid[],'Salah divisi')`,
        ),
      ),
    /Anggota harus/,
  );
  assert.throws(
    () =>
      sql(
        asUser(
          31,
          `SELECT public.set_panitia_assignments('${id(40)}',1,ARRAY['${id(32)}','${id(32)}']::uuid[],'Duplikat')`,
        ),
      ),
    /duplikat/,
  );
  sql(
    asUser(
      31,
      `SELECT public.set_panitia_assignments('${id(40)}',1,ARRAY['${id(32)}']::uuid[],'Tahap pertama')`,
    ),
  );
  assert.equal(
    sql(`SELECT status FROM public.panitia_requests WHERE id='${id(40)}'`),
    'partially_assigned',
  );
  sql(
    asUser(
      31,
      `SELECT public.set_panitia_assignments('${id(40)}',2,ARRAY['${id(32)}','${id(33)}']::uuid[],'Lengkap')`,
    ),
  );
  assert.equal(sql(`SELECT status FROM public.panitia_requests WHERE id='${id(40)}'`), 'assigned');
  assert.equal(
    sql(asUser(32, `SELECT count(*) FROM public.panitia_assignments WHERE request_id='${id(40)}'`))
      .split('\n')
      .at(-1),
    '1',
  );
  assert.equal(
    sql(asUser(32, `SELECT count(*) FROM public.panitia_history WHERE request_id='${id(40)}'`))
      .split('\n')
      .at(-1),
    '0',
  );
  assert.equal(
    sql(asUser(35, `SELECT count(*) FROM public.panitia_requests WHERE id='${id(40)}'`))
      .split('\n')
      .at(-1),
    '0',
  );
  assert.equal(
    sql(asUser(30, `SELECT count(*) FROM public.panitia_assignments WHERE request_id='${id(40)}'`))
      .split('\n')
      .at(-1),
    '2',
  );
  assert.equal(sql(`SELECT count(*) FROM public.pengumuman_kehadiran`), '0');
  assert.throws(
    () => sql(asUser(31, `DELETE FROM public.panitia_history WHERE request_id='${id(40)}'`)),
    /permission denied/,
  );
  sql(
    `CREATE FUNCTION public.reject_panitia_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit failed'; END; $$; CREATE TRIGGER reject_panitia BEFORE INSERT ON public.panitia_history FOR EACH ROW EXECUTE FUNCTION public.reject_panitia_audit();`,
  );
  try {
    assert.throws(
      () =>
        sql(
          asUser(
            31,
            `SELECT public.set_panitia_assignments('${id(40)}',3,ARRAY[]::uuid[],'Dilepas')`,
          ),
        ),
      /Audit failed/,
    );
  } finally {
    sql(
      'DROP TRIGGER reject_panitia ON public.panitia_history; DROP FUNCTION public.reject_panitia_audit();',
    );
  }
  assert.equal(
    sql(`SELECT count(*) FROM public.panitia_assignments WHERE request_id='${id(40)}'`),
    '2',
  );
  sql(
    asUser(
      31,
      `SELECT public.set_panitia_assignments('${id(40)}',3,ARRAY['${id(33)}']::uuid[],'Satu berhalangan')`,
    ),
  );
  assert.equal(
    sql(
      `SELECT removed->0->>'id' FROM public.panitia_history WHERE request_id='${id(40)}' AND reason='Satu berhalangan'`,
    ),
    id(32),
  );
  sql(
    `UPDATE public.panitia_requests SET deadline_respons=now()-interval '3 hours',mulai_at=now()-interval '2 hours',selesai_at=now()-interval '1 hour' WHERE id='${id(40)}'`,
  );
  assert.throws(
    () =>
      sql(
        asUser(
          31,
          `SELECT public.set_panitia_assignments('${id(40)}',4,ARRAY[]::uuid[],'Terlambat')`,
        ),
      ),
    /sudah dimulai/,
  );
});
test('content management denies unplaced users and nonbranding kabid, records audit and cancellation', () => {
  const content = JSON.stringify({
    judul: 'Kegiatan',
    kategori: 'Umum',
    target: 'Semua',
    isi: 'Isi',
  });
  for (const actor of [2, 3, 4, 30, 35])
    assert.throws(
      () => sql(asUser(actor, `SELECT public.save_portal_pengumuman('${id(50)}',-1,'${content}')`)),
      /Permission denied/,
    );
  sql(asUser(32, `SELECT public.save_portal_pengumuman('${id(50)}',-1,'${content}')`));
  sql(asUser(1, `SELECT public.save_portal_pengumuman('${id(50)}',0,'${content}')`));
  sql(
    asUser(
      35,
      `INSERT INTO public.pengumuman_kehadiran(pengumuman_id,user_id,confirmed_at,is_late) VALUES ('${id(50)}','${id(35)}','1900-01-01',true)`,
    ),
  );
  assert.equal(
    sql(
      `SELECT confirmed_at > '2026-01-01' AND NOT is_late FROM public.pengumuman_kehadiran WHERE pengumuman_id='${id(50)}'`,
    ),
    't',
  );
  sql(asUser(32, `SELECT public.cancel_portal_pengumuman('${id(50)}',1,'Hujan')`));
  assert.throws(
    () =>
      sql(
        asUser(
          4,
          `INSERT INTO public.pengumuman_kehadiran(pengumuman_id,user_id) VALUES ('${id(50)}','${id(4)}')`,
        ),
      ),
    /sudah ditutup/,
  );
  assert.equal(sql(`SELECT count(*) FROM public.content_history WHERE entity_id='${id(50)}'`), '3');
  assert.equal(
    sql(`SELECT count(*) FROM public.pengumuman_kehadiran WHERE pengumuman_id='${id(50)}'`),
    '1',
  );
  const late = JSON.stringify({
    judul: 'Kegiatan terlambat',
    kategori: 'Umum',
    target: 'Semua',
    isi: 'Isi',
    deadline_konfirmasi: new Date(Date.now() - 3600000).toISOString(),
    mulai_at: new Date(Date.now() + 3600000).toISOString(),
    selesai_at: new Date(Date.now() + 7200000).toISOString(),
  });
  sql(asUser(32, `SELECT public.save_portal_pengumuman('${id(51)}',-1,'${late}')`));
  sql(
    asUser(
      35,
      `INSERT INTO public.pengumuman_kehadiran(pengumuman_id,user_id) VALUES ('${id(51)}','${id(35)}')`,
    ),
  );
  assert.equal(
    sql(`SELECT is_late FROM public.pengumuman_kehadiran WHERE pengumuman_id='${id(51)}'`),
    't',
  );
  sql(
    `UPDATE public.pengumuman SET deadline_konfirmasi=now()-interval '3 hours',mulai_at=now()-interval '2 hours',selesai_at=now()-interval '1 hour' WHERE id='${id(51)}'`,
  );
  assert.throws(
    () =>
      sql(
        asUser(
          4,
          `INSERT INTO public.pengumuman_kehadiran(pengumuman_id,user_id) VALUES ('${id(51)}','${id(4)}')`,
        ),
      ),
    /sudah ditutup/,
  );
});
test('media catalog preserves 12 resources, restricts links, archives and restores without deletion', () => {
  sql(readFileSync('supabase/migrations/202611070002_media_catalog.sql', 'utf8'));
  sql(readFileSync('supabase/migrations/202611070002_media_catalog.sql', 'utf8'));
  assert.equal(sql('SELECT count(*) FROM public.media_resources'), '12');
  assert.equal(
    sql('SELECT count(*) FROM public.media_resources WHERE created_at IS NOT NULL'),
    '0',
  );
  const input = (url: string) =>
    JSON.stringify({ jenis: 'modul', judul: 'Baru', deskripsi: 'Materi', url });
  for (const actor of [2, 3, 4, 30, 35])
    assert.throws(
      () =>
        sql(
          asUser(
            actor,
            `SELECT public.save_portal_media('${id(60)}',-1,'${input('https://drive.google.com/file/d/abc/view')}')`,
          ),
        ),
      /Permission denied/,
    );
  for (const url of [
    'javascript:alert(1)',
    'https://evil.org/file/d/x',
    'https://drive.google.com/drive/folders/abc',
    'https://drive.google.com@evil.org/file/d/a',
    'https://drive.google.com:8080/file/d/a',
  ])
    assert.throws(
      () => sql(asUser(32, `SELECT public.save_portal_media('${id(60)}',-1,'${input(url)}')`)),
      /Google Drive/,
    );
  sql(
    asUser(
      32,
      `SELECT public.save_portal_media('${id(60)}',-1,'${input('https://drive.google.com/file/d/abc/view')}')`,
    ),
  );
  sql(asUser(1, `SELECT public.archive_portal_media('${id(60)}',0,true)`));
  assert.equal(
    sql(asUser(35, `SELECT count(*) FROM public.media_resources WHERE id='${id(60)}'`))
      .split('\n')
      .at(-1),
    '0',
  );
  sql(asUser(32, `SELECT public.archive_portal_media('${id(60)}',1,false)`));
  assert.equal(
    sql(asUser(35, `SELECT count(*) FROM public.media_resources WHERE id='${id(60)}'`))
      .split('\n')
      .at(-1),
    '1',
  );
  assert.equal(sql(`SELECT count(*) FROM public.content_history WHERE entity_id='${id(60)}'`), '3');
});

test('concurrent target decisions commit once and overdue requests remain processable before start', async () => {
  sql(asUser(30, `SELECT public.create_panitia_request('${id(41)}','${requestValues()}')`));
  sql(
    `UPDATE public.panitia_requests SET deadline_respons=now()-interval '1 hour' WHERE id='${id(41)}'`,
  );
  const call = () =>
    new Promise<boolean>((resolve, reject) => {
      const process = spawn('psql', args, { stdio: ['pipe', 'ignore', 'pipe'] });
      process.on('error', reject);
      process.on('close', (code) => resolve(code === 0));
      process.stdin.end(
        asUser(
          31,
          `SELECT public.decide_panitia_request('${id(41)}',0,true,'Siap meski terlambat')`,
        ),
      );
    });
  const results = await Promise.all([call(), call(), call()]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(sql(`SELECT version FROM public.panitia_requests WHERE id='${id(41)}'`), '1');
  assert.equal(
    sql(`SELECT count(*) FROM public.panitia_history WHERE request_id='${id(41)}'`),
    '2',
  );
  sql(asUser(30, `SELECT public.create_panitia_request('${id(42)}','${requestValues()}')`));
  assert.throws(
    () => sql(asUser(31, `SELECT public.decide_panitia_request('${id(42)}',0,false,'')`)),
    /Alasan/,
  );
  sql(
    asUser(
      31,
      `SELECT public.decide_panitia_request('${id(42)}',0,false,'Anggota tidak tersedia')`,
    ),
  );
  assert.throws(
    () =>
      sql(
        asUser(
          31,
          `SELECT public.set_panitia_assignments('${id(42)}',1,ARRAY['${id(32)}']::uuid[],'Mencoba')`,
        ),
      ),
    /Data berubah/,
  );
});
test('current roles and placements govern panitia after account reassignment', () => {
  sql(`UPDATE public.profiles SET level='staff',divisi_id='reguler' WHERE id='${id(30)}'`);
  assert.equal(
    sql(asUser(30, `SELECT count(*) FROM public.panitia_assignments WHERE request_id='${id(40)}'`))
      .split('\n')
      .at(-1),
    '0',
  );
  assert.equal(
    sql(asUser(30, `SELECT count(*) FROM public.panitia_history WHERE request_id='${id(40)}'`))
      .split('\n')
      .at(-1),
    '0',
  );
  sql(`UPDATE public.profiles SET level='kadiv' WHERE id='${id(30)}'`);
  sql(`UPDATE public.profiles SET divisi_id='video' WHERE id='${id(31)}'`);
  assert.throws(
    () =>
      sql(
        asUser(
          31,
          `SELECT public.set_panitia_assignments('${id(41)}',1,ARRAY['${id(32)}']::uuid[],'Divisi berubah')`,
        ),
      ),
    /Permission denied/,
  );
  sql(`UPDATE public.profiles SET divisi_id='design' WHERE id='${id(31)}'`);
  sql(`UPDATE public.profiles SET bidang_id='internal',divisi_id='duta' WHERE id='${id(32)}'`);
  assert.throws(
    () =>
      sql(
        asUser(
          31,
          `SELECT public.set_panitia_assignments('${id(41)}',1,ARRAY['${id(32)}']::uuid[],'Anggota pindah divisi')`,
        ),
      ),
    /Anggota harus/,
  );
  sql(`UPDATE public.profiles SET bidang_id='branding',divisi_id='design' WHERE id='${id(32)}'`);
});

test('new feature tables and functions deny anonymous writes; announcements cannot be truncated by users', () => {
  assert.throws(
    () => sql(`SET ROLE anon; SELECT public.can_manage_content()`),
    /permission denied/,
  );
  assert.throws(
    () => sql(`SET ROLE anon; SELECT * FROM public.panitia_requests`),
    /permission denied/,
  );
  assert.throws(() => sql(asUser(32, 'TRUNCATE public.pengumuman CASCADE')), /permission denied/);
  assert.throws(() => sql(asUser(32, 'TRUNCATE public.pengumuman_kehadiran')), /permission denied/);
  assert.equal(
    sql(
      "SELECT count(*) FROM pg_catalog.pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='profiles'",
    ),
    '1',
  );
});
