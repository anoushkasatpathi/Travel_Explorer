// Share a destination using the phone's native share sheet
// (WhatsApp, Instagram, Messages, Gmail, ...).
//
// React Native's built-in Share API opens the Android/iOS share sheet.
// On the web it uses the browser's share dialog when available, otherwise
// it copies the text to the clipboard.

import { Platform, Share } from 'react-native';
import { mapsUrl } from './maps';
import { placeLabel } from '../data/destinations';

export function buildShareMessage(d) {
  return [
    `✈️ ${d.name}, ${placeLabel(d)}`,
    '',
    d.description,
    '',
    `🗓 Best time to visit: ${d.bestTime}`,
    `📍 Popular spots: ${d.attractions.map((a) => a.name).join(', ')}`,
    `🗺 ${mapsUrl(`${d.name}, ${d.location}, ${d.country}`)}`,
    '',
    'Shared from Travel Explorer',
  ].join('\n');
}

export async function shareDestination(d) {
  const message = buildShareMessage(d);
  const title = `${d.name} – Travel Explorer`;

  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: message });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // user closed the dialog
      }
    }
    try {
      await navigator.clipboard.writeText(message);
      window.alert('Destination details copied to clipboard!');
    } catch {
      window.alert(message);
    }
    return;
  }

  try {
    await Share.share({ title, message }, { dialogTitle: `Share ${d.name}`, subject: title });
  } catch (e) {
    console.warn('Share failed', e);
  }
}
