'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Result } from '@/lib/errors';

// Feature failures stay local; the rest of the portal remains usable during rollout.
export function useFeatureData<T>(load: () => Promise<Result<T>>, tables: readonly string[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const pending = useRef<Promise<void> | null>(null);
  const repeat = useRef(false);
  const refresh = useCallback(() => {
    if (pending.current) {
      repeat.current = true;
      return pending.current;
    }
    pending.current = (async () => {
      try {
        do {
          repeat.current = false;
          const result = await load();
          if (!mounted.current) return;
          if (result.ok) {
            setData(result.data);
            setError('');
          } else setError(result.error);
        } while (repeat.current && mounted.current);
      } catch {
        if (mounted.current) setError('Koneksi terputus. Coba muat ulang.');
      } finally {
        pending.current = null;
        if (mounted.current) setLoading(false);
      }
    })();
    return pending.current;
  }, [load]);
  useEffect(() => {
    mounted.current = true;
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
      mounted.current = false;
      clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      void client.removeChannel(channel);
    };
  }, [refresh, tables]);
  return { data, error, loading, refresh };
}
