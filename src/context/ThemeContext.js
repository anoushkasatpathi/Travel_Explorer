// Dark mode.
// - By default the app follows the phone's system setting (light/dark).
// - Tapping the sun/moon button overrides it, and that choice is saved
//   with AsyncStorage so it's remembered next time.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from '../theme';

const STORAGE_KEY = '@travel_explorer/theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setMode] = useState('system'); // 'system' | 'light' | 'dark'
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setMode(saved);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  }, [mode, loaded]);

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const toggle = useCallback(() => setMode(isDark ? 'light' : 'dark'), [isDark]);

  const value = useMemo(
    () => ({ colors, isDark, mode, setMode, toggle, loaded }),
    [colors, isDark, mode, toggle, loaded]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

// Builds a StyleSheet from the current colours and rebuilds it only when the
// theme changes. `factory` must be defined outside the component:
//   const makeStyles = (c) => StyleSheet.create({ box: { backgroundColor: c.card } });
//   const styles = useThemedStyles(makeStyles);
export function useThemedStyles(factory) {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
