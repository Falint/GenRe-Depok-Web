import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Exercise only JSON encoders, never execute the seed script or contact Supabase.
const script = readFileSync('seed_users.sh', 'utf8');
const encoders = [...script.matchAll(/^import json[^\n]*\n[\s\S]*?(?=\nPYJSON)/gm)].map(
  (match) => match[0],
);

test('admin seed payload preserves quotes and newlines without JSON injection', () => {
  assert.equal(encoders.length, 2);
  const password = 'fixture-"quoted"\nvalue';
  const output = execFileSync('python3', ['-', 'fixture@example.org', 'Pengurus "Uji"'], {
    input: encoders[0],
    encoding: 'utf8',
    env: { NODE_ENV: 'test', PATH: process.env.PATH, SEED_INITIAL_PASSWORD: password },
  });
  const payload: unknown = JSON.parse(output);
  assert.deepEqual(payload, {
    email: 'fixture@example.org',
    password,
    email_confirm: true,
    user_metadata: { nama_lengkap: 'Pengurus "Uji"' },
  });
});
test('admin seed assigns role through profile update rather than untrusted signup metadata', () => {
  const output = execFileSync(
    'python3',
    ['-', 'Pengurus "Uji"', 'Kabid', 'Branding', 'Branding', 'kabid'],
    { input: encoders[1], encoding: 'utf8' },
  );
  const payload: unknown = JSON.parse(output);
  assert.deepEqual(payload, {
    nama_lengkap: 'Pengurus "Uji"',
    jabatan: 'Kabid',
    bidang_divisi: 'Branding',
    kelompok: 'Branding',
    level: 'kabid',
  });
});
