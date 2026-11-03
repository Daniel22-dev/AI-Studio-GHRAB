/**
 * Cooperative single-origin My Groups v2 write lock. Not a tenant boundary.
 * The lock name contains only the SHA-256 account scope, never student data.
 */
export function createGroupsWriteTransaction({
  scopeId,
  lockManager = globalThis.navigator?.locks,
  assertAllowed,
  onEnter,
  onExit,
} = {}) {
  if (!/^[a-f0-9]{64}$/.test(String(scopeId || '')) ||
      typeof assertAllowed !== 'function' ||
      typeof onEnter !== 'function' || typeof onExit !== 'function') {
    throw new Error('GROUP_WRITE_LOCK_CONFIG_INVALID');
  }
  const name = 'ghrab-groups-write-v2-' + scopeId;
  let active = false;
  return async function withWriteLock(action) {
    if (typeof action !== 'function') throw new TypeError('GROUP_WRITE_ACTION_REQUIRED');
    assertAllowed();
    if (active) throw new Error('GROUP_WRITE_LOCK_REENTRANT');
    if (!lockManager || typeof lockManager.request !== 'function') throw new Error('GROUP_WRITE_LOCK_UNAVAILABLE');
    let callbackStarted = false;
    try {
      return await lockManager.request(name, { mode: 'exclusive' }, (lock) => {
        callbackStarted = true;
        if (!lock || lock.mode !== 'exclusive' || lock.name !== name) throw new Error('GROUP_WRITE_LOCK_INVALID');
        assertAllowed();
        if (active) throw new Error('GROUP_WRITE_LOCK_REENTRANT');
        let entered = false;
        try {
          active = true;
          onEnter();
          entered = true;
          const result = action();
          // Sync core only: no await while data is being modified.
          if (result && typeof result.then === 'function') throw new Error('GROUP_WRITE_ACTION_ASYNC_DENIED');
          assertAllowed();
          return result;
        } finally {
          active = false;
          if (entered) onExit();
        }
      });
    } catch(error) {
      if (!callbackStarted) throw new Error('GROUP_WRITE_LOCK_UNAVAILABLE');
      throw error;
    }
  };
}
