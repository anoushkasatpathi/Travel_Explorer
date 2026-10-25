// Loads all destination/attraction photos once at startup and shares them
// with every screen. The URL list is cached in AsyncStorage so photos show
// instantly on the next launch.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWikiImages } from '../services/wikiImages';

// v2: each entry is now { thumb, large } instead of a single URL
const CACHE_KEY = '@travel_explorer/wiki_images_v2';

const ImageContext = createContext({ getImage: () => null });

export function ImageProvider({ titles, children }) {
  const [images, setImages] = useState({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached && !cancelled) setImages(JSON.parse(cached));
      } catch {
        // no cache yet - that's fine
      }

      try {
        const fresh = await fetchWikiImages(titles);
        if (!cancelled && Object.keys(fresh).length > 0) {
          setImages(fresh);
          AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh)).catch(() => {});
        }
      } catch (e) {
        console.warn('Could not load photos, using placeholders', e);
      }
    })();

    return () => {
      cancelled = true;
    };
    // titles is a constant list, so this only runs once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getImage = useCallback((title) => images[title] || null, [images]);
  const value = useMemo(() => ({ getImage }), [getImage]);

  return <ImageContext.Provider value={value}>{children}</ImageContext.Provider>;
}

export function useImages() {
  return useContext(ImageContext);
}
