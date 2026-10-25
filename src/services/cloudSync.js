// Per-user cloud sync helpers for small documents (wishlist, trip plans).
//
// Firestore layout:
//   users/{uid}                      -> { displayName, email, migratedAt, updatedAt }
//   users/{uid}/data/wishlist        -> { ids: [...], updatedAt }
//   users/{uid}/data/tripPlans       -> { plans: {...}, updatedAt }
//
// AsyncStorage stays the offline cache. Keys:
//   legacy (local-only mode / before first sign-in):  @travel_explorer/<name>
//   per-user cache:                                   @travel_explorer/<name>:<uid>

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const LEGACY_KEYS = {
  wishlist: '@travel_explorer/wishlist',
  tripPlans: '@travel_explorer/trip_plans',
};

export const cacheKey = (name, uid) => (uid ? `${LEGACY_KEYS[name]}:${uid}` : LEGACY_KEYS[name]);

// Cache entries are stored as { value, updatedAt }. Older app versions stored
// the raw value, so both formats are accepted.
export async function readCache(name, uid) {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(name, uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'value' in parsed && 'updatedAt' in parsed) return parsed;
    return { value: parsed, updatedAt: 0 };
  } catch {
    return null;
  }
}

export function writeCache(name, uid, value, updatedAt) {
  return AsyncStorage.setItem(cacheKey(name, uid), JSON.stringify({ value, updatedAt })).catch(() => {});
}

const FIELD = { wishlist: 'ids', tripPlans: 'plans' };
const dataRef = (uid, name) => doc(db, 'users', uid, 'data', name);

// Realtime listener. cb({ value, updatedAt, fromCache, exists }) / onError(err)
export function subscribeUserDoc(uid, name, cb, onError) {
  return onSnapshot(
    dataRef(uid, name),
    { includeMetadataChanges: true },
    (snap) => {
      if (snap.metadata.hasPendingWrites) return; // our own write echoing back
      const data = snap.data();
      cb({
        exists: snap.exists(),
        value: data ? data[FIELD[name]] : undefined,
        updatedAt: data?.updatedAt || 0,
        fromCache: snap.metadata.fromCache,
      });
    },
    onError
  );
}

export function saveUserDoc(uid, name, value, updatedAt) {
  return setDoc(dataRef(uid, name), { [FIELD[name]]: value, updatedAt }, { merge: true });
}

// ---------- merging (used by first-sign-in migration) ----------
export function mergeWishlists(a = [], b = []) {
  return Array.from(new Set([...(a || []), ...(b || [])]));
}

// Per destination: keep notes from whichever side has them, union the checklist items by id.
export function mergePlans(a = {}, b = {}) {
  const out = { ...(a || {}) };
  Object.entries(b || {}).forEach(([id, plan]) => {
    const mine = out[id];
    if (!mine) {
      out[id] = plan;
      return;
    }
    const days = (mine.days || []).map((items, i) => {
      const extra = ((plan.days || [])[i] || []).filter((it) => !items.some((x) => x.id === it.id || x.text === it.text));
      return [...items, ...extra];
    });
    const notes = [mine.notes, plan.notes].filter((n) => n && n.trim()).filter((n, i, arr) => arr.indexOf(n) === i).join('\n\n');
    out[id] = { ...mine, notes, days };
  });
  return out;
}

// Copy local (pre-sign-in) data into the user's cloud documents the first time
// this account signs in on this device. Also brings data from a previous guest
// session along. Returns true when something was migrated.
export async function migrateIfNeeded(uid, { profile = {}, previousUid = null } = {}) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const alreadyMigrated = userSnap.exists() && userSnap.data().migratedAt;

  const sources = [null]; // legacy local data
  if (previousUid && previousUid !== uid) sources.push(previousUid); // guest -> account
  if (alreadyMigrated && sources.length === 1) return false;

  const [remoteWish, remotePlans] = await Promise.all([getDoc(dataRef(uid, 'wishlist')), getDoc(dataRef(uid, 'tripPlans'))]);
  let ids = remoteWish.data()?.ids || [];
  let plans = remotePlans.data()?.plans || {};
  let changed = false;

  for (const src of sources) {
    if (src === null && alreadyMigrated) continue;
    const [w, p] = await Promise.all([readCache('wishlist', src), readCache('tripPlans', src)]);
    if (w?.value?.length) {
      const merged = mergeWishlists(ids, w.value);
      if (merged.length !== ids.length) changed = true;
      ids = merged;
    }
    if (p?.value && Object.keys(p.value).length) {
      plans = mergePlans(plans, p.value);
      changed = true;
    }
  }

  const now = Date.now();
  if (changed) {
    await Promise.all([saveUserDoc(uid, 'wishlist', ids, now), saveUserDoc(uid, 'tripPlans', plans, now)]);
    await Promise.all([writeCache('wishlist', uid, ids, now), writeCache('tripPlans', uid, plans, now)]);
  }
  await setDoc(
    userRef,
    { ...profile, migratedAt: alreadyMigrated || now, updatedAt: serverTimestamp() },
    { merge: true }
  );

  // Local data now lives in the account: clear the legacy copy so it isn't
  // merged into a different account that signs in on this device later.
  if (!alreadyMigrated) {
    await AsyncStorage.multiRemove([LEGACY_KEYS.wishlist, LEGACY_KEYS.tripPlans]).catch(() => {});
  }
  return changed;
}
