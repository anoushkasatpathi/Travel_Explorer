// Live currency exchange rates.
//
// 1. ExchangeRate-API v6 with your key (EXPO_PUBLIC_EXCHANGERATE_API_KEY in .env):
//      https://v6.exchangerate-api.com/v6/<KEY>/latest/USD
// 2. If there's no key or it's invalid: the keyless open.er-api.com endpoint
// 3. If that fails: Frankfurter (European Central Bank rates)
// 4. If everything fails (offline): the last saved rates, or built-in estimates
// Whenever step 1 isn't the source, the converter shows a small "Using backup rates" note.
//
// All rates are stored as "units per 1 USD", so converting A -> B is:
//   amount / rate[A] * rate[B]
//
// The result is shared by every screen through a module-level cache, so the
// network request only happens once per app session.

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FALLBACK_PER_USD } from '../data/countries';

const CACHE_KEY = '@travel_explorer/fx_rates';
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // refresh at most every 6 hours

const API_KEY = (process.env.EXPO_PUBLIC_EXCHANGERATE_API_KEY || '').trim();
export const hasExchangeRateKey = API_KEY.length > 0 && !API_KEY.startsWith('your_');
const PRIMARY = 'ExchangeRate-API';

let memory = null; // { rates, updatedAt, source, primary }
let inflight = null;
let keyProblem = hasExchangeRateKey ? null : 'missing'; // 'missing' | 'invalid' | null

async function fetchV6() {
  if (!hasExchangeRateKey) throw new Error('no ExchangeRate-API key');
  const res = await fetch(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`);
  const json = await res.json().catch(() => ({}));
  if (json.result === 'error') {
    // invalid-key, inactive-account, quota-reached…
    if (['invalid-key', 'inactive-account'].includes(json['error-type'])) keyProblem = 'invalid';
    throw new Error(`ExchangeRate-API: ${json['error-type'] || res.status}`);
  }
  if (!res.ok || !json.conversion_rates) throw new Error(`ExchangeRate-API ${res.status}`);
  keyProblem = null;
  return {
    rates: json.conversion_rates,
    updatedAt: (json.time_last_update_unix || Date.now() / 1000) * 1000,
    source: PRIMARY,
    primary: true,
  };
}

async function fetchOpenER() {
  const res = await fetch('https://open.er-api.com/v6/latest/USD');
  if (!res.ok) throw new Error(`open.er-api ${res.status}`);
  const json = await res.json();
  if (json.result !== 'success' || !json.rates) throw new Error('open.er-api bad response');
  return {
    rates: json.rates,
    updatedAt: (json.time_last_update_unix || Date.now() / 1000) * 1000,
    source: 'ExchangeRate-API (open)',
    primary: false,
  };
}

async function fetchFrankfurter() {
  const res = await fetch('https://api.frankfurter.app/latest?from=USD');
  if (!res.ok) throw new Error(`frankfurter ${res.status}`);
  const json = await res.json();
  return {
    rates: { ...FALLBACK_PER_USD, ...json.rates, USD: 1 }, // ECB doesn't list AED/MVR, keep estimates for those
    updatedAt: json.date ? new Date(json.date).getTime() : Date.now(),
    source: 'European Central Bank',
    primary: false,
  };
}

async function loadRates() {
  if (memory && Date.now() - memory.fetchedAt < MAX_AGE_MS) return memory;

  let cached = null;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) cached = JSON.parse(raw);
  } catch {}

  // A fresh cache is reused for 6 hours, unless it came from a backup source
  // and you've since added a key (then we try the keyed API again).
  const cacheOk = cached && Date.now() - cached.fetchedAt < MAX_AGE_MS && (cached.primary || !hasExchangeRateKey);
  if (cacheOk) {
    memory = cached;
    return memory;
  }

  for (const source of [fetchV6, fetchOpenER, fetchFrankfurter]) {
    try {
      const fresh = { ...(await source()), fetchedAt: Date.now(), live: true };
      memory = fresh;
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh)).catch(() => {});
      return memory;
    } catch (e) {
      console.warn('Rate source failed', e.message);
    }
  }

  // Offline: last saved rates (even if old) or the built-in estimates
  memory = cached
    ? { ...cached, live: false, stale: true }
    : { rates: FALLBACK_PER_USD, updatedAt: null, source: 'Offline estimate', fetchedAt: 0, live: false, primary: false };
  return memory;
}

export function useExchangeRates() {
  const [state, setState] = useState(() => (memory ? { loading: false, ...memory } : { loading: true }));

  const refresh = () => {
    memory = null;
    inflight = null;
    setState((s) => ({ ...s, loading: true }));
    load();
  };

  const load = () => {
    if (!inflight) inflight = loadRates().finally(() => (inflight = null));
    inflight.then((r) => setState({ loading: false, ...r }));
  };

  useEffect(() => {
    load();
  }, []);

  const convert = (amount, from, to) => {
    const rates = state.rates;
    if (!rates || !rates[from] || !rates[to]) return null;
    return (amount / rates[from]) * rates[to];
  };

  // Shown as a small note in the converter when we're not on the keyed API
  const backupNote =
    !state.loading && !state.primary
      ? keyProblem === 'invalid'
        ? 'Using backup rates (ExchangeRate-API key not accepted)'
        : keyProblem === 'missing'
          ? 'Using backup rates (add an ExchangeRate-API key in .env)'
          : 'Using backup rates'
      : null;

  return { ...state, convert, refresh, backupNote };
}
