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
