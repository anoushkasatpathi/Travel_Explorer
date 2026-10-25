// Hero (shared-element) transition between a destination's image in a list
// and the big header image on the Details screen.
//
// How it works:
//   1. When a card is tapped we measure where its image is on screen.
//   2. We navigate to Details (which fades in) and, at the same time, a copy
//      of the image is drawn in an overlay above everything (HeroOverlay.js).
//   3. That copy animates from the card's rectangle to the Details header's
//      rectangle, then disappears, revealing the identical real header.
//   4. Pressing back on Details plays the same flight in reverse.

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Dimensions } from 'react-native';

// Details now opens with a full-bleed photo "stage". The flight animation
// itself (HeroOverlay.js) is unchanged; only its landing rectangle follows the
// new, taller Details header.
export function detailsStageHeight() {
  const { height } = Dimensions.get('window');
  return Math.round(Math.min(Math.max(height * 0.84, 460), 880));
}
export const DETAILS_HERO_HEIGHT = 320; // kept for backwards compatibility

const HeroContext = createContext(null);

// Where the image sits on the Details screen (top of the screen, full width)
export function detailsHeroRect(scrollY = 0) {
  const { width } = Dimensions.get('window');
  return { x: 0, y: -scrollY, w: width, h: detailsStageHeight(), radius: 0 };
}

export function HeroProvider({ children }) {
  const [flight, setFlight] = useState(null); // what the overlay is animating
  const sources = useRef({}); // last card rectangle per destination id (for the reverse flight)

  // Open Details with a hero flight from `imageRef`.
  const openWithHero = useCallback((navigation, imageRef, destination, radius = 16) => {
    const go = (hero) => navigation.navigate('Details', { id: destination.id, hero });
    const node = imageRef?.current;
    if (!node || !node.measureInWindow) return go(false);

    node.measureInWindow((x, y, w, h) => {
      if (!w || !h) return go(false);
      const from = { x, y, w, h, radius };
      sources.current[destination.id] = from;
      setFlight({
        key: Date.now(),
        wiki: destination.wiki,
        category: destination.category,
        from,
        to: detailsHeroRect(),
      });
      go(true);
    });
  }, []);

  // Fly back from the Details header to the card it came from, then go back.
  const closeWithHero = useCallback((navigation, destination, scrollY = 0) => {
    const target = sources.current[destination.id];
    // Only if the header is still (mostly) on screen
    if (target && scrollY < detailsStageHeight() * 0.6) {
      setFlight({
        key: Date.now(),
        wiki: destination.wiki,
        category: destination.category,
        from: detailsHeroRect(scrollY),
        to: target,
      });
    }
    navigation.goBack();
  }, []);

  const endFlight = useCallback(() => setFlight(null), []);

  const value = useMemo(
    () => ({ flight, openWithHero, closeWithHero, endFlight }),
    [flight, openWithHero, closeWithHero, endFlight]
  );

  return <HeroContext.Provider value={value}>{children}</HeroContext.Provider>;
}

export function useHero() {
  const ctx = useContext(HeroContext);
  if (!ctx) throw new Error('useHero must be used inside <HeroProvider>');
  return ctx;
}
