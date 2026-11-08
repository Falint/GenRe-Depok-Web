import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRefreshQueue, createRealtimeRefresh } from '../features/portal/refreshQueue';

const tick = () => new Promise((resolve) => setTimeout(resolve, 15));
test('refresh queues a trailing read, survives loader failure, and stops on unmount', async () => {
  let release!: () => void;
  let calls = 0;
  let active = true;
  let errors = 0;
  const refresh = createRefreshQueue(
    async () => {
      calls++;
      try {
        if (calls === 1) {
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          throw new Error('offline');
        }
      } catch {
        errors++;
      }
    },
    () => active,
  );
  const first = refresh();
  await Promise.resolve();
  assert.equal(refresh(), first);
  refresh();
  release();
  await first;
  assert.equal(calls, 2);
  assert.equal(errors, 1);
  await refresh();
  assert.equal(calls, 3);
  active = false;
  await refresh();
  assert.equal(calls, 3);
  let stop!: () => void;
  let stoppedCalls = 0;
  active = true;
  const stopped = createRefreshQueue(
    async () => {
      stoppedCalls++;
      await new Promise<void>((resolve) => {
        stop = resolve;
      });
    },
    () => active,
  );
  const pending = stopped();
  await Promise.resolve();
  stopped();
  active = false;
  stop();
  await pending;
  assert.equal(stoppedCalls, 1);
});
test('unexpected rejection releases queue and permits retry', async () => {
  let fail = true;
  const refresh = createRefreshQueue(
    async () => {
      if (fail) throw new Error('loader');
    },
    () => true,
  );
  await assert.rejects(refresh(), /loader/);
  fail = false;
  await refresh();
});
test('profile events survive other tables and repeated batches; dispose cancels timers', async () => {
  let reads = 0;
  let profiles = 0;
  const realtime = createRealtimeRefresh(
    () => {
      reads++;
    },
    () => {
      profiles++;
    },
    1,
  );
  realtime.event('profiles');
  realtime.event('reimburse');
  await tick();
  assert.deepEqual([reads, profiles], [1, 1]);
  realtime.event('profiles');
  realtime.event('profiles');
  realtime.event('kas_mutasi');
  await tick();
  assert.deepEqual([reads, profiles], [2, 2]);
  realtime.event('profiles');
  realtime.dispose();
  realtime.event('profiles');
  await tick();
  assert.deepEqual([reads, profiles], [2, 2]);
});
