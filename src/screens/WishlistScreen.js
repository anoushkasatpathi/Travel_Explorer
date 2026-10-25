// My Trips (Wishlist) – Stage 4, redesigned with the hero-stage motion language:
//   - saved places are stacked hero cards (giant depth title, cards peeking behind)
//   - swipe UP/DOWN to move through the stack (vertical wipe)
//   - swipe LEFT/RIGHT to remove a place: the card flies off with a spring
//     (or springs back if you let go early)
//   - an animated progress ring shows how much of the 3-day plan is done
//   - "Plan trip" opens the draggable bottom-sheet planner
// The list reads the shared wishlist context, so it updates instantly from
// anywhere in the app (and from other devices when Firebase sync is on).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useWishlist } from '../context/WishlistContext';
import { getDestinationById, placeLabel } from '../data/destinations';
import PlaceImage from '../components/PlaceImage';
import EmptyState from '../components/EmptyState';
import TripPlannerSheet from '../components/TripPlannerSheet';
import SyncBadge from '../components/SyncBadge';
import HeroSlide from '../stage/HeroSlide';
import { stageStyle } from '../stage/stageStyles';
import ProgressRing from '../motion/ProgressRing';
import { EASE_IN_OUT, FadeSlideIn, tween } from '../motion/motion';
import { useTripPlans } from '../context/TripPlanContext';
import { useHero } from '../hero/HeroContext';
import { openInMaps } from '../utils/maps';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { radius } from '../theme';
import { fonts } from '../fonts';

function confirm(title, message, onYes) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear all', style: 'destructive', onPress: onYes },
  ]);
}

export default function WishlistScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { ids, remove, clear } = useWishlist();
  const { getStats } = useTripPlans();
  const { openWithHero } = useHero();
  const [planFor, setPlanFor] = useState(null); // destination whose planner is open
  const [index, setIndex] = useState(0);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const items = useMemo(() => ids.map(getDestinationById).filter(Boolean), [ids]);

  useEffect(() => {
    if (index > items.length - 1) setIndex(Math.max(0, items.length - 1));
  }, [items.length, index]);

  const wide = area.w >= 900;
  const stackW = Math.min(area.w - 32, wide ? 560 : 520);
  const stackH = Math.max(300, Math.min(area.h - 250, 640));

  return (
    <View style={styles.safe} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {/* No outer ScrollView: vertical swipes belong to the card stack */}
      <View style={styles.scroll}>
        <View style={[styles.header, { width: Math.max(stackW, 0) }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>MY TRIPS</Text>
            <Text style={styles.title}>
              {items.length} saved {items.length === 1 ? 'place' : 'places'}
            </Text>
            <SyncBadge style={{ marginTop: 8 }} />
          </View>
          {items.length > 0 && (
            <Pressable onPress={() => confirm('Clear wishlist?', 'This removes every saved destination.', clear)} style={styles.clearBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.heart} />
              <Text style={styles.clearText}>Clear all</Text>
            </Pressable>
          )}
        </View>

        {items.length === 0 ? (
          <EmptyState
            icon="heart-outline"
            title="Your wishlist is empty"
            message="Tap the heart on any destination to save it here for your next trip."
            actionLabel="Explore destinations"
            onAction={() => navigation.navigate('Destinations')}
          />
        ) : (
          area.w > 0 && (
            <>
              <TripStack
                items={items}
                index={index}
                setIndex={setIndex}
                width={stackW}
                height={stackH}
                getStats={getStats}
                onOpen={(d, ref) => openWithHero(navigation, ref, d, 26)}
                onPlan={(d) => setPlanFor(d)}
                onRemove={(id) => remove(id)}
              />

              {/* quick jump strip */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ alignSelf: "stretch", flexGrow: 0 }} contentContainerStyle={styles.thumbs}>
                {items.map((d, i) => (
                  <FadeSlideIn key={d.id} delay={i * 60} from={{ y: 14 }}>
                    <Pressable onPress={() => setIndex(i)} style={[styles.thumbWrap, i === index && styles.thumbActive]} accessibilityLabel={`Show ${d.name}`}>
                      <PlaceImage wiki={d.wiki} category={d.category} style={styles.thumb} iconSize={16} />
                      <Text style={[styles.thumbText, i === index && { color: colors.accent }]} numberOfLines={1}>
                        {d.name}
                      </Text>
                    </Pressable>
                  </FadeSlideIn>
                ))}
              </ScrollView>
              <Text style={styles.help}>Swipe up/down to browse · swipe sideways to remove</Text>
            </>
          )
        )}
      </View>

      <TripPlannerSheet destination={planFor} visible={planFor !== null} onClose={() => setPlanFor(null)} />
    </View>
  );
}

// ---------------------------------------------------------------------------
function TripStack({ items, index, setIndex, width: W, height: H, getStats, onOpen, onPlan, onRemove }) {
  const styles = useThemedStyles(makeStyles);
  const n = items.length;
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const shift = useRef(new Animated.Value(0)).current; // 0 → 1 moves the cards behind forward
  const busy = useRef(false);
  const imageRef = useRef(null);
  const state = useRef({ index, n });
  state.current = { index, n };

  const reset = () => {
    dragX.setValue(0);
    dragY.setValue(0);
    shift.setValue(0);
    busy.current = false;
  };

  const advance = (dir) => {
    const { index: i, n: count } = state.current;
    if (busy.current || count < 2) {
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
      return;
    }
    busy.current = true;
    Animated.parallel([
      tween(dragY, dir > 0 ? -H * 1.1 : H * 1.1, { duration: 700, easing: EASE_IN_OUT }),
      tween(shift, 1, { duration: 700, easing: EASE_IN_OUT }),
    ]).start(() => {
      setIndex((i + dir + count) % count);
      reset();
    });
  };

  const removeTop = (dir, vx = 0) => {
    const { index: i } = state.current;
    busy.current = true;
    const id = items[i].id;
    Animated.parallel([
      Animated.spring(dragX, { toValue: dir * W * 1.5, velocity: vx, damping: 18, stiffness: 120, useNativeDriver: true, restDisplacementThreshold: 40 }),
      tween(shift, 1, { duration: 520 }),
    ]).start(() => {
      onRemove(id);
      reset();
    });
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => !busy.current && (Math.abs(g.dx) > 10 || Math.abs(g.dy) > 10),
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dx) > Math.abs(g.dy)) {
            dragX.setValue(g.dx);
            dragY.setValue(0);
          } else {
            dragY.setValue(g.dy * 0.6);
            dragX.setValue(0);
          }
        },
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > Math.abs(g.dy)) {
            if (Math.abs(g.dx) > W * 0.3 || Math.abs(g.vx) > 0.9) removeTop(Math.sign(g.dx), g.vx);
            else Animated.spring(dragX, { toValue: 0, damping: 14, stiffness: 180, useNativeDriver: true }).start();
          } else if (g.dy < -60 || g.vy < -0.7) advance(1);
          else if (g.dy > 60 || g.vy > 0.7) advance(-1);
          else Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [W, H, items] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const d = items[index];
  const behind = [1, 2].map((k) => items[(index + k) % n]).filter((x, k) => n > k + 1);
  const stats = getStats(d.id);
  const pct = stats.total ? stats.done / stats.total : 0;
  const rotate = dragX.interpolate({ inputRange: [-W, 0, W], outputRange: ['-14deg', '0deg', '14deg'] });
  const removeHint = dragX.interpolate({ inputRange: [-W * 0.3, -20, 20, W * 0.3], outputRange: [1, 0, 0, 1], extrapolate: 'clamp' });

  return (
    <View style={{ width: W, height: H + 40, alignSelf: 'center' }}>
      {/* cards behind (furthest first) */}
      {behind
        .map((b, k) => ({ b, k }))
        .reverse()
        .map(({ b, k }) => {
          const depth = k + 1;
          const scale = shift.interpolate({ inputRange: [0, 1], outputRange: [1 - depth * 0.06, 1 - (depth - 1) * 0.06] });
          const ty = shift.interpolate({ inputRange: [0, 1], outputRange: [depth * 20, (depth - 1) * 20] });
          return (
            <Animated.View key={`${b.id}-${depth}`} style={[styles.card, { width: W, height: H, transform: [{ translateY: ty }, { scale }], opacity: 1 - depth * 0.18 }]}>
              <PlaceImage wiki={b.wiki} category={b.category} size="large" iconSize={40} style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: stageStyle(b).tint, opacity: 0.35 }]} />
            </Animated.View>
          );
        })}

      {/* top card */}
      <Animated.View
        key={d.id}
        {...pan.panHandlers}
        style={[styles.card, { width: W, height: H, transform: [{ translateX: dragX }, { translateY: dragY }, { rotate }] }]}
      >
        <HeroSlide destination={d} width={W} height={H} titleMax={Math.min(120, H * 0.22)} imageRef={imageRef} showSeeDetails={false} radius={26}>
          {/* counter + remove */}
          <View style={styles.topRow}>
            <Text style={styles.counter}>
              {String(index + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => advance(-1)} style={styles.glassBtn} accessibilityLabel="Previous saved place">
                <Ionicons name="chevron-up" size={16} color="#fff" />
              </Pressable>
              <Pressable onPress={() => advance(1)} style={styles.glassBtn} accessibilityLabel="Next saved place">
                <Ionicons name="chevron-down" size={16} color="#fff" />
              </Pressable>
              <Pressable onPress={() => removeTop(-1)} style={styles.glassBtn} accessibilityLabel={`Remove ${d.name} from wishlist`}>
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>

          <Animated.View pointerEvents="none" style={[styles.removeBadge, { opacity: removeHint }]}>
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={styles.removeText}>Release to remove</Text>
          </Animated.View>

          {/* glass footer */}
          <View style={styles.footer}>
            <ProgressRing size={58} stroke={5} progress={pct} color="#FFFFFF" track="rgba(255,255,255,0.25)" delay={250}>
              <Text style={styles.ringText}>{stats.total ? `${Math.round(pct * 100)}%` : '–'}</Text>
            </ProgressRing>
            <View style={{ flex: 1 }}>
              <Text style={styles.place} numberOfLines={1}>
                {placeLabel(d)}
              </Text>
              <Text style={styles.planLine} numberOfLines={1}>
                {stats.total ? `${stats.done} of ${stats.total} plan tasks done` : 'No plan yet'}
                {stats.hasNotes ? ' · notes' : ''}
              </Text>
              <View style={styles.footerBtns}>
                <Pressable onPress={() => onPlan(d)} style={styles.primary} accessibilityLabel={`Plan trip to ${d.name}`}>
                  <MaterialCommunityIcons name="notebook-edit-outline" size={14} color="#0B2350" />
                  <Text style={styles.primaryText}>{stats.total || stats.hasNotes ? 'My plan' : 'Plan trip'}</Text>
                </Pressable>
                <Pressable onPress={() => onOpen(d, imageRef)} style={styles.glassPill} accessibilityLabel={`Open ${d.name}`}>
                  <Text style={styles.glassText}>Open</Text>
                </Pressable>
                <Pressable onPress={() => openInMaps(`${d.name}, ${d.location}, ${d.country}`)} style={styles.glassBtn} accessibilityLabel={`Open ${d.name} in Google Maps`}>
                  <Ionicons name="map-outline" size={15} color="#fff" />
                </Pressable>
              </View>
            </View>
          </View>
        </HeroSlide>
      </Animated.View>
    </View>
  );
}

const glass = { backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' };

const makeStyles = (c) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    scroll: { flex: 1, paddingTop: 16, paddingBottom: 12, alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: c.accent },
    title: { fontSize: 26, fontWeight: '800', color: c.ink },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.pill,
      backgroundColor: c.heartSoft,
    },
    clearText: { color: c.heart, fontWeight: '700', fontSize: 13 },
    card: {
      position: 'absolute',
      left: 0,
      top: 0,
      borderRadius: 26,
      overflow: 'hidden',
      backgroundColor: '#0B1F3F',
      shadowColor: '#0B2350',
      shadowOpacity: 0.28,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 14 },
      elevation: 8,
    },
    topRow: { position: 'absolute', top: 16, left: 18, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    counter: { fontFamily: fonts.semi, fontSize: 12, letterSpacing: 1.5, color: '#fff' },
    glassBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', ...glass },
    removeBadge: {
      position: 'absolute',
      top: 64,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(226,59,90,0.9)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
    },
    removeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    footer: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 20,
      backgroundColor: 'rgba(6,20,43,0.45)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    ringText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    place: { fontFamily: fonts.bold, fontSize: 14, color: '#fff' },
    planLine: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    footerBtns: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    primary: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
    primaryText: { fontFamily: fonts.bold, fontSize: 12, color: '#0B2350' },
    glassPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, ...glass },
    glassText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    thumbs: { gap: 10, paddingHorizontal: 16, paddingTop: 18 },
    thumbWrap: { width: 78, alignItems: 'center', gap: 6, padding: 4, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
    thumbActive: { borderColor: c.accent },
    thumb: { width: 66, height: 66, borderRadius: 12 },
    thumbText: { fontSize: 11, fontWeight: '700', color: c.ink, maxWidth: 70 },
    help: { fontSize: 11, color: c.muted, marginTop: 10 },
  });
