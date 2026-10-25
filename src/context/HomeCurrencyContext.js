// The user's "home" currency for the converter (saved on the device).
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@travel_explorer/home_currency';
const Ctx = createContext({ home: 'INR', setHome: () => {} });

export function HomeCurrencyProvider({ children }) {
  const [home, setHome] = useState('INR');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && setHome(v))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(KEY, home).catch(() => {});
  }, [home, loaded]);

  const value = useMemo(() => ({ home, setHome }), [home]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useHomeCurrency = () => useContext(Ctx);
