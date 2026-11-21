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

const financeInput = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    proker: 'Kegiatan anggaran',
    nominal: 25000,
    keterangan: '',
    bank: 'BCA',
    rekening: '123',
    pagu_anggaran_id: id(90),
    ...extra,
  });
const cashInput = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    deskripsi: 'Kas manual',
    jenis: 'Keluar',
    nominal: 10000,
    kategori: 'Operasional',
    sumberDana: 'Kas',
    pagu_anggaran_id: id(90),
    ...extra,
  });
const concurrentSql = (statement: string) =>
  new Promise<boolean>((resolve, reject) => {
    const child = spawn('psql', args, { stdio: ['pipe', 'ignore', 'pipe'] });
    child.on('error', reject);
    child.on('close', (code) => resolve(code === 0));
    child.stdin.end(statement);
  });

test('finance migrations preserve historical rows, revoke truncate and direct insert, and publish budgets', () => {
  const before = sql('SELECT row_to_json(r) FROM public.reimburse r ORDER BY id');
  const legacyBudget = sql('SELECT row_to_json(b) FROM public.pagu_anggaran b ORDER BY id');
  for (const file of [
    '202611080001_revoke_truncate.sql',
    '202611080002_finance_budget.sql',
    '202611080003_finance_rpc_only.sql',
  ]) {
    sql(readFileSync(`supabase/migrations/${file}`, 'utf8'));
    sql(readFileSync(`supabase/migrations/${file}`, 'utf8'));
  }
  assert.equal(
    sql("SELECT (to_jsonb(r) - 'pagu_anggaran_id')::json FROM public.reimburse r ORDER BY id")
      .split('\n')
      .map((line) => JSON.stringify(JSON.parse(line))).length,
    before.split('\n').length,
  );
  const prior = before.split('\n').map((line) => JSON.parse(line));
  const after = sql('SELECT row_to_json(r) FROM public.reimburse r ORDER BY id')
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.deepEqual(
    after.map(({ pagu_anggaran_id, ...row }) => {
      assert.equal(pagu_anggaran_id, null);
      return row;
    }),
    prior,
  );
  assert.equal(sql('SELECT row_to_json(b) FROM public.pagu_anggaran b ORDER BY id'), legacyBudget);
  for (const table of [
    'profiles',
    'surat',
    'surat_approval',
    'reimburse',
    'reimburse_approval',
    'kas_mutasi',
    'pagu_anggaran',
    'tiket_info',
  ]) {
    for (const role of ['anon', 'authenticated']) {
      assert.equal(
        sql(`SELECT has_table_privilege('${role}', 'public.${table}', 'TRUNCATE')`),
        'f',
      );
      assert.throws(
        () => sql(`SET ROLE ${role}; TRUNCATE public.${table} CASCADE`),
        /permission denied/,
      );
    }
  }
  assert.throws(
    () =>
      sql(
        asUser(
          4,
          "INSERT INTO public.reimburse(proker,pemohon_nama,divisi,nominal,bank,rekening) VALUES ('x','x','x',1,'x','x')",
        ),
      ),
    /permission denied/,
  );
  assert.throws(
    () =>
      sql(
        asUser(
          1,
          "INSERT INTO public.kas_mutasi(deskripsi,jenis,nominal,kategori,sumber_dana,dicatat_oleh_nama) VALUES ('x','Masuk',1,'x','x','x')",
        ),
      ),
    /permission denied/,
  );
  assert.equal(
    sql(
      "SELECT count(*) FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='pagu_anggaran'",
    ),
    '1',
  );
  sql(
    `INSERT INTO public.pagu_anggaran(id,bidang,pagu,terpakai,tahun_anggaran) VALUES ('${id(90)}','Pos Uji',10000,7000,extract(year FROM now() AT TIME ZONE 'Asia/Jakarta')), ('${id(91)}','Pos Uji',10000,0,2000)`,
  );
  assert.equal(sql(asUser(4, 'SELECT count(*) FROM public.pagu_anggaran')).split('\n').at(-1), '0');
  assert.equal(
    sql(asUser(4, `SELECT count(*) FROM public.list_portal_budgets() WHERE id='${id(90)}'`))
      .split('\n')
      .at(-1),
    '1',
  );
  assert.throws(
    () => sql('SET ROLE anon; SELECT public.list_portal_budgets()'),
    /permission denied/,
  );
});

test('creation retries, concurrency, changed payload and owners use one immutable submission', async () => {
  const statement = asUser(
    4,
    `SELECT public.create_portal_reimburse('${id(100)}','${financeInput()}')`,
  );
  assert.deepEqual(
    await Promise.all([
      concurrentSql(statement),
      concurrentSql(statement),
      concurrentSql(statement),
    ]),
    [true, true, true],
  );
  sql(statement); // first response may have been lost after commit
  assert.equal(sql(`SELECT count(*) FROM public.reimburse WHERE id='${id(100)}'`), '1');
  assert.throws(
    () =>
      sql(
        asUser(
          4,
          `SELECT public.create_portal_reimburse('${id(100)}','${financeInput({ nominal: 1 })}')`,
        ),
      ),
    /Pengajuan berubah/,
  );
  assert.throws(
    () => sql(asUser(3, `SELECT public.create_portal_reimburse('${id(100)}','${financeInput()}')`)),
    /Pengajuan berubah/,
  );
  for (const actor of [2, 3])
    assert.equal(
      sql(asUser(actor, `SELECT count(*) FROM public.reimburse WHERE id='${id(100)}'`))
        .split('\n')
        .at(-1),
      '0',
    );
  assert.equal(
    sql(asUser(4, `SELECT count(*) FROM public.reimburse WHERE id='${id(100)}'`))
      .split('\n')
      .at(-1),
    '1',
  );
  sql(`UPDATE public.profiles SET nama_lengkap='Nama berubah' WHERE id='${id(4)}'`);
  sql(statement);
  sql(asUser(1, `SELECT public.disburse_portal_reimburse('${id(100)}')`));
  sql(`UPDATE public.pagu_anggaran SET tahun_anggaran=1999 WHERE id='${id(90)}'`);
  sql(statement); // retry still matches after payment and year rollover
  assert.throws(
    () => sql(asUser(4, `SELECT public.create_portal_reimburse('${id(101)}','${financeInput()}')`)),
    /Pos tahun berjalan/,
  );
  sql(
    `UPDATE public.pagu_anggaran SET tahun_anggaran=extract(year FROM now() AT TIME ZONE 'Asia/Jakarta') WHERE id='${id(90)}'`,
  );
  const cash = asUser(1, `SELECT public.create_portal_mutasi('${id(110)}','${cashInput()}')`);
  assert.deepEqual(
    await Promise.all([concurrentSql(cash), concurrentSql(cash), concurrentSql(cash)]),
    [true, true, true],
  );
  sql(cash);
  assert.equal(sql(`SELECT count(*) FROM public.kas_mutasi WHERE id='${id(110)}'`), '1');
  assert.throws(
    () =>
      sql(
        asUser(
          1,
          `SELECT public.create_portal_mutasi('${id(110)}','${cashInput({ nominal: 20000 })}')`,
        ),
      ),
    /Pengajuan berubah/,
  );
  assert.throws(
    () => sql(asUser(4, `SELECT public.create_portal_mutasi('${id(111)}','${cashInput()}')`)),
    /Permission denied/,
  );
  sql(
    asUser(
      1,
      `SELECT public.create_portal_mutasi('${id(112)}','${cashInput({ jenis: 'Masuk', pagu_anggaran_id: null })}')`,
    ),
  );
  for (const input of [
    cashInput({ pagu_anggaran_id: null }),
    cashInput({ jenis: 'Masuk' }),
    cashInput({ nominal: 1.5 }),
    cashInput({ nominal: null }),
  ])
    assert.throws(
      () => sql(asUser(1, `SELECT public.create_portal_mutasi('${id(113)}','${input}')`)),
      /Invalid/,
    );
});

test('reservations, paid ledger and decisions remain atomic and over-budget claims are accepted', async () => {
  for (const n of [120, 121, 122, 123])
    sql(asUser(4, `SELECT public.create_portal_reimburse('${id(n)}','${financeInput()}')`));
  const reserved = () =>
    sql(
      `SELECT coalesce(sum(nominal),0) FROM public.reimburse WHERE pagu_anggaran_id='${id(90)}' AND status='Menunggu Approval Bendahara'`,
    );
  assert.equal(reserved(), '100000');
  assert.throws(
    () =>
      sql(
        asUser(3, `SELECT public.decide_portal_reimburse('${id(120)}','cancel','Bukan pemilik')`),
      ),
    /Permission denied/,
  );
  assert.throws(
    () =>
      sql(asUser(4, `SELECT public.decide_portal_reimburse('${id(120)}','reject','Bukan inti')`)),
    /Permission denied/,
  );
  assert.throws(
    () => sql(asUser(4, `SELECT public.decide_portal_reimburse('${id(120)}','cancel',' ')`)),
    /Alasan/,
  );
  sql(asUser(4, `SELECT public.decide_portal_reimburse('${id(120)}','cancel','Kegiatan batal')`));
  sql(asUser(1, `SELECT public.decide_portal_reimburse('${id(121)}','reject','Bukti kurang')`));
  assert.equal(reserved(), '50000');
  sql(
    `CREATE FUNCTION public.reject_finance_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit failure'; END; $$; CREATE TRIGGER reject_finance BEFORE INSERT ON public.reimburse_approval FOR EACH ROW EXECUTE FUNCTION public.reject_finance_audit()`,
  );
  try {
    assert.throws(
      () =>
        sql(
          asUser(1, `SELECT public.decide_portal_reimburse('${id(122)}','reject','Uji rollback')`),
        ),
      /Audit failure/,
    );
    assert.throws(
      () => sql(asUser(1, `SELECT public.disburse_portal_reimburse('${id(122)}')`)),
      /Audit failure/,
    );
    assert.equal(reserved(), '50000');
    assert.equal(
      sql(`SELECT count(*) FROM public.kas_mutasi WHERE reimburse_id='${id(122)}'`),
      '0',
    );
  } finally {
    sql(
      'DROP TRIGGER reject_finance ON public.reimburse_approval; DROP FUNCTION public.reject_finance_audit()',
    );
  }
  const results = await Promise.all([
    concurrentSql(asUser(1, `SELECT public.disburse_portal_reimburse('${id(122)}')`)),
    concurrentSql(
      asUser(1, `SELECT public.decide_portal_reimburse('${id(122)}','reject','Ditolak')`),
    ),
    concurrentSql(
      asUser(4, `SELECT public.decide_portal_reimburse('${id(122)}','cancel','Dibatalkan')`),
    ),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(
    sql(`SELECT count(*) FROM public.reimburse_approval WHERE reimburse_id='${id(122)}'`),
    '1',
  );
  assert.equal(reserved(), '25000');
  // A prior-year claim retains its allocation; cash uses the actual server date.
  sql(
    `UPDATE public.reimburse SET pagu_anggaran_id='${id(91)}',tanggal='2000-12-31',created_at='2000-12-31T12:00:00Z' WHERE id='${id(123)}'`,
  );
  sql(asUser(1, `SELECT public.disburse_portal_reimburse('${id(123)}')`));
  assert.equal(
    sql(
      `SELECT pagu_anggaran_id='${id(91)}' AND tgl=(now() AT TIME ZONE 'Asia/Jakarta')::date FROM public.kas_mutasi WHERE reimburse_id='${id(123)}'`,
    ),
    't',
  );
  assert.equal(reserved(), '0');
  assert.equal(sql(`SELECT terpakai FROM public.pagu_anggaran WHERE id='${id(90)}'`), '7000');
  assert.throws(
    () => sql(asUser(1, `SELECT public.disburse_portal_reimburse('${id(120)}')`)),
    /Invalid claim status/,
  );
});

test('December submission paid in January keeps original budget, cash date and retry identity', () => {
  const createDefinition = sql(
    "SELECT pg_get_functiondef('public.create_portal_reimburse(uuid,jsonb)'::regprocedure)",
  );
  const payDefinition = sql(
    "SELECT pg_get_functiondef('public.disburse_portal_reimburse(uuid)'::regprocedure)",
  );
  const cashDefinition = sql(
    "SELECT pg_get_functiondef('public.create_portal_mutasi(uuid,jsonb)'::regprocedure)",
  );
  const withClock = (definition: string, instant: string) =>
    definition.replaceAll('now()', `timestamptz '${instant}'`);
  sql(
    `INSERT INTO public.pagu_anggaran(id,bidang,pagu,tahun_anggaran) VALUES ('${id(150)}','Desember',10000,2026)`,
  );
  const input = financeInput({ pagu_anggaran_id: id(150) });
  const cash = cashInput({ pagu_anggaran_id: id(150) });
  try {
    // Override only the clock in temporary test-cluster functions, never the live database.
    sql(withClock(createDefinition, '2026-12-31T16:59:59Z'));
    sql(withClock(cashDefinition, '2026-12-31T16:59:59Z'));
    sql(asUser(4, `SELECT public.create_portal_reimburse('${id(151)}','${input}')`));
    sql(asUser(1, `SELECT public.create_portal_mutasi('${id(152)}','${cash}')`));
    sql(withClock(payDefinition, '2026-12-31T17:00:01Z'));
    sql(withClock(createDefinition, '2026-12-31T17:00:01Z'));
    sql(withClock(cashDefinition, '2026-12-31T17:00:01Z'));
    sql(asUser(1, `SELECT public.disburse_portal_reimburse('${id(151)}')`));
    sql(asUser(4, `SELECT public.create_portal_reimburse('${id(151)}','${input}')`));
    sql(asUser(1, `SELECT public.create_portal_mutasi('${id(152)}','${cash}')`));
    assert.equal(sql(`SELECT tanggal FROM public.reimburse WHERE id='${id(151)}'`), '2026-12-31');
    assert.equal(
      sql(
        `SELECT pagu_anggaran_id='${id(150)}' AND tgl='2027-01-01'::date FROM public.kas_mutasi WHERE reimburse_id='${id(151)}'`,
      ),
      't',
    );
    assert.equal(sql(`SELECT tgl FROM public.kas_mutasi WHERE id='${id(152)}'`), '2026-12-31');
    assert.throws(
      () => sql(asUser(4, `SELECT public.create_portal_reimburse('${id(153)}','${input}')`)),
      /Pos tahun berjalan/,
    );
  } finally {
    sql(createDefinition);
    sql(payDefinition);
    sql(cashDefinition);
  }
});

test('public content RLS, publication, validation and concurrent edits preserve boundaries', async () => {
  sql(readFileSync('supabase/migrations/202611100001_public_content.sql', 'utf8'));
  for (const value of [501, 502, 503]) {
    sql(`INSERT INTO auth.users(id,email) VALUES ('${id(value)}','public${value}@example.org');
      UPDATE public.profiles SET level='${value === 501 ? 'inti' : 'staff'}', bidang_id=${value === 502 ? "'branding'" : 'NULL'}, divisi_id=NULL WHERE id='${id(value)}';`);
  }
  const base = {
    jenis: 'berita',
    judul: 'Kabar publik',
    ringkasan: 'Ringkasan',
    isi: 'Isi',
    status: 'draft',
    mulai_at: null,
    selesai_at: null,
    lokasi: '',
  };
  const save = (target: number, version: number, patch: Record<string, unknown> = {}) =>
    `SELECT public.save_portal_public_content('${id(target)}',${version},'${JSON.stringify({ ...base, ...patch })}')`;
  const asAnon = (statement: string) => `SET ROLE anon; ${statement}`;
  sql(asUser(501, save(510, -1)));
  assert.equal(sql(asAnon('SELECT count(*) FROM public.public_content')).split('\n').at(-1), '0');
  assert.equal(
    sql(asUser(503, 'SELECT count(*) FROM public.public_content')).split('\n').at(-1),
    '0',
  );
  assert.equal(
    sql(asUser(502, 'SELECT count(*) FROM public.public_content')).split('\n').at(-1),
    '1',
  );
  assert.throws(() => sql(asAnon(save(511, -1))), /permission denied/i);
  assert.throws(() => sql(asUser(503, save(511, -1))), /Permission denied/);
  for (const role of ['anon', 'authenticated']) {
    assert.equal(
      sql(
        `SELECT has_table_privilege('${role}','public.public_content','INSERT') OR has_table_privilege('${role}','public.public_content','UPDATE') OR has_table_privilege('${role}','public.public_content','DELETE') OR has_table_privilege('${role}','public.public_content','TRUNCATE')`,
      ),
      'f',
    );
  }
  assert.throws(
    () => sql(asUser(501, "UPDATE public.public_content SET status='published'")),
    /permission denied/i,
  );
  sql(asUser(502, save(510, 0, { status: 'published' })));
  assert.equal(sql(asAnon('SELECT count(*) FROM public.public_content')).split('\n').at(-1), '1');
  assert.equal(
    sql(asUser(503, 'SELECT count(*) FROM public.public_content')).split('\n').at(-1),
    '1',
  );
  assert.equal(
    sql(
      `SELECT published_at IS NOT NULL AND version=1 FROM public.public_content WHERE id='${id(510)}'`,
    ),
    't',
  );
  assert.throws(() => sql(asUser(501, save(510, 0))), /Data berubah/);
  sql(asUser(501, save(510, 1)));
  assert.equal(sql(asAnon('SELECT count(*) FROM public.public_content')).split('\n').at(-1), '0');
  assert.equal(
    sql(`SELECT published_at IS NULL FROM public.public_content WHERE id='${id(510)}'`),
    't',
  );
  for (const patch of [
    { jenis: 'agenda' },
    { judul: ' ' },
    { ringkasan: 'x'.repeat(501) },
    { status: 'scheduled' },
    { judul: { invalid: true } },
    { extra: 'unexpected' },
    { jenis: 'agenda', mulai_at: 'infinity', lokasi: 'Depok' },
    {
      jenis: 'agenda',
      mulai_at: '2026-11-11T09:00:00+07:00',
      selesai_at: '2026-11-11T08:00:00+07:00',
      lokasi: 'Depok',
    },
  ])
    assert.throws(() => sql(asUser(501, save(511, -1, patch))));
  sql(
    asUser(
      502,
      save(511, -1, {
        jenis: 'agenda',
        mulai_at: '2026-11-11T09:00:00+07:00',
        lokasi: 'Depok',
        status: 'published',
      }),
    ),
  );
  assert.equal(
    sql(
      `SELECT mulai_at='2026-11-11T02:00:00Z'::timestamptz FROM public.public_content WHERE id='${id(511)}'`,
    ),
    't',
  );
  const competing = await Promise.all([
    concurrentSql(asUser(501, save(510, 2, { status: 'published', judul: 'Edit pertama' }))),
    concurrentSql(asUser(502, save(510, 2, { status: 'published', judul: 'Edit kedua' }))),
  ]);
  assert.equal(competing.filter(Boolean).length, 1);
  assert.equal(sql(`SELECT version FROM public.public_content WHERE id='${id(510)}'`), '3');
});

test('Gmail signup, guest isolation, admin access and audited role changes', async () => {
  // Auth's confirmation timestamp is managed by Supabase, not exposed through public profiles.
  sql('ALTER TABLE auth.users ADD COLUMN email_confirmed_at timestamptz');
  sql(
    `INSERT INTO auth.users(id,email) VALUES('${id(910)}','legacy@genredepok.or.id'); UPDATE public.profiles SET bidang_id='branding',divisi_id='design' WHERE id='${id(910)}'`,
  );
  sql(readFileSync('supabase/migrations/202611130001_guest_accounts.sql', 'utf8'));
  assert.equal(sql('SET ROLE anon; SELECT public.portal_signup_ready()').split('\n').at(-1), 't');
  for (const value of [900, 901, 902, 903, 904]) {
    sql(`INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
      VALUES('${id(value)}','auth${value}@gmail.com',${value === 902 ? 'NULL' : 'now()'},'{"nama_lengkap":"Auth Uji","level":"admin","bidang_id":"branding"}')`);
    assert.equal(sql(`SELECT level FROM public.profiles WHERE id='${id(value)}'`), 'guest');
  }
  assert.throws(
    () => sql(`INSERT INTO auth.users(id,email) VALUES('${id(909)}','fake@example.org')`),
    /@gmail.com/,
  );
  assert.equal(sql(`SELECT count(*) FROM auth.users WHERE id='${id(909)}'`), '0');
  sql(`UPDATE public.profiles SET level='admin',jabatan='Administrator' WHERE id='${id(900)}';
    UPDATE public.profiles SET level='inti',jabatan='Ketua' WHERE id='${id(903)}';
    UPDATE public.profiles SET level='staff',bidang_id='branding',divisi_id='design' WHERE id='${id(904)}'`);
  const result = (actor: number, statement: string) =>
    sql(asUser(actor, statement)).split('\n').at(-1);
  for (const table of [
    'surat',
    'surat_approval',
    'reimburse',
    'reimburse_approval',
    'kas_mutasi',
    'pagu_anggaran',
    'pengumuman',
    'pengumuman_kehadiran',
    'tiket_info',
    'bidang',
    'divisi',
    'panitia_requests',
    'panitia_assignments',
    'panitia_history',
    'media_resources',
    'content_history',
  ]) {
    assert.equal(
      result(901, `SELECT count(*) FROM public.${table}`),
      '0',
      `guest must not read ${table}`,
    );
    assert.equal(
      sql(`SELECT has_table_privilege('authenticated','public.${table}','TRUNCATE')`),
      'f',
    );
  }
  assert.equal(result(901, 'SELECT count(*) FROM public.profiles'), '1');
  assert.equal(result(904, `SELECT count(*) FROM public.profiles WHERE level='guest'`), '0');
  assert.throws(
    () => sql(asUser(901, "SELECT public.create_portal_reimburse(gen_random_uuid(),'{}')")),
    /Permission denied/,
  );
  assert.throws(
    () =>
      sql(
        asUser(901, "SELECT public.decide_portal_reimburse(gen_random_uuid(),'cancel','alasan')"),
      ),
    /Permission denied/,
  );
  assert.equal(result(901, 'SELECT count(*) FROM public.list_portal_budgets()'), '0');
  assert.throws(
    () =>
      sql(
        asUser(
          901,
          `INSERT INTO public.surat(nomor_surat,jenis,perihal,pemohon_id,pemohon_nama,divisi,tujuan) VALUES('DRAFT','Surat Tugas','Guest','${id(901)}','Auth Uji','-','Sekolah')`,
        ),
      ),
    /row-level security/,
  );
  for (const actor of [901, 903, 904]) {
    assert.throws(
      () => sql(asUser(actor, "SELECT public.list_portal_accounts('',0)")),
      /Permission denied/,
    );
    assert.throws(
      () => sql(asUser(actor, `UPDATE public.profiles SET level='admin' WHERE id='${id(actor)}'`)),
      /permission denied/i,
    );
  }
  const access = (target: number, version: number, patch: Record<string, unknown> = {}) =>
    `SELECT public.set_portal_account_access('${id(target)}',${version},'${JSON.stringify({ level: 'staff', jabatan: 'Staff Desain', bidang_id: 'branding', divisi_id: 'design', ...patch })}'::jsonb)`;
  assert.throws(() => sql(asUser(903, access(901, 0))), /Permission denied/);
  assert.throws(() => sql(asUser(900, access(902, 0))), /belum terverifikasi/);
  assert.throws(() => sql(asUser(900, access(901, 0, { level: 'admin' }))), /Role atau jabatan/);
  assert.throws(() => sql(asUser(900, access(900, 0))), /hanya diubah pemilik/);
  assert.throws(() => sql(asUser(900, access(901, 0, { bidang_id: 'internal' }))), /tidak cocok/);
  sql(asUser(900, access(901, 0)));
  assert.equal(result(901, 'SELECT public.is_portal_member()'), 't');
  assert.equal(sql(`SELECT access_version FROM public.profiles WHERE id='${id(901)}'`), '1');
  assert.equal(
    result(900, `SELECT count(*) FROM public.account_access_history WHERE target_id='${id(901)}'`),
    '1',
  );
  assert.equal(result(904, 'SELECT count(*) FROM public.account_access_history'), '0');
  assert.throws(() => sql(asUser(900, access(901, 0))), /Data berubah/);
  // A stale concurrent edit must fail, rather than silently replacing another admin's decision.
  const concurrent = await Promise.all([
    concurrentSql(asUser(900, access(901, 1))),
    concurrentSql(asUser(900, access(901, 1))),
  ]);
  assert.equal(concurrent.filter(Boolean).length, 1);
  // Audit failure must roll back both the role and its version.
  sql(`CREATE FUNCTION public.reject_access_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit failed'; END; $$;
    CREATE TRIGGER reject_access_audit BEFORE INSERT ON public.account_access_history FOR EACH ROW EXECUTE FUNCTION public.reject_access_audit()`);
  assert.throws(
    () => sql(asUser(900, access(901, 2, { level: 'guest', bidang_id: null, divisi_id: null }))),
    /Audit failed/,
  );
  assert.equal(
    sql(`SELECT level || ':' || access_version FROM public.profiles WHERE id='${id(901)}'`),
    'staff:2',
  );
  sql('DROP TRIGGER reject_access_audit ON public.account_access_history');
  sql(asUser(900, access(901, 2, { level: 'guest', bidang_id: null, divisi_id: null })));
  assert.equal(result(901, 'SELECT count(*) FROM public.surat'), '0');
  assert.equal(result(901, 'SELECT public.is_portal_member()'), 'f');
  assert.throws(
    () => sql(asUser(901, "SELECT public.create_panitia_request(gen_random_uuid(),'{}')")),
    /Permission denied/,
  );

  // Dedicated admin inherits finance/approval and content permissions without an organization placement.
  sql(
    `INSERT INTO public.pagu_anggaran(id,bidang,pagu,tahun_anggaran) VALUES('${id(920)}','Auth test',100000,extract(year from now() AT TIME ZONE 'Asia/Jakarta'))`,
  );
  const claim = JSON.stringify({
    proker: 'Auth test',
    nominal: 100,
    keterangan: '',
    bank: 'Bank',
    rekening: '1',
    pagu_anggaran_id: id(920),
  });
  sql(asUser(900, `SELECT public.create_portal_reimburse('${id(921)}','${claim}')`));
  sql(asUser(900, `SELECT public.disburse_portal_reimburse('${id(921)}')`));
  assert.equal(
    result(900, `SELECT count(*) FROM public.kas_mutasi WHERE reimburse_id='${id(921)}'`),
    '1',
  );
  sql(
    `INSERT INTO public.surat(id,nomor_surat,jenis,perihal,pemohon_nama,divisi,tujuan) VALUES('${id(922)}','DRAFT','Surat Tugas','Admin','Auth Uji','-','Sekolah')`,
  );
  sql(asUser(900, `SELECT public.approve_portal_surat('${id(922)}')`));
  assert.equal(
    sql(`SELECT status FROM public.surat WHERE id='${id(922)}'`),
    'Selesai / Terbit (QR ACC)',
  );
  const content = JSON.stringify({
    jenis: 'berita',
    judul: 'Auth published',
    ringkasan: 'Ringkasan',
    isi: 'Isi',
    status: 'published',
    mulai_at: null,
    selesai_at: null,
    lokasi: '',
  });
  sql(asUser(900, `SELECT public.save_portal_public_content('${id(923)}',-1,'${content}')`));
  assert.equal(
    result(901, `SELECT count(*) FROM public.public_content WHERE id='${id(923)}'`),
    '1',
  );
  assert.throws(
    () =>
      sql(asUser(901, `SELECT public.save_portal_public_content('${id(924)}',-1,'${content}')`)),
    /Permission denied/,
  );
  assert.equal(result(901, "SELECT count(*) FROM public.public_content WHERE status='draft'"), '0');

  sql(`UPDATE public.profiles SET level='staff' WHERE level='kadiv' AND divisi_id='design';
    INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${id(905)}','kadiv905@gmail.com',now());
    UPDATE public.profiles SET level='kadiv',bidang_id='branding',divisi_id='design' WHERE id='${id(905)}'`);
  assert.throws(() => sql(asUser(900, access(901, 3, { level: 'kadiv' }))), /duplicate key/);
  const request = JSON.stringify({
    judul: 'Admin panitia',
    deskripsi: 'Tugas',
    divisi_asal_id: 'reguler',
    divisi_tujuan_id: 'design',
    jumlah: 1,
    deadline_respons: '2099-01-01T00:00:00Z',
    mulai_at: '2099-01-02T00:00:00Z',
    selesai_at: '2099-01-03T00:00:00Z',
  });
  sql(asUser(900, `SELECT public.create_panitia_request('${id(925)}','${request}')`));
  sql(asUser(900, `SELECT public.decide_panitia_request('${id(925)}',0,true,'Admin review')`));
  sql(
    asUser(
      900,
      `SELECT public.set_panitia_assignments('${id(925)}',1,ARRAY['${id(904)}']::uuid[],'Admin assignment')`,
    ),
  );
  assert.equal(sql(`SELECT status FROM public.panitia_requests WHERE id='${id(925)}'`), 'assigned');
  const changedOrigin = request.replace('"reguler"', '"kecamatan"');
  assert.throws(
    () => sql(asUser(900, `SELECT public.create_panitia_request('${id(925)}','${changedOrigin}')`)),
    /Pengajuan berubah/,
  );
  // Legacy ownership/assignment does not survive demotion as an authorization grant.
  sql(asUser(900, access(904, 0, { level: 'guest', bidang_id: null, divisi_id: null })));
  assert.equal(result(904, 'SELECT count(*) FROM public.panitia_assignments'), '0');
  assert.equal(result(904, `SELECT public.can_read_panitia('${id(925)}',true)`), 'f');
  assert.throws(
    () => sql(asUser(904, `SELECT public.set_tiket_deadline('${id(1)}',NULL)`)),
    /Permission denied/,
  );
  sql(`UPDATE auth.users SET email='auth901changed@gmail.com' WHERE id='${id(901)}'`);
  assert.equal(
    sql(`SELECT email FROM public.profiles WHERE id='${id(901)}'`),
    'auth901changed@gmail.com',
  );
  assert.throws(
    () => sql(`UPDATE auth.users SET email='fake@example.org' WHERE id='${id(901)}'`),
    /@gmail.com/,
  );
});

test('owner bootstrap and legacy cutover require explicit reviewed accounts and preserve history', () => {
  const bootstrap = readFileSync('supabase/admin/bootstrap_portal_admin.sql', 'utf8');
  assert.throws(() => sql(bootstrap), /Isi UUID/);
  const selected = bootstrap.replace('target uuid := NULL', `target uuid := '${id(902)}'`);
  assert.throws(() => sql(selected), /Gmail terverifikasi/);
  sql(`UPDATE auth.users SET email_confirmed_at=now() WHERE id='${id(902)}'`);
  sql(selected);
  assert.equal(sql(`SELECT level FROM public.profiles WHERE id='${id(902)}'`), 'admin');
  const cutover = readFileSync('supabase/admin/legacy_guest_cutover.sql', 'utf8');
  assert.throws(() => sql(cutover), /masih kosong/);
  const reviewed = cutover.replace(
    "-- INSERT INTO reviewed_legacy_accounts VALUES ('reviewed-uuid-here');",
    `INSERT INTO reviewed_legacy_accounts VALUES ('${id(910)}');`,
  );
  const before = sql(`SELECT row_to_json(p) FROM public.profiles p WHERE id='${id(910)}'`);
  const letters = sql('SELECT count(*) FROM public.surat');
  sql(reviewed);
  assert.equal(
    sql(
      `SELECT level || ':' || coalesce(divisi_id,'none') FROM public.profiles WHERE id='${id(910)}'`,
    ),
    'guest:none',
  );
  assert.deepEqual(
    JSON.parse(
      sql(`SELECT before_profile FROM public.legacy_account_access_snapshot WHERE id='${id(910)}'`),
    ),
    JSON.parse(before),
  );
  assert.equal(sql('SELECT count(*) FROM public.surat'), letters);
  assert.throws(
    () => sql(asUser(900, 'SELECT * FROM public.legacy_account_access_snapshot')),
    /permission denied/i,
  );
  assert.throws(() => sql(reviewed), /belum diturunkan/);
});

const suratPayload = (jenis = 'Surat Tugas') =>
  JSON.stringify({
    jenis,
    perihal: 'Kegiatan surat',
    tujuan: 'Sekolah',
    urgensi: 'Sedang',
    keterangan: 'Rincian kegiatan',
  });
const createLetter = (actor: number, request: number, jenis = 'Surat Tugas') =>
  asUser(actor, `SELECT public.create_portal_surat('${id(request)}','${suratPayload(jenis)}')`);

test('surat migration preserves history and restricts creation and approval by role', () => {
  const oldLetters = sql(
    "SELECT json_agg(json_build_object('id',id,'nomor',nomor_surat,'status',status) ORDER BY id) FROM public.surat",
  );
  sql(readFileSync('supabase/migrations/202611190001_surat_workflow.sql', 'utf8'));
  assert.equal(
    sql(
      "SELECT json_agg(json_build_object('id',id,'nomor',nomor_surat,'status',status) ORDER BY id) FROM public.surat",
    ),
    oldLetters,
  );
  for (const [index, level] of ['inti', 'admin', 'kabid', 'kadiv', 'staff', 'guest'].entries()) {
    const actor = 970 + index;
    sql(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${id(actor)}','surat${actor}@gmail.com',now());
      UPDATE public.profiles SET level='${level}',jabatan='${level}',kelompok='Tim Uji' WHERE id='${id(actor)}'`);
  }
  for (const actor of [973, 974, 975]) {
    assert.throws(() => sql(createLetter(actor, 980)), /Permission denied/);
  }
  sql(createLetter(972, 980));
  assert.equal(
    sql(`SELECT status FROM public.surat WHERE id='${id(980)}'`),
    'Menunggu Persetujuan Inti',
  );
  assert.match(
    sql(`SELECT nomor_surat FROM public.surat WHERE id='${id(980)}'`),
    /^001\/ST\/FG-DPK\/[IVX]+\/\d{4}$/,
  );
  assert.equal(sql(`SELECT count(*) FROM public.surat_approval WHERE surat_id='${id(980)}'`), '0');
  for (const actor of [972, 973, 974, 975]) {
    assert.throws(
      () => sql(asUser(actor, `SELECT public.approve_portal_surat('${id(980)}')`)),
      /Permission denied/,
    );
  }
  for (const actor of [970, 971, 972, 973, 974, 975]) {
    assert.throws(
      () =>
        sql(
          asUser(
            actor,
            `INSERT INTO public.surat(nomor_surat,jenis,perihal,pemohon_nama,divisi,tujuan) VALUES('Fake','Surat Tugas','X','X','X','X')`,
          ),
        ),
      /permission denied/i,
    );
  }
  sql(
    asUser(
      970,
      `SELECT public.approve_portal_surat('${id(980)}'); SELECT public.approve_portal_surat('${id(980)}')`,
    ),
  );
  assert.equal(sql(`SELECT count(*) FROM public.surat_approval WHERE surat_id='${id(980)}'`), '1');
  assert.equal(
    sql(`SELECT actor_name FROM public.surat_approval WHERE surat_id='${id(980)}'`),
    sql(`SELECT nama_lengkap FROM public.profiles WHERE id='${id(970)}'`),
  );
  sql(createLetter(970, 981, 'Surat Undangan'));
  sql(createLetter(971, 982, 'Surat Rekomendasi'));
  assert.match(sql(`SELECT nomor_surat FROM public.surat WHERE id='${id(981)}'`), /^002\/SU\//);
  assert.match(sql(`SELECT nomor_surat FROM public.surat WHERE id='${id(982)}'`), /^003\/SR\//);
  assert.equal(
    sql(
      `SELECT count(*) FROM public.surat WHERE id IN ('${id(981)}','${id(982)}') AND status='Selesai / Disetujui'`,
    ),
    '2',
  );
  assert.equal(
    sql(
      `SELECT count(*) FROM public.surat_approval WHERE surat_id IN ('${id(981)}','${id(982)}') AND step_label LIKE 'ACC otomatis:%'`,
    ),
    '2',
  );
  for (const actor of [970, 971, 972, 973, 974, 975]) {
    for (const table of ['surat_counters', 'surat_drive_connection', 'surat_exports']) {
      assert.throws(
        () => sql(asUser(actor, `SELECT * FROM public.${table}`)),
        /permission denied/i,
      );
    }
  }
});

test('surat retry reuses number, rejects changed input and rolls back counters on audit failure', () => {
  const previous = sql('SELECT sum(terakhir) FROM public.surat_counters');
  sql(createLetter(970, 981, 'Surat Undangan'));
  assert.equal(sql('SELECT sum(terakhir) FROM public.surat_counters'), previous);
  assert.throws(() => sql(createLetter(970, 981)), /Request does not match/);
  assert.throws(() => sql(createLetter(971, 981, 'Surat Undangan')), /Request does not match/);
  const forged = JSON.stringify({ ...JSON.parse(suratPayload()), status: 'Selesai / Disetujui' });
  assert.throws(
    () => sql(asUser(970, `SELECT public.create_portal_surat('${id(983)}','${forged}')`)),
    /Invalid input/,
  );
  sql(`CREATE FUNCTION public.test_surat_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected surat audit failure'; END; $$;
    CREATE TRIGGER test_surat_audit_failure BEFORE INSERT ON public.surat_approval FOR EACH ROW EXECUTE FUNCTION public.test_surat_audit_failure();`);
  try {
    assert.throws(() => sql(createLetter(970, 983)), /Injected surat audit failure/);
  } finally {
    sql(
      'DROP TRIGGER test_surat_audit_failure ON public.surat_approval; DROP FUNCTION public.test_surat_audit_failure()',
    );
  }
  assert.equal(sql(`SELECT count(*) FROM public.surat WHERE id='${id(983)}'`), '0');
  assert.equal(sql('SELECT sum(terakhir) FROM public.surat_counters'), previous);
});

test('concurrent surat creation shares annual sequence and deduplicates repeated requests', async () => {
  const before = Number(sql('SELECT sum(terakhir) FROM public.surat_counters'));
  const call = (request: number) =>
    new Promise<void>((resolve, reject) => {
      const process = spawn('psql', args, { stdio: ['pipe', 'ignore', 'pipe'] });
      let error = '';
      process.stderr.on('data', (data) => {
        error += String(data);
      });
      process.on('error', reject);
      process.on('close', (code) => (code === 0 ? resolve() : reject(new Error(error))));
      process.stdin.end(createLetter(972, request));
    });
  await Promise.all([call(984), call(984), call(985), call(986)]);
  assert.equal(Number(sql('SELECT sum(terakhir) FROM public.surat_counters')), before + 3);
  assert.equal(
    sql(
      `SELECT count(DISTINCT nomor_surat) FROM public.surat WHERE id IN ('${id(984)}','${id(985)}','${id(986)}')`,
    ),
    '3',
  );
});

test('surat annual boundary follows WIB and does not truncate numbers after 999', () => {
  const original = sql(
    "SELECT pg_get_functiondef('public.create_portal_surat(uuid,jsonb)'::regprocedure)",
  );
  for (const [instant, request, expected] of [
    ['2099-12-31T16:59:59Z', 987, '001/ST/FG-DPK/XII/2099'],
    ['2099-12-31T17:00:00Z', 988, '001/ST/FG-DPK/I/2100'],
  ] as const) {
    const frozen = original.replaceAll('now()', `'${instant}'::timestamptz`);
    sql(frozen);
    sql(createLetter(972, request));
    assert.equal(sql(`SELECT nomor_surat FROM public.surat WHERE id='${id(request)}'`), expected);
  }
  sql('UPDATE public.surat_counters SET terakhir=999 WHERE tahun=2100');
  sql(createLetter(972, 989));
  assert.equal(
    sql(`SELECT nomor_surat FROM public.surat WHERE id='${id(989)}'`),
    '1000/ST/FG-DPK/I/2100',
  );
  sql(original);
});

test('Drive configuration and export leases enforce permissions, approval and stale retry handling', () => {
  for (const actor of [970, 972, 973, 974, 975]) {
    assert.throws(
      () =>
        sql(
          asUser(actor, "SELECT public.save_portal_drive_connection('encrypted-test-token-value')"),
        ),
      /Permission denied/,
    );
  }
  for (const actor of [972, 973, 974, 975]) {
    assert.throws(
      () => sql(asUser(actor, 'SELECT public.get_portal_drive_connection()')),
      /Permission denied/,
    );
    assert.throws(
      () => sql(asUser(actor, `SELECT public.claim_portal_surat_export('${id(981)}')`)),
      /Permission denied/,
    );
  }
  sql(
    asUser(
      971,
      "SELECT public.save_portal_drive_connection('encrypted-test-token-value'); SELECT public.save_portal_drive_connection(NULL,'folder_123','Surat')",
    ),
  );
  assert.equal(
    JSON.parse(sql(asUser(970, 'SELECT public.get_portal_drive_connection()')).split('\n').at(-1)!)
      .folder_id,
    'folder_123',
  );
  assert.throws(
    () => sql(asUser(970, `SELECT public.claim_portal_surat_export('${id(984)}')`)),
    /Letter not approved/,
  );
  const claim = JSON.parse(
    sql(asUser(970, `SELECT public.claim_portal_surat_export('${id(981)}')`))
      .split('\n')
      .at(-1)!,
  );
  assert.throws(
    () => sql(asUser(971, `SELECT public.claim_portal_surat_export('${id(981)}')`)),
    /Export in progress/,
  );
  const finish = (token: string, outcome: string, file = 'drive_file_123') =>
    asUser(
      970,
      `SELECT public.finish_portal_surat_export('${id(981)}','${token}','${file}','${outcome}')`,
    );
  sql(finish(claim.claim_id, 'uploading'));
  sql(finish(claim.claim_id, 'failed'));
  assert.equal(sql(`SELECT status FROM public.surat WHERE id='${id(981)}'`), 'Selesai / Disetujui');
  const retry = JSON.parse(
    sql(asUser(971, `SELECT public.claim_portal_surat_export('${id(981)}')`))
      .split('\n')
      .at(-1)!,
  );
  assert.equal(retry.file_id, 'drive_file_123');
  assert.throws(() => sql(finish(claim.claim_id, 'ready')), /Stale export/);
  assert.throws(() => sql(finish(retry.claim_id, 'ready', 'another_id')), /Invalid export/);
  sql(finish(retry.claim_id, 'ready'));
  sql(finish(retry.claim_id, 'failed'));
  assert.equal(sql(`SELECT export_status FROM public.surat WHERE id='${id(981)}'`), 'ready');
  assert.equal(
    sql(`SELECT file_pdf_url FROM public.surat WHERE id='${id(981)}'`),
    'https://drive.google.com/file/d/drive_file_123/view',
  );
  assert.equal(
    sql(asUser(970, `SELECT public.claim_portal_surat_export('${id(981)}') IS NULL`))
      .split('\n')
      .at(-1),
    't',
  );
  const expired = JSON.parse(
    sql(asUser(970, `SELECT public.claim_portal_surat_export('${id(982)}')`))
      .split('\n')
      .at(-1)!,
  );
  sql(
    `UPDATE public.surat_exports SET expires_at=now()-interval '1 second' WHERE surat_id='${id(982)}'`,
  );
  const recovered = JSON.parse(
    sql(asUser(970, `SELECT public.claim_portal_surat_export('${id(982)}')`))
      .split('\n')
      .at(-1)!,
  );
  assert.notEqual(expired.claim_id, recovered.claim_id);
});

test('surat template migration preserves legacy data and validates event fields and retries', () => {
  const snapshot = () =>
    sql(
      'SELECT json_agg(json_build_array(id,nomor_surat,keterangan,status,tanggal,file_pdf_url) ORDER BY id) FROM public.surat',
    );
  const before = snapshot();
  const migration = readFileSync('supabase/migrations/202611190002_surat_template.sql', 'utf8');
  sql(migration);
  sql(migration);
  assert.equal(snapshot(), before);
  assert.equal(
    sql(
      'SELECT count(*) FROM public.surat WHERE tanggal_kegiatan IS NOT NULL OR waktu_kegiatan IS NOT NULL OR tempat_kegiatan IS NOT NULL OR sistem_pelaksanaan IS NOT NULL',
    ),
    '0',
  );
  const input = {
    ...JSON.parse(suratPayload()),
    tanggal_kegiatan: '2026-11-21',
    waktu_kegiatan: '19.00–21.00 WIB',
    tempat_kegiatan: 'Aula Depok',
    sistem_pelaksanaan: '',
  };
  const call = (actor: number, request: number, payload: Record<string, unknown>) =>
    sql(
      asUser(
        actor,
        `SELECT public.create_portal_surat('${id(request)}','${JSON.stringify(payload)}')`,
      ),
    );
  const counter = Number(sql('SELECT sum(terakhir) FROM public.surat_counters'));
  for (const jenis of ['Surat Tugas', 'Surat Undangan']) {
    for (const field of ['tanggal_kegiatan', 'waktu_kegiatan', 'tempat_kegiatan', 'keterangan']) {
      assert.throws(() => call(972, 1100, { ...input, jenis, [field]: '' }), /Invalid input/);
      assert.throws(() => call(972, 1100, { ...input, jenis, [field]: null }), /Invalid input/);
    }
  }
  for (const value of ['2026-02-30', 'not-a-date', '2026-1-1', '2026-11-21T00:00:00Z']) {
    assert.throws(() => call(972, 1100, { ...input, tanggal_kegiatan: value }), /Invalid input/);
  }
  assert.throws(
    () => call(972, 1100, { ...input, waktu_kegiatan: 'x'.repeat(501) }),
    /Invalid input/,
  );
  assert.throws(() => call(972, 1100, { ...input, actor_name: 'Forged' }), /Invalid input/);
  assert.throws(() => sql(createLetter(972, 1100)), /Invalid input/);
  for (const actor of [973, 974, 975]) {
    assert.throws(() => call(actor, 1100, input), /Permission denied/);
  }
  assert.equal(Number(sql('SELECT sum(terakhir) FROM public.surat_counters')), counter);
  call(972, 1100, input);
  const number = sql(`SELECT nomor_surat FROM public.surat WHERE id='${id(1100)}'`);
  call(972, 1100, input);
  assert.equal(sql(`SELECT nomor_surat FROM public.surat WHERE id='${id(1100)}'`), number);
  assert.equal(Number(sql('SELECT sum(terakhir) FROM public.surat_counters')), counter + 1);
  for (const [field, value] of Object.entries({
    tanggal_kegiatan: '2026-11-22',
    waktu_kegiatan: '20.00 WIB',
    tempat_kegiatan: 'Zoom',
    sistem_pelaksanaan: 'Daring',
  })) {
    assert.throws(() => call(972, 1100, { ...input, [field]: value }), /Request does not match/);
  }
  assert.equal(
    sql(
      `SELECT tanggal_kegiatan::text || '|' || waktu_kegiatan || '|' || tempat_kegiatan FROM public.surat WHERE id='${id(1100)}'`,
    ),
    '2026-11-21|19.00–21.00 WIB|Aula Depok',
  );
  assert.equal(
    sql(`SELECT status FROM public.surat WHERE id='${id(1100)}'`),
    'Menunggu Persetujuan Inti',
  );
  sql(asUser(970, `SELECT public.approve_portal_surat('${id(1100)}')`));
  assert.equal(
    sql(`SELECT status FROM public.surat WHERE id='${id(1100)}'`),
    'Selesai / Disetujui',
  );
  for (const [index, jenis] of ['Surat Permohonan', 'Surat Rekomendasi'].entries()) {
    const optional = {
      ...input,
      jenis,
      tanggal_kegiatan: '',
      waktu_kegiatan: '',
      tempat_kegiatan: '',
    };
    call(970 + index, 1101 + index, optional);
    call(970 + index, 1101 + index, optional);
    assert.equal(
      sql(
        `SELECT (tanggal_kegiatan IS NULL AND waktu_kegiatan IS NULL AND tempat_kegiatan IS NULL AND sistem_pelaksanaan IS NULL)::text FROM public.surat WHERE id='${id(1101 + index)}'`,
      ),
      'true',
    );
    assert.equal(
      sql(`SELECT status FROM public.surat WHERE id='${id(1101 + index)}'`),
      'Selesai / Disetujui',
    );
  }
});

test('surat template RPC still allocates one number per concurrent request', async () => {
  const payload = {
    ...JSON.parse(suratPayload()),
    tanggal_kegiatan: '2026-11-21',
    waktu_kegiatan: '19.00 WIB',
    tempat_kegiatan: 'Aula',
    sistem_pelaksanaan: 'Tatap muka',
  };
  const before = Number(sql('SELECT sum(terakhir) FROM public.surat_counters'));
  const call = (request: number) =>
    new Promise<void>((resolve, reject) => {
      const process = spawn('psql', args, { stdio: ['pipe', 'ignore', 'pipe'] });
      let error = '';
      process.stderr.on('data', (data) => {
        error += String(data);
      });
      process.on('error', reject);
      process.on('close', (code) => (code === 0 ? resolve() : reject(new Error(error))));
      process.stdin.end(
        asUser(
          972,
          `SELECT public.create_portal_surat('${id(request)}','${JSON.stringify(payload)}')`,
        ),
      );
    });
  await Promise.all([call(1103), call(1103), call(1104)]);
  assert.equal(Number(sql('SELECT sum(terakhir) FROM public.surat_counters')), before + 2);
  assert.equal(
    sql(
      `SELECT count(DISTINCT nomor_surat) FROM public.surat WHERE id IN ('${id(1103)}','${id(1104)}')`,
    ),
    '2',
  );
});

test('event registration migration preserves history, closes existing agendas and enforces anonymous boundaries', async () => {
  const before = sql(
    'SELECT json_agg(json_build_array(id,nomor_surat,status) ORDER BY id) FROM public.surat',
  );
  sql(readFileSync('supabase/migrations/202611200001_event_registration_attachments.sql', 'utf8'));
  assert.equal(
    sql('SELECT json_agg(json_build_array(id,nomor_surat,status) ORDER BY id) FROM public.surat'),
    before,
  );
  assert.equal(sql('SELECT count(*) FROM public.public_content WHERE pendaftaran_dibuka'), '0');
  const save = (target: number, version: number, patch: Record<string, unknown> = {}) =>
    asUser(
      970,
      `SELECT public.save_portal_public_content('${id(target)}',${version},'${JSON.stringify({ jenis: 'agenda', judul: 'Kegiatan Remaja', ringkasan: 'Ringkasan', isi: 'Kegiatan', status: 'published', mulai_at: '2099-01-01T02:00:00Z', selesai_at: null, lokasi: 'Depok', pendaftaran_dibuka: true, ...patch })}')`,
    );
  sql(save(1200, -1));
  sql(save(1201, -1, { status: 'draft' }));
  sql(save(1202, -1, { mulai_at: '2020-01-01T02:00:00Z' }));
  sql(save(1203, -1, { pendaftaran_dibuka: false }));
  const payload = { nama: 'Andi Pratama', instansi: 'SMA Negeri 1 Depok', unsur: 'PIK-R' };
  const register = (request: number, event = 1200, input = payload) =>
    `SET ROLE anon; SELECT public.register_portal_event('${id(request)}','${id(event)}','${JSON.stringify(input)}')`;
  const receipt = sql(register(1210)).split('\n').at(-1);
  assert.match(receipt!, /^[a-f0-9-]{36}$/);
  assert.equal(sql(register(1210)).split('\n').at(-1), receipt);
  const publicParticipantId = sql(
    `SELECT id FROM public.event_registrations WHERE request_key='${id(1210)}'`,
  );
  assert.notEqual(publicParticipantId, id(1210));
  assert.throws(
    () =>
      sql(
        `SET ROLE anon; SELECT public.register_portal_event('${publicParticipantId}','${id(1200)}','${JSON.stringify(payload)}')`,
      ),
    /duplicate key/,
  );
  assert.throws(
    () => sql(register(1210, 1200, { ...payload, nama: 'Diganti' })),
    /Request does not match/,
  );
  assert.throws(
    () => sql(register(1211, 1200, { ...payload, nama: ' andi   pratama ' })),
    /duplicate key/,
  );
  for (const event of [1201, 1202, 1203, 1299])
    assert.throws(() => sql(register(1211, event)), /Registration closed/);
  for (const patch of [
    { nama: '' },
    { unsur: ' ' },
    { instansi: 'x'.repeat(301) },
    { pemohon_id: id(970) },
  ])
    assert.throws(() => sql(register(1211, 1200, { ...payload, ...patch })), /Invalid input/);
  assert.throws(
    () => sql('SET ROLE anon; SELECT nama FROM public.event_registrations'),
    /permission denied/,
  );
  assert.throws(
    () =>
      sql(
        `SET ROLE anon; INSERT INTO public.event_registrations(id,agenda_id,nama,instansi,unsur) VALUES('${id(1212)}','${id(1200)}','A','B','C')`,
      ),
    /permission denied/,
  );
  sql(
    `UPDATE public.profiles SET bidang_id='internal', divisi_id=NULL WHERE id IN ('${id(973)}','${id(974)}')`,
  );
  for (const actor of [970, 971, 972])
    assert.equal(
      sql(asUser(actor, 'SELECT count(id) FROM public.event_registrations')).split('\n').at(-1),
      '1',
    );
  for (const actor of [973, 974, 975])
    assert.equal(
      sql(asUser(actor, 'SELECT count(id) FROM public.event_registrations')).split('\n').at(-1),
      '0',
    );
  sql(`UPDATE public.profiles SET bidang_id='branding' WHERE id='${id(974)}'`);
  assert.equal(
    sql(asUser(974, 'SELECT count(id) FROM public.event_registrations')).split('\n').at(-1),
    '1',
  );
  assert.equal(
    sql(asUser(975, 'SELECT count(id) FROM public.event_registrations')).split('\n').at(-1),
    '0',
  );
  assert.throws(
    () => sql(asUser(970, 'SELECT kode FROM public.event_registrations')),
    /permission denied/,
  );
  assert.throws(
    () => sql(asUser(970, 'SELECT request_key FROM public.event_registrations')),
    /permission denied/,
  );
  for (const role of ['anon', 'authenticated']) {
    assert.equal(
      sql(
        `SELECT has_table_privilege('${role}','public.event_registrations','INSERT') OR has_table_privilege('${role}','public.event_registrations','UPDATE') OR has_table_privilege('${role}','public.event_registrations','DELETE') OR has_table_privilege('${role}','public.event_registrations','TRUNCATE')`,
      ),
      'f',
    );
  }
  const results = await Promise.all([
    concurrentSql(register(1213, 1200, { ...payload, nama: 'Concurrent' })),
    concurrentSql(register(1214, 1200, { ...payload, nama: 'Concurrent' })),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.deepEqual(
    await Promise.all([
      concurrentSql(register(1215, 1200, { ...payload, nama: 'Retry' })),
      concurrentSql(register(1215, 1200, { ...payload, nama: 'Retry' })),
    ]),
    [true, true],
  );
  sql(save(1200, 0, { pendaftaran_dibuka: false }));
  assert.equal(sql(register(1210)).split('\n').at(-1), receipt);
  assert.throws(() => sql(register(1216)), /Registration closed/);
  assert.throws(
    () =>
      sql(
        save(1200, 1, { jenis: 'berita', mulai_at: null, lokasi: '', pendaftaran_dibuka: false }),
      ),
    /cannot become news/,
  );
});

test('letter attachments validate participant references, freeze data and preserve idempotent numbering', () => {
  const participantId = (request: number) =>
    sql(`SELECT id FROM public.event_registrations WHERE request_key='${id(request)}'`);
  const payload = {
    ...JSON.parse(suratPayload('Surat Permohonan')),
    tanggal_kegiatan: '',
    waktu_kegiatan: '',
    tempat_kegiatan: '',
    sistem_pelaksanaan: '',
    lampiran_agenda_id: id(1200),
    lampiran_peserta_ids: [participantId(1215), participantId(1210)],
  };
  const call = (request: number, input = payload) =>
    asUser(972, `SELECT public.create_portal_surat('${id(request)}','${JSON.stringify(input)}')`);
  const before = Number(sql('SELECT sum(terakhir) FROM public.surat_counters'));
  sql(call(1220));
  const snapshot = sql(`SELECT lampiran_peserta FROM public.surat WHERE id='${id(1220)}'`);
  assert.deepEqual(
    JSON.parse(snapshot).map((row: { nama: string }) => row.nama),
    ['Andi Pratama', 'Retry'],
  );
  sql(
    call(1220, { ...payload, lampiran_peserta_ids: [...payload.lampiran_peserta_ids].reverse() }),
  );
  assert.equal(Number(sql('SELECT sum(terakhir) FROM public.surat_counters')), before + 1);
  for (const patch of [
    { lampiran_peserta_ids: [participantId(1210), participantId(1210)] },
    { lampiran_peserta_ids: [id(1299)] },
    { lampiran_agenda_id: null },
    { lampiran_peserta_ids: [] },
    { lampiran_agenda_id: id(1201) },
    { lampiran_peserta: [{ nama: 'Forged' }] },
  ])
    assert.throws(() => sql(call(1221, { ...payload, ...patch })), /Invalid/);
  assert.throws(
    () => sql(call(1220, { ...payload, lampiran_peserta_ids: [participantId(1210)] })),
    /Request does not match/,
  );
  sql(
    `UPDATE public.event_registrations SET nama='Changed later' WHERE request_key='${id(1210)}'; UPDATE public.public_content SET judul='Changed later' WHERE id='${id(1200)}'`,
  );
  sql(asUser(970, `SELECT public.approve_portal_surat('${id(1220)}')`));
  assert.equal(sql(`SELECT lampiran_peserta FROM public.surat WHERE id='${id(1220)}'`), snapshot);
  assert.equal(
    sql(`SELECT lampiran_judul FROM public.surat WHERE id='${id(1220)}'`),
    'Kegiatan Remaja',
  );
  sql(call(1220));
  sql(call(1222, { ...payload, lampiran_agenda_id: null, lampiran_peserta_ids: [] }));
  assert.equal(sql(`SELECT lampiran_peserta FROM public.surat WHERE id='${id(1222)}'`), '[]');
});
