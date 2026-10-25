// Horizontal strip of overlapping, rounded image cards (motion reference d).
// Advancing slides the front card off to the left while the next card glides
// in from the right, with slow easing. A thin progress bar sits underneath.
// Swipe horizontally, use the arrow button, or tap a card.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PlaceImage from '../components/PlaceImage';
import { DUR, EASE, tween } from '../motion/motion';
import { fonts } from '../fonts';

export default function CardCarousel({ items, category, cardW = 190, cardH = 250, overlap = 26, onCardPress, style, light = true }) {
  const [index, setIndex] = useState(0);
  const pos = useRef(new Animated.Value(0)).current;
  const step = cardW - overlap;
  const n = items.length;
  const indexRef = useRef(0);

  const go = (i) => {
    const next = ((i % n) + n) % n; // wrap around
    indexRef.current = next;
    setIndex(next);
    tween(pos, next, { duration: DUR.slow, easing: EASE }).start();
  };

  useEffect(() => {
    pos.setValue(0);
    indexRef.current = 0;
    setIndex(0);
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -40) go(indexRef.current + 1);
          else if (g.dx > 40) go(indexRef.current - 1);
        },
      }),
    [n] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const progress = pos.interpolate({ inputRange: [0, Math.max(1, n - 1)], outputRange: [1 / n, 1], extrapolate: 'clamp' });

  return (
    <View style={style} {...pan.panHandlers}>
      <View style={{ height: cardH, width: cardW + step * Math.min(2, n - 1) + 8 }}>
        {items.map((it, i) => {
          const rel = Animated.subtract(i, pos); // 0 = front card
          const translateX = rel.interpolate({ inputRange: [-1, 0, 1, 2, 3], outputRange: [-cardW * 0.9, 0, step, step * 2, step * 2.6] });
          const opacity = rel.interpolate({ inputRange: [-1, -0.4, 0, 2, 3], outputRange: [0, 0.6, 1, 1, 0] });
          const scale = rel.interpolate({ inputRange: [-1, 0, 1, 2, 3], outputRange: [0.92, 1, 0.94, 0.88, 0.82] });
          return (
            <Animated.View
              key={it.key}
              style={[styles.card, { width: cardW, height: cardH, zIndex: n - Math.abs(i - index), opacity, transform: [{ translateX }, { scale }] }]}
            >
              <Pressable onPress={() => (i === index ? onCardPress?.(i) : go(i))} style={StyleSheet.absoluteFill} accessibilityLabel={it.title}>
                <PlaceImage wiki={it.wiki} category={category} size="large" iconSize={34} style={StyleSheet.absoluteFill} />
                <View style={styles.caption}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {it.title}
                  </Text>
                  {!!it.sub && <Text style={styles.cardSub}>{it.sub}</Text>}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <View style={[styles.track, { backgroundColor: light ? 'rgba(255,255,255,0.28)' : 'rgba(11,35,80,0.15)' }]}>
          <Animated.View
            style={[
              styles.fill,
              { backgroundColor: light ? '#FFFFFF' : '#1D6FE0', transform: [{ scaleX: progress }] },
            ]}
          />
        </View>
        <Text style={[styles.count, { color: light ? '#fff' : '#0B2350' }]}>
          {String(index + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
        </Text>
        <Pressable onPress={() => go(index + 1)} style={[styles.next, !light && { borderColor: 'rgba(11,35,80,0.25)' }]} accessibilityLabel="Next card">
          <Ionicons name="arrow-forward" size={16} color={light ? '#fff' : '#0B2350'} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#123063',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: 'rgba(6,20,43,0.45)' },
  cardTitle: { fontFamily: fonts.bold, fontSize: 14, color: '#fff' },
  cardSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  track: { flex: 1, maxWidth: 220, height: 2, borderRadius: 1, overflow: 'hidden' },
  // scaleX from the left edge: shift origin by translating
  fill: { height: '100%', width: '100%', transformOrigin: 'left' },
  count: { fontFamily: fonts.semi, fontSize: 12, letterSpacing: 1 },
  next: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
});
