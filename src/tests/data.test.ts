import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { readRows } from '../features/portal/data';
import type { Database } from '../lib/supabase/database.types';

function clientWithFetch(fetcher: typeof fetch) {
  return createClient<Database>('http://127.0.0.1:54328', 'fixture-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetcher },
  });
}

test('readRows loads more than default Supabase limit with explicit pagination', async () => {
  const rows = Array.from({ length: 1005 }, (_, index) => ({ id: String(index) }));
  const offsets: number[] = [];
  const client = clientWithFetch(async (input) => {
    const url = new URL(String(input));
    const offset = Number(url.searchParams.get('offset'));
    const limit = Number(url.searchParams.get('limit'));
    offsets.push(offset);
    assert.equal(url.searchParams.get('select'), 'id');
    return new Response(JSON.stringify(rows.slice(offset, offset + limit)), {
      headers: {
        'content-type': 'application/json',
        'content-range': `${offset}-${Math.min(offset + limit - 1, 1004)}/1005`,
      },
    });
  });
  const result = await readRows(client, 'surat', z.object({ id: z.string() }), 'id');
  assert.equal(result.length, 1005);
  assert.deepEqual(offsets, [0, 200, 400, 600, 800, 1000]);
});
test('readRows rejects incomplete or malformed responses and reports database failure', async () => {
  for (const fixture of [
    { body: [], count: 5, status: 200 },
    { body: [{ id: null }], count: 1, status: 200 },
    { body: { message: 'internal database detail' }, count: 0, status: 400 },
  ]) {
    const client = clientWithFetch(
      async () =>
        new Response(JSON.stringify(fixture.body), {
          status: fixture.status,
          headers: { 'content-type': 'application/json', 'content-range': `0-0/${fixture.count}` },
        }),
    );
    await assert.rejects(
      readRows(client, 'surat', z.object({ id: z.string() })),
      (error) => error instanceof Error && !error.message.includes('internal database detail'),
    );
  }
});
