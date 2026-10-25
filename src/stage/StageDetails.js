// Content revealed after "See details" (motion reference c):
// description fades in under the (now small) title on the left, then a row of
// attraction cards slides in from the right with a progress bar beneath.
// `reveal` (Animated 0→1) drives everything with staggered segments.

import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CardCarousel from './CardCarousel';
import HeartButton from '../components/HeartButton';
import { placeLabel, isAbroad } from '../data/destinations';
import { getCountry } from '../data/countries';
import { formatMoney } from '../utils/money';
import { shareDestination } from '../utils/share';
import { fonts } from '../fonts';

function seg(v, a, b) {
  return v.interpolate({ inputRange: [0, a, b, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
}

export function stageCards(d) {
  return [
    ...d.attractions.map((a) => ({ key: a.name, wiki: a.wiki, title: a.name, sub: 'Attraction' })),
    { key: '__main', wiki: d.wiki, title: d.name, sub: placeLabel(d) },
  ];
}

export default function StageDetails({ destination: d, width: W, height: H, reveal, onOpenGuide, onCardPress, top = 128, showShare = true }) {
  const wide = W >= 900;
  const desc = seg(reveal, 0.05, 0.55);
  const meta = seg(reveal, 0.2, 0.7);
  const cards = seg(reveal, 0.3, 1);
  const cardW = wide ? 210 : Math.min(170, W * 0.42);
  const cardH = wide ? 270 : Math.min(220, H * 0.3);

  const flag = isAbroad(d) ? `${getCountry(d.countryCode).flag} ` : '';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.left,
          { top, maxWidth: wide ? Math.min(440, W * 0.4) : W - 48, opacity: desc, transform: [{ translateY: desc.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] },
        ]}
      >
        <Text style={styles.kicker}>
          {flag}
          {placeLabel(d).toUpperCase()} · {d.category.toUpperCase()}
        </Text>
        <Text style={[styles.desc, !wide && { fontSize: 14, lineHeight: 21 }]} numberOfLines={wide ? 6 : 4}>
          {d.description}
        </Text>
        <Animated.View style={[styles.metaRow, { opacity: meta, transform: [{ translateY: meta.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
          <Chip icon="calendar-outline" text={d.bestTime.split(/[,(]/)[0].trim()} />
          <Chip icon="wallet-outline" text={`~${formatMoney(d.approxCost, 'INR')}`} />
          <Chip icon="time-outline" text={`${d.idealDays[0]}–${d.idealDays[1]} days`} />
        </Animated.View>
        <Animated.View style={[styles.actions, { opacity: meta }]}>
          {onOpenGuide && (
            <Pressable onPress={onOpenGuide} style={({ pressed }) => [styles.primary, pressed && { transform: [{ scale: 0.96 }] }]} accessibilityRole="button">
              <Text style={styles.primaryText}>Open full guide</Text>
              <Ionicons name="arrow-forward" size={14} color="#0B2350" />
            </Pressable>
          )}
          <HeartButton id={d.id} size={40} />
          {showShare && (
            <Pressable onPress={() => shareDestination(d)} style={styles.glassBtn} accessibilityLabel={`Share ${d.name}`}>
              <Ionicons name="share-social-outline" size={18} color="#fff" />
            </Pressable>
          )}
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[
          wide ? { position: 'absolute', right: 28, bottom: 36 } : { position: 'absolute', left: 24, right: 0, bottom: 26 },
          { opacity: cards, transform: [{ translateX: cards.interpolate({ inputRange: [0, 1], outputRange: [W * 0.45, 0] }) }] },
        ]}
      >
        <CardCarousel items={stageCards(d)} category={d.category} cardW={cardW} cardH={cardH} onCardPress={onCardPress} />
      </Animated.View>
    </View>
  );
}

function Chip({ icon, text }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={12} color="#fff" />
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  left: { position: 'absolute', left: 24 },
  kicker: { fontFamily: fonts.semi, fontSize: 11, letterSpacing: 1.6, color: 'rgba(255,255,255,0.85)' },
  desc: { fontFamily: fonts.semi, fontSize: 16, lineHeight: 25, color: '#FFFFFF', marginTop: 10 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  chipText: { fontSize: 11.5, fontWeight: '700', color: '#fff' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  primary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999 },
  primaryText: { fontFamily: fonts.bold, fontSize: 13, color: '#0B2350' },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
