// Trip notes + a quick 3-day checklist for each wishlisted destination.
// Cached in AsyncStorage and, when Firebase is set up, synced to Firestore per
// user (users/{uid}/data/tripPlans), same as the wishlist (useSyncedState).
//
// Shape:
// {
//   goa: {
//     notes: 'Book scooter rental...',
//     days: [ [ { id, text, done } ], [ ... ], [ ... ] ]   // Day 1, Day 2, Day 3
//   }
// }

import { createContext, useCallback, useContext, useMemo } from 'react';
import { useSyncedState } from '../hooks/useSyncedState';

export const DAY_COUNT = 3;
const EMPTY = {};

const emptyPlan = () => ({ notes: '', days: Array.from({ length: DAY_COUNT }, () => []) });
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const TripPlanContext = createContext(null);

export function TripPlanProvider({ children }) {
  const [plans, setPlans, { loaded, status, cloud }] = useSyncedState('tripPlans', EMPTY);

  // Helper: update one destination's plan immutably
  const update = useCallback((id, fn) => {
    setPlans((prev) => ({ ...prev, [id]: fn(prev[id] || emptyPlan()) }));
  }, [setPlans]);

  const getPlan = useCallback((id) => plans[id] || emptyPlan(), [plans]);

  const setNotes = useCallback((id, notes) => update(id, (p) => ({ ...p, notes })), [update]);

  const addItem = useCallback(
    (id, day, text) => {
      const clean = text.trim();
      if (!clean) return;
      update(id, (p) => ({
        ...p,
        days: p.days.map((items, i) => (i === day ? [...items, { id: newId(), text: clean, done: false }] : items)),
      }));
    },
    [update]
  );

  const toggleItem = useCallback(
    (id, day, itemId) =>
      update(id, (p) => ({
        ...p,
        days: p.days.map((items, i) =>
          i === day ? items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)) : items
        ),
      })),
    [update]
  );

  const removeItem = useCallback(
    (id, day, itemId) =>
      update(id, (p) => ({
        ...p,
        days: p.days.map((items, i) => (i === day ? items.filter((it) => it.id !== itemId) : items)),
      })),
    [update]
  );

  // Pre-fill a sensible 3-day plan from the destination's attractions
  const fillSuggestions = useCallback(
    (id, destination) => {
      const [a1, a2, a3] = destination.attractions.map((a) => a.name);
      const suggestions = [
        [`Check in & explore ${destination.name}`, `Visit ${a1}`, 'Try the local food'],
        [`Visit ${a2}`, 'Shop at a local market', 'Catch the sunset'],
        [`Visit ${a3}`, 'Buy souvenirs', 'Pack & head home'],
      ];
      update(id, (p) => ({
        ...p,
        days: p.days.map((items, i) => [
          ...items,
          ...suggestions[i]
            .filter((text) => !items.some((it) => it.text === text))
            .map((text) => ({ id: newId(), text, done: false })),
        ]),
      }));
    },
    [update]
  );

  const clearPlan = useCallback(
    (id) =>
      setPlans((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      }),
    [setPlans]
  );

  // Small summary used on the wishlist cards
  const getStats = useCallback(
    (id) => {
      const p = plans[id];
      if (!p) return { total: 0, done: 0, hasNotes: false };
      const all = p.days.flat();
      return { total: all.length, done: all.filter((it) => it.done).length, hasNotes: p.notes.trim().length > 0 };
    },
    [plans]
  );

  const value = useMemo(
    () => ({ loaded, getPlan, getStats, setNotes, addItem, toggleItem, removeItem, fillSuggestions, clearPlan, syncStatus: status, cloud }),
    [loaded, getPlan, getStats, setNotes, addItem, toggleItem, removeItem, fillSuggestions, clearPlan, status, cloud]
  );

  return <TripPlanContext.Provider value={value}>{children}</TripPlanContext.Provider>;
}

export function useTripPlans() {
  const ctx = useContext(TripPlanContext);
  if (!ctx) throw new Error('useTripPlans must be used inside <TripPlanProvider>');
  return ctx;
}
