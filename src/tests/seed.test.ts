import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('retired seed refuses to run without reading credentials or contacting Supabase', () => {
  const result = spawnSync('bash', ['seed_users.sh'], {
    encoding: 'utf8',
    env: { NODE_ENV: 'test', PATH: process.env.PATH },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Seed akun buatan dinonaktifkan/);
  assert.equal(result.stdout, '');
});
