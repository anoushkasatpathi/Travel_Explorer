// Shows a destination/attraction photo. While the photo loads (or if it fails),
// a coloured placeholder with the category icon is shown underneath, so the UI
// never looks broken. Anything passed as children is drawn on top of the image.
//
// size="large" loads progressively: the small photo appears first (it's
// usually cached already) and the high-resolution one fades in on top.
// `ref` is forwarded to the outer View so the hero transition can measure it.

import { useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useImages } from '../context/ImageContext';
import { categoryMeta } from '../theme';

const IMAGE_HEADERS =
  Platform.OS === 'web' ? undefined : { 'User-Agent': 'TravelExplorer/1.0 (GDGC student project)' };

export default function PlaceImage({
  ref,
  wiki,
  category,
  style,
  iconSize = 32,
  size = 'thumb',
  resizeMode = 'cover',
  placeholderColor,
  children,
}) {
  const { getImage } = useImages();
  const entry = getImage(wiki);
  const [failed, setFailed] = useState([]);

  const layers = [];
  if (entry?.thumb) layers.push(entry.thumb);
  if (size === 'large' && entry?.large && entry.large !== entry.thumb) layers.push(entry.large);
  const visible = layers.filter((u) => !failed.includes(u));

  const meta = categoryMeta[category] || { icon: 'map-marker', color: '#6B7280' };

  return (
    <View ref={ref} collapsable={false} style={[styles.base, { backgroundColor: placeholderColor || meta.color }, style]}>
      <View style={styles.placeholder}>
        <MaterialCommunityIcons name={meta.icon} size={iconSize} color="rgba(255,255,255,0.6)" />
      </View>
      {visible.map((uri) => (
        <Image
          key={uri}
          source={{ uri, headers: IMAGE_HEADERS }}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
          fadeDuration={200}
          onError={() => setFailed((prev) => [...prev, uri])}
        />
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  placeholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
