// Firebase Authentication.
//
// - Email + password accounts (sign up / sign in / reset password / sign out).
// - Guest fallback: if nobody is signed in, the app signs in anonymously so
//   wishlist, trip plans and buddy posts can still sync. Creating an account
//   from a guest session *links* it, so the guest's data is kept.
// - On the first sign-in of an account on this device, local data from before
//   (and from the previous guest session) is merged into the account.
// - Without Firebase keys in .env, this provider reports mode "local" and the
//   rest of the app keeps its AsyncStorage-only behaviour.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseEnabled } from '../services/firebase';
import { migrateIfNeeded } from '../services/cloudSync';

const AuthContext = createContext(null);

const MESSAGES = {
  'auth/invalid-email': 'That email address looks wrong.',
  'auth/missing-password': 'Please enter your password.',
  'auth/weak-password': 'Use at least 6 characters for your password.',
  'auth/email-already-in-use': 'An account already exists with this email. Try signing in.',
  'auth/credential-already-in-use': 'An account already exists with this email. Try signing in.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/too-many-requests': 'Too many attempts. Please wait a minute and try again.',
  'auth/network-request-failed': "You're offline. Check your connection and try again.",
  'auth/operation-not-allowed': 'This sign-in method is not enabled in the Firebase console.',
  'auth/admin-restricted-operation': 'Guest sign-in is disabled in the Firebase console.',
};
export const authMessage = (e) => MESSAGES[e?.code] || e?.message || 'Something went wrong.';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(firebaseEnabled);
  const [syncUid, setSyncUid] = useState(null); // uid whose data is ready to sync (after migration)
  const [guestError, setGuestError] = useState(null);
  const lastAnonUid = useRef(null);
  const pendingPrevUid = useRef(null);

  useEffect(() => {
    if (!firebaseEnabled) return undefined;
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setSyncUid(null);
        // Guest fallback so the app can still sync
        try {
          await signInAnonymously(auth);
          setGuestError(null);
        } catch (e) {
          setGuestError(authMessage(e));
          setInitializing(false);
        }
        return;
      }
      setUser(u);
      setInitializing(false);
      const previousUid = pendingPrevUid.current;
      pendingPrevUid.current = null;
      if (u.isAnonymous) lastAnonUid.current = u.uid;
      try {
        // Never let a slow/offline network block the app for long
        await Promise.race([
          migrateIfNeeded(u.uid, {
            previousUid,
            profile: { displayName: u.displayName || null, email: u.email || null, isGuest: u.isAnonymous },
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('migration timed out')), 6000)),
        ]);
      } catch (e) {
        console.warn('Migration skipped (offline?):', e.message);
      }
      setSyncUid(u.uid);
    });
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (auth.currentUser?.isAnonymous) pendingPrevUid.current = auth.currentUser.uid; // bring guest data along
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUp = useCallback(async (name, email, password) => {
    const current = auth.currentUser;
    let cred;
    if (current?.isAnonymous) {
      // Upgrade the guest account in place: same uid, all data kept
      cred = await linkWithCredential(current, EmailAuthProvider.credential(email.trim(), password));
    } else {
      cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    }
    if (name?.trim()) await updateProfile(cred.user, { displayName: name.trim() });
    await setDoc(
      doc(db, 'users', cred.user.uid),
      { displayName: name?.trim() || null, email: cred.user.email, isGuest: false, updatedAt: serverTimestamp() },
      { merge: true }
    ).catch(() => {});
    await cred.user.reload().catch(() => {});
    setUser({ ...auth.currentUser }); // refresh displayName / isAnonymous in state
  }, []);

  const continueAsGuest = useCallback(async () => {
    await signInAnonymously(auth);
  }, []);

  const signOut = useCallback(async () => {
    setSyncUid(null);
    await fbSignOut(auth); // onAuthStateChanged then starts a fresh guest session
  }, []);

  const resetPassword = useCallback((email) => sendPasswordResetEmail(auth, email.trim()), []);

  const updateDisplayName = useCallback(async (name) => {
    const u = auth.currentUser;
    if (!u) return;
    await updateProfile(u, { displayName: name.trim() || null });
    await setDoc(doc(db, 'users', u.uid), { displayName: name.trim() || null, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
    setUser({ ...auth.currentUser });
  }, []);

  const value = useMemo(
    () => ({
      enabled: firebaseEnabled,
      mode: firebaseEnabled && user ? 'cloud' : 'local',
      initializing,
      user,
      uid: user?.uid || null,
      syncUid,
      isGuest: !!user?.isAnonymous,
      isSignedIn: !!user && !user.isAnonymous,
      displayName: user?.displayName || (user?.email ? user.email.split('@')[0] : ''),
      email: user?.email || '',
      guestError,
      signIn,
      signUp,
      continueAsGuest,
      signOut,
      resetPassword,
      updateDisplayName,
    }),
    [user, initializing, syncUid, guestError, signIn, signUp, continueAsGuest, signOut, resetPassword, updateDisplayName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
