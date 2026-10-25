// useSyncedState(name, emptyValue)
//
// State that is cached on the device (AsyncStorage) and, when Firebase is set
// up, synced to Firestore for the signed-in user in realtime:
//   1. load the per-user cache straight away (works offline)
//   2. listen to users/{uid}/data/{name} with onSnapshot
//   3. local edits are written to the cache immediately and to Firestore
//      (Firestore queues writes while offline and sends them when back online)
//   4. conflicts: the newer `updatedAt` wins
//
// Without Firebase keys it behaves exactly like the old AsyncStorage-only code.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { readCache, saveUserDoc, subscribeUserDoc, writeCache } from '../services/cloudSync';

export function useSyncedState(name, emptyValue) {
  const { enabled, syncUid, user, initializing } = useAuth();

  // Which storage "scope" are we in? null = local-only, a uid = cloud user,
  // 'pending' = waiting for sign-in / migration to finish.
  let scope;
  if (!enabled) scope = null;
  else if (syncUid) scope = syncUid;
  else if (initializing || user) scope = 'pending';
  else scope = null; // Firebase configured but guest sign-in failed: stay local

  const [value, setValueState] = useState(emptyValue);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState(enabled ? 'connecting' : 'local');
  const valueRef = useRef(emptyValue);
  const updatedRef = useRef(0);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const apply = (next, updatedAt) => {
    valueRef.current = next;
    updatedRef.current = updatedAt;
    setValueState(next);
  };

  const push = useCallback(
    (uid, next, updatedAt) => {
      setStatus('syncing');
      saveUserDoc(uid, name, next, updatedAt)
        .then(() => scopeRef.current === uid && setStatus('synced'))
        .catch((e) => {
          console.warn(`Could not sync ${name}`, e.message);
          if (scopeRef.current === uid) setStatus(e.code === 'permission-denied' ? 'error' : 'offline');
        });
    },
    [name]
  );

  // 1 + 2: load cache, then subscribe
  useEffect(() => {
    if (scope === 'pending') return undefined;
    let cancelled = false;
    let unsub = null;

    (async () => {
      const cached = await readCache(name, scope);
      if (cancelled) return;
      apply(cached?.value ?? emptyValue, cached?.updatedAt || 0);
      setLoaded(true);

      if (!scope) {
        setStatus(enabled ? 'local-fallback' : 'local');
        return;
      }
      setStatus('connecting');
      unsub = subscribeUserDoc(
        scope,
        name,
        (remote) => {
          if (cancelled) return;
          if (!remote.exists || remote.updatedAt < updatedRef.current) {
            // Cloud is empty or older than what we have: upload ours
            if (updatedRef.current > 0 && !remote.fromCache) push(scope, valueRef.current, updatedRef.current);
            else setStatus(remote.fromCache ? 'offline' : 'synced');
            return;
          }
          if (remote.updatedAt > updatedRef.current) {
            apply(remote.value ?? emptyValue, remote.updatedAt);
            writeCache(name, scope, remote.value ?? emptyValue, remote.updatedAt);
          }
          setStatus(remote.fromCache ? 'offline' : 'synced');
        },
        (err) => {
          console.warn(`${name} listener error`, err.message);
          if (!cancelled) setStatus(err.code === 'permission-denied' ? 'error' : 'offline');
        }
      );
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3: local edits
  const setValue = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(valueRef.current) : updater;
      if (next === valueRef.current) return;
      const updatedAt = Date.now();
      apply(next, updatedAt);
      const s = scopeRef.current;
      if (s === 'pending') return;
      writeCache(name, s, next, updatedAt);
      if (s) push(s, next, updatedAt);
    },
    [name, push]
  );

  return [value, setValue, { loaded, status, cloud: !!scope && scope !== 'pending' }];
}
