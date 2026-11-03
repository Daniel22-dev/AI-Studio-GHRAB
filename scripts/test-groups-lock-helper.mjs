/** Synthetic lock manager for Node tests; not browser security. */
export function createMockGroupsLockManager() {
  const pending = new Map();
  return Object.freeze({
    async request(name, options, callback) {
      if (options?.mode !== 'exclusive') throw new Error('TEST_LOCK_MODE_INVALID');
      const previous = pending.get(name) || Promise.resolve();
      let release;
      const current = new Promise(resolve => { release = resolve; });
      pending.set(name, current);
      await previous;
      try { return await callback({ name, mode: 'exclusive' }); }
      finally {
        release();
        if (pending.get(name) === current) pending.delete(name);
      }
    },
  });
}
