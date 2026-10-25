// Extension 3: open a place in Google Maps using a universal link.
// On a phone with the Google Maps app installed, it opens the app; otherwise the browser.

import { Linking } from 'react-native';

export function mapsUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function openInMaps(query) {
  return Linking.openURL(mapsUrl(query)).catch((e) => console.warn('Could not open maps', e));
}
