// Coalesce overlapping reads, but always run one more read after an event during loading.
export function createRefreshQueue(work: () => Promise<void>, active: () => boolean) {
  let pending: Promise<void> | null = null;
  let repeat = false;
  return () => {
    if (!active()) return Promise.resolve();
    if (pending) {
      repeat = true;
      return pending;
    }
    pending = Promise.resolve().then(async () => {
      try {
        if (!active()) return;
        do {
          repeat = false;
          await work();
        } while (repeat && active());
      } finally {
        pending = null;
      }
    });
    return pending;
  };
}

export function createRealtimeRefresh(
  refresh: () => void,
  refreshProfile: () => void,
  delay: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let profileDirty = false;
  let disposed = false;
  return {
    event(table: string) {
      if (disposed) return;
      profileDirty ||= table === 'profiles';
      clearTimeout(timer);
      timer = setTimeout(() => {
        refresh();
        if (profileDirty) {
          profileDirty = false;
          refreshProfile();
        }
      }, delay);
    },
    dispose() {
      disposed = true;
      clearTimeout(timer);
    },
  };
}
