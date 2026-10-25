import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { WishlistProvider, useWishlist } from './src/context/WishlistContext';
import { TripPlanProvider, useTripPlans } from './src/context/TripPlanContext';
import { ImageProvider } from './src/context/ImageContext';
import { BuddyProvider, useBuddies } from './src/context/BuddyContext';
import { HomeCurrencyProvider } from './src/context/HomeCurrencyContext';
import { HeroProvider } from './src/hero/HeroContext';
import HeroOverlay from './src/hero/HeroOverlay';
import { allWikiTitles } from './src/data/destinations';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/splash/SplashScreen';
import { useFonts } from 'expo-font';
import { FONT_ASSETS } from './src/fonts';

// Providers wrap the whole app so every screen can read the shared
// theme, auth (Firebase), wishlist, trip plans, buddy posts, currency and photo URLs.
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
        <WishlistProvider>
          <TripPlanProvider>
            <BuddyProvider>
              <HomeCurrencyProvider>
                <ImageProvider titles={allWikiTitles}>
                  <HeroProvider>
                    <Root />
                  </HeroProvider>
                </ImageProvider>
              </HomeCurrencyProvider>
            </BuddyProvider>
          </TripPlanProvider>
        </WishlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// The home screen is rendered straight away underneath the splash, so when
// the splash fades out the app is already there: a seamless hand-off.
function Root() {
  const { isDark, loaded: themeLoaded } = useTheme();
  const { loaded: wishlistLoaded } = useWishlist();
  const { loaded: plansLoaded } = useTripPlans();
  const { loaded: buddiesLoaded } = useBuddies();
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS); // never blocks: falls back to system font on error
  const [showSplash, setShowSplash] = useState(true);
  const hideSplash = useCallback(() => setShowSplash(false), []);
  // Safety net: never keep the splash up longer than 9 s (e.g. slow network on first launch)
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 9000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
      <HeroOverlay />
      {showSplash && (
        <SplashScreen ready={timedOut || (themeLoaded && wishlistLoaded && plansLoaded && buddiesLoaded && (fontsLoaded || !!fontError))} onFinish={hideSplash} />
      )}
    </View>
  );
}
