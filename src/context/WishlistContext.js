// Stage 4 + Extension 4: the wishlist lives in React Context so every screen
// sees the same list and re-renders when it changes.
//
// Storage: cached on the device (AsyncStorage) and, when Firebase is set up,
// synced in realtime to Firestore for the signed-in user (users/{uid}/data/wishlist).
// See src/hooks/useSyncedState.js. Without Firebase keys it works offline-only, as before.

import { createContext, useCallback, useContext, useMemo } from 'react';
import { useSyncedState } from '../hooks/useSyncedState';

const WishlistContext = createContext(null);
const EMPTY = [];

export function WishlistProvider({ children }) {
  const [ids, setIds, { loaded, status, cloud }] = useSyncedState('wishlist', EMPTY);

  const add = useCallback((id) => setIds((prev) => (prev.includes(id) ? prev : [id, ...prev])), [setIds]);
  const remove = useCallback((id) => setIds((prev) => prev.filter((x) => x !== id)), [setIds]);
  const toggle = useCallback(
    (id) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev])),
    [setIds]
  );
  const clear = useCallback(() => setIds([]), [setIds]);
  const isWishlisted = useCallback((id) => ids.includes(id), [ids]);

  const value = useMemo(
    () => ({ ids, loaded, add, remove, toggle, clear, isWishlisted, syncStatus: status, cloud }),
    [ids, loaded, add, remove, toggle, clear, isWishlisted, status, cloud]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return ctx;
}
