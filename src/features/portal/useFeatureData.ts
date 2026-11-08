'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Result } from '@/lib/errors';
import { createRefreshQueue } from './refreshQueue';

// Feature failures stay local; the rest of the portal remains usable during rollout.
export function useFeatureData<T>(load: () => Promise<Result<T>>, tables: readonly string[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const refreshQueue = useRef<ReturnType<typeof createRefreshQueue> | null>(null);
  const refresh = useCallback(() => refreshQueue.current?.() || Promise.resolve(), []);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    refreshQueue.current = createRefreshQueue(
      async () => {
        try {
          const result = await load();
          if (!active) return;
          if (result.ok) {
            setData(result.data);
            setError('');
          } else setError(result.error);
        } catch {
          if (active) setError('Koneksi terputus. Coba muat ulang.');
        } finally {
          if (active) setLoading(false);
        }
      },
      () => active,
    );
    void refresh();
    const client = createClient();
    let timer: ReturnType<typeof setTimeout>;
    const channel = client.channel(`feature:${tables.join(':')}:${crypto.randomUUID()}`);
    tables.forEach((table) =>
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => void refresh(), 500);
      }),
    );
    channel.subscribe((status) => {
      if (mounted.current && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'))
        setError((previous) => previous || 'Pembaruan langsung terputus. Muat ulang data fitur.');
    });
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      mounted.current = false;
      clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      void client.removeChannel(channel);
    };
  }, [load, refresh, tables]);
  return { data, error, loading, refresh };
}
