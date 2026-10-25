// React hook around the weather service (OpenWeather with Open-Meteo fallback).
import { useCallback, useEffect, useState } from 'react';
import { getWeather } from '../services/weather';

export function useWeather(coords) {
  const [state, setState] = useState({ loading: true, current: null, forecast: [], source: null, error: null, note: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getWeather(coords);
      setState({ loading: false, error: null, ...data });
    } catch (e) {
      setState({ loading: false, current: null, forecast: [], source: null, note: null, error: 'Weather unavailable' });
    }
  }, [coords.lat, coords.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
