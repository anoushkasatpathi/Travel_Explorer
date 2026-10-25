// Travel Buddy Finder state.
//
// With Firebase configured, posts live in the Firestore collection `buddyPosts`
// and are streamed with a realtime listener (onSnapshot), so everyone sees
// each other's trips. "I'm in!" adds your uid to the post's `interested` array,
// and only a post's owner can edit or delete it (see firestore.rules).
//
// The SAMPLE posts below are only shown as a fallback: when Firebase isn't
// configured, when the database is still empty, or when it can't be reached.
// In that local mode, your own posts and interests are stored on the device.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';

const KEY = '@travel_explorer/buddies_v1';
const DAY = 24 * 60 * 60 * 1000;

export const TRAVEL_STYLES = [
  'Backpacking', 'Foodie', 'Photography', 'Trekking', 'Culture',
  'Nightlife', 'Relaxed', 'Road trip', 'Budget', 'Luxury',
];

export const AVATAR_COLORS = ['#1D6FE0', '#0B9EBB', '#1F5FAE', '#4B57D6', '#2E86DE', '#14306E', '#0E7490'];

function daysFromNow(n) {
  const d = new Date(Date.now() + n * DAY);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Sample community posts (fictional people). Dates are relative to today so the
// demo always shows upcoming trips.
function samplePosts() {
  const s = (id, name, destinationId, startIn, days, travelType, groupSize, spots, styles, budget, message, interested, postedAgo) => ({
    id, name, destinationId, startDate: daysFromNow(startIn), days, travelType, groupSize, spots, styles, budget, message,
    baseInterested: interested, createdAt: Date.now() - postedAgo * DAY, sample: true,
    avatarColor: AVATAR_COLORS[name.length % AVATAR_COLORS.length],
  });
  return [
    s('s1', 'Priya M.', 'goa', 18, 4, 'group', 3, 2, ['Relaxed', 'Foodie', 'Nightlife'], 20000,
      'Three friends heading to South Goa for beach-hopping and seafood. Looking for 1–2 chill people to share a villa!', 6, 1),
    s('s2', 'Aarav S.', 'ladakh', 40, 9, 'solo', 1, 3, ['Road trip', 'Trekking', 'Photography'], 40000,
      'Planning a Manali–Leh bike trip. Have my own Royal Enfield; would love riders or pillion buddies to split fuel and stays.', 11, 2),
    s('s3', 'Sneha R.', 'hampi', 10, 3, 'solo', 1, 2, ['Backpacking', 'Culture', 'Photography'], 8000,
      'First solo trip! Want company for sunrise at Matanga Hill and cycling around the ruins.', 4, 0),
    s('s4', 'Kabir J.', 'bangkok', 32, 5, 'group', 2, 2, ['Foodie', 'Nightlife', 'Culture'], 55000,
      'Couple of college friends doing Bangkok street-food crawls + temples. Two more people = cheaper cabs and rooms.', 8, 3),
    s('s5', 'Meera N.', 'rishikesh', 7, 3, 'solo', 1, 3, ['Relaxed', 'Trekking'], 9000,
      'Weekend escape for rafting and a short trek to Neer Garh waterfall. Early risers welcome 🙂', 5, 1),
    s('s6', 'Rohan K.', 'dubai', 55, 5, 'group', 4, 2, ['Luxury', 'Nightlife', 'Photography'], 75000,
      'Group of 4 planning desert safari + Burj Khalifa at sunset. Looking to fill a 6-seater SUV.', 9, 4),
    s('s7', 'Zara A.', 'darjeeling', 25, 4, 'solo', 1, 2, ['Photography', 'Relaxed', 'Culture'], 13000,
      'Tea gardens, toy train and Tiger Hill sunrise. Looking for a fellow photographer to share a homestay.', 3, 2),
    s('s8', 'Dev T.', 'varanasi', 14, 3, 'group', 2, 3, ['Culture', 'Foodie', 'Budget'], 8000,
      'Brother and I are doing Ganga Aarti, sunrise boat ride and a kachori trail. Open to anyone curious!', 7, 1),
    s('s9', 'Ananya B.', 'singapore', 60, 5, 'solo', 1, 1, ['Foodie', 'Culture'], 80000,
      'Solo trip with a hawker-centre checklist. Would love one buddy for Sentosa and Night Safari.', 2, 5),
    s('s10', 'Ishaan G.', 'manali', 21, 5, 'group', 3, 2, ['Trekking', 'Backpacking', 'Budget'], 15000,
      'Hampta Pass trek planned with a local guide. Need 2 more to complete the group of 5.', 10, 2),
  ];
}

const BuddyContext = createContext(null);

const toMillis = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : typeof t === 'number' ? t : Date.now());

export function BuddyProvider({ children }) {
  const auth = useAuth();
  const cloud = auth.enabled && !!auth.syncUid;
  const uid = auth.syncUid;

  // local-mode state (also used for sample-post interest)
  const [myPosts, setMyPosts] = useState([]);
  const [interested, setInterested] = useState([]); // post ids
  const [localName, setLocalName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const samples = useMemo(samplePosts, []);

  // cloud state
  const [remotePosts, setRemotePosts] = useState(null); // null = not loaded yet
  const [status, setStatus] = useState(auth.enabled ? 'connecting' : 'local');
  const [error, setError] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        setMyPosts(saved.myPosts || []);
        setInterested(saved.interested || []);
        setLocalName(saved.profileName || '');
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ myPosts, interested, profileName: localName })).catch(() => {});
  }, [myPosts, interested, localName, loaded]);

  // Realtime feed from Firestore
  useEffect(() => {
    if (!cloud) {
      setRemotePosts(null);
      setStatus(auth.enabled ? 'local-fallback' : 'local');
      return undefined;
    }
    setStatus('connecting');
    const q = query(collection(db, 'buddyPosts'), orderBy('createdAt', 'desc'), limit(200));
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        setRemotePosts(
          snap.docs.map((d) => {
            const p = d.data();
            return { ...p, id: d.id, createdAt: toMillis(p.createdAt), interested: p.interested || [], remote: true };
          })
        );
        setStatus(snap.metadata.fromCache ? 'offline' : 'synced');
        setError(null);
      },
      (e) => {
        console.warn('buddyPosts listener error', e.message);
        setStatus(e.code === 'permission-denied' ? 'error' : 'offline');
        setError(e.code === 'permission-denied' ? 'The database rules blocked access. Did you publish firestore.rules?' : "Can't reach the database right now.");
      }
    );
  }, [cloud, auth.enabled]);

  // Cloud posts when we have any; otherwise samples (+ local posts) as a fallback
  const usingSamples = !cloud || !remotePosts || remotePosts.length === 0;

  const posts = useMemo(() => {
    const now = Date.now() - DAY; // hide trips that already ended
    let list;
    if (!usingSamples) {
      list = remotePosts.map((p) => ({
        ...p,
        mine: p.ownerId === uid,
        avatarColor: AVATAR_COLORS[(p.name || '').length % AVATAR_COLORS.length],
        interestedCount: p.interested.length,
      }));
    } else {
      const own = cloud ? (remotePosts || []).map((p) => ({ ...p, mine: p.ownerId === uid, interestedCount: p.interested.length })) : myPosts;
      list = [...own, ...samples].map((p) =>
        p.remote ? p : { ...p, interestedCount: (p.baseInterested || 0) + (interested.includes(p.id) ? 1 : 0) }
      );
    }
    return list
      .filter((p) => new Date(p.startDate).getTime() + p.days * DAY > now)
      .sort((a, b) => (a.mine === b.mine ? b.createdAt - a.createdAt : a.mine ? -1 : 1));
  }, [usingSamples, remotePosts, uid, cloud, myPosts, samples, interested]);

  // Name shown on posts and in the nav bar
  const profileName = auth.isSignedIn ? auth.displayName : localName;

  const setProfileName = useCallback(
    (name) => {
      setLocalName(name);
      if (auth.enabled && auth.uid) auth.updateDisplayName(name).catch(() => {});
    },
    [auth]
  );

  const addPost = useCallback(
    async (post) => {
      if (post.name && !auth.isSignedIn) setLocalName(post.name);
      if (cloud) {
        const ref = await addDoc(collection(db, 'buddyPosts'), {
          ...post,
          ownerId: uid,
          interested: [],
          createdAt: serverTimestamp(),
        });
        return ref.id;
      }
      const id = `me_${Date.now().toString(36)}`;
      setMyPosts((prev) => [{ ...post, id, mine: true, createdAt: Date.now(), baseInterested: 0, avatarColor: AVATAR_COLORS[0] }, ...prev]);
      return id;
    },
    [cloud, uid, auth.isSignedIn]
  );

  const deletePost = useCallback(
    async (id) => {
      const p = posts.find((x) => x.id === id);
      if (p?.remote) return deleteDoc(doc(db, 'buddyPosts', id));
      setMyPosts((prev) => prev.filter((x) => x.id !== id));
      return null;
    },
    [posts]
  );

  const isInterested = useCallback(
    (id) => {
      const p = posts.find((x) => x.id === id);
      if (p?.remote) return p.interested.includes(uid);
      return interested.includes(id);
    },
    [posts, interested, uid]
  );

  const toggleInterest = useCallback(
    (id) => {
      const p = posts.find((x) => x.id === id);
      if (p?.remote) {
        const on = p.interested.includes(uid);
        return updateDoc(doc(db, 'buddyPosts', id), { interested: on ? arrayRemove(uid) : arrayUnion(uid) }).catch((e) =>
          console.warn('Could not update interest', e.message)
        );
      }
      setInterested((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      return null;
    },
    [posts, uid]
  );

  const countFor = useCallback((destinationId) => posts.filter((p) => p.destinationId === destinationId).length, [posts]);

  const value = useMemo(
    () => ({
      posts,
      loaded,
      profileName,
      setProfileName,
      addPost,
      deletePost,
      toggleInterest,
      isInterested,
      countFor,
      cloud,
      usingSamples,
      syncStatus: status,
      error,
    }),
    [posts, loaded, profileName, setProfileName, addPost, deletePost, toggleInterest, isInterested, countFor, cloud, usingSamples, status, error]
  );
  return <BuddyContext.Provider value={value}>{children}</BuddyContext.Provider>;
}

export function useBuddies() {
  const ctx = useContext(BuddyContext);
  if (!ctx) throw new Error('useBuddies must be used inside <BuddyProvider>');
  return ctx;
}

// ---- small date helpers (no extra library needed) ----
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatRange(startISO, days) {
  const a = new Date(startISO);
  const b = new Date(a.getTime() + (days - 1) * DAY);
  const left = `${a.getDate()} ${MONTHS[a.getMonth()]}`;
  const right = a.getMonth() === b.getMonth() ? `${b.getDate()}` : `${b.getDate()} ${MONTHS[b.getMonth()]}`;
  return days === 1 ? left : `${left} – ${right}`;
}
export function timeAgo(ts) {
  const d = Math.floor((Date.now() - ts) / DAY);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  return `${d} days ago`;
}
export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}
export { MONTHS };
