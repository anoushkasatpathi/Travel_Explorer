// Full-screen photo viewer opened from the attraction carousel.
// Swipe left/right (or use the arrow buttons) to move between photos.

import { useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import PlaceImage from './PlaceImage';
import { openInMaps } from '../utils/maps';

export default function GalleryViewer({ visible, startIndex = 0, destination, onClose }) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={['portrait']}
    >
      {/* Mount the content only while open, so it starts at the tapped photo every time */}
      {visible && <ViewerContent startIndex={startIndex} destination={destination} onClose={onClose} />}
    </Modal>
  );
}

function ViewerContent({ startIndex, destination: d, onClose }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const [index, setIndex] = useState(startIndex);
  const items = d.attractions;
  const current = items[index];

  const goTo = (i) => {
    const next = Math.max(0, Math.min(items.length - 1, i));
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  return (
    <View style={styles.screen}>
      <FlatList
        ref={listRef}
        data={items}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(a) => a.name}
        scrollEventThrottle={16}
        onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            <PlaceImage
              wiki={item.wiki}
              category={d.category}
              size="large"
              resizeMode="contain"
              placeholderColor="#000"
              iconSize={72}
              style={{ width, height }}
            />
          </View>
        )}
      />

      {/* Top bar: close + counter */}
      <View style={[styles.topBar, { top: insets.top + 10 }]}>
        <Pressable onPress={onClose} style={styles.roundBtn} accessibilityLabel="Close gallery">
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.counter}>
          {index + 1} / {items.length}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Arrow buttons (handy on the web / tablets) */}
      {index > 0 && (
        <Pressable onPress={() => goTo(index - 1)} style={[styles.arrow, { left: 12 }]} accessibilityLabel="Previous photo">
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
      )}
      {index < items.length - 1 && (
        <Pressable onPress={() => goTo(index + 1)} style={[styles.arrow, { right: 12 }]} accessibilityLabel="Next photo">
          <Ionicons name="chevron-forward" size={26} color="#fff" />
        </Pressable>
      )}

      {/* Bottom: caption, maps button, dots */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.title}>{current?.name}</Text>
        <Text style={styles.subtitle}>
          {d.name}, {d.location}
        </Text>
        <Pressable
          onPress={() => openInMaps(`${current.name}, ${d.location}`)}
          style={({ pressed }) => [styles.mapsBtn, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons name="google-maps" size={18} color="#fff" />
          <Text style={styles.mapsText}>Open in Google Maps</Text>
        </Pressable>
        <View style={styles.dots}>
          {items.map((a, i) => (
            <View key={a.name} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: { color: '#fff', fontSize: 15, fontWeight: '700' },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 2 },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  mapsText: { color: '#fff', fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 16 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 20, backgroundColor: '#fff' },
});
