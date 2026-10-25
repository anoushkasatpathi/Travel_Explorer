// Budget slider where a train runs along a railway track.
// - Drag the engine (or tap anywhere on the track) to set your budget.
// - Instead of a plain filled line, carriages appear behind the engine
//   up to the selected value.
// - While moving, the wheels spin and steam puffs from the chimney.
// - The train changes shade of blue by zone: Budget / Mid-range / Premium / Luxury.
//
// Built with PanResponder (React Native's gesture system) and Animated.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { radius } from '../theme';

export const BUDGET_MIN = 5000;
export const BUDGET_MAX = 300000;

// The track uses a logarithmic scale so both a ₹8k road trip and a ₹2L
// international holiday are easy to pick: each step along the track
// multiplies the budget instead of adding a fixed amount.
const LOG_RANGE = Math.log(BUDGET_MAX / BUDGET_MIN);
export const valueToRatio = (v) => Math.log(v / BUDGET_MIN) / LOG_RANGE;
export const ratioToValue = (r) => BUDGET_MIN * Math.exp(r * LOG_RANGE);

// Round to a "nice" number depending on size
function roundNice(v) {
  const step = v < 20000 ? 1000 : v < 100000 ? 5000 : 10000;
  return Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, Math.round(v / step) * step));
}

export const BUDGET_ZONES = [
  { key: 'low', label: 'Budget', upTo: 15000, color: '#38B6E8' },
  { key: 'mid', label: 'Mid-range', upTo: 50000, color: '#2E86DE' },
  { key: 'high', label: 'Premium', upTo: 120000, color: '#1F4FB8' },
  { key: 'lux', label: 'Luxury', upTo: Infinity, color: '#14306E' },
];

export function zoneFor(value) {
  return BUDGET_ZONES.find((z) => value <= z.upTo);
}

export function formatRupees(v) {
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
}

const ENGINE_W = 50;
const CAR_W = 34;
const CAR_GAP = 5;
const TRACK_H = 92;

export default function TrainBudgetSlider({ value, onChange, onDragChange }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [width, setWidth] = useState(0);
  const [moving, setMoving] = useState(false);
  const trackRef = useRef(null);
  const startX = useRef(0);
  const run = width - ENGINE_W; // how far the engine can travel

  const hasValue = value !== null && value !== undefined;
  const v = hasValue ? value : BUDGET_MIN;
  const x = run > 0 ? valueToRatio(v) * run : 0;
  const zone = zoneFor(v);
  const trainColor = hasValue ? zone.color : colors.muted;

  // Keep latest values for the gesture handlers (they are created once)
  const latest = useRef({ run, onChange, x, onDragChange });
  latest.current = { run, onChange, x, onDragChange };
  const setDragging = (on) => {
    setMoving(on);
    latest.current.onDragChange?.(on);
  };

  const setFromX = (px) => {
    const { run: r, onChange: cb } = latest.current;
    if (r <= 0) return;
    const clamped = Math.max(0, Math.min(r, px));
    cb(roundNice(ratioToValue(clamped / r)));
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false, // don't let the ScrollView steal the drag
        onPanResponderGrant: (evt) => {
          setDragging(true);
          startX.current = latest.current.x;
          const pageX = evt.nativeEvent.pageX;
          // Tap-to-jump: work out where on the track the finger landed
          trackRef.current?.measureInWindow((left) => {
            const target = pageX - left - ENGINE_W / 2;
            startX.current = target;
            setFromX(target);
          });
        },
        onPanResponderMove: (_, g) => setFromX(startX.current + g.dx),
        onPanResponderRelease: () => setDragging(false),
        onPanResponderTerminate: () => setDragging(false),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Carriages fill the track behind the engine
  const carCount = Math.max(0, Math.ceil(x / (CAR_W + CAR_GAP)) + 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: hasValue ? trainColor : colors.muted }]}>
          {hasValue ? formatRupees(v) : 'Slide the train'}
        </Text>
        <Text style={styles.valueSub}>
          {hasValue ? `${zone.label} · per person` : 'to set your budget per person'}
        </Text>
      </View>

      <View
        ref={trackRef}
        collapsable={false}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={styles.track}
        {...pan.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Budget per person"
        accessibilityValue={{ min: BUDGET_MIN, max: BUDGET_MAX, now: v, text: formatRupees(v) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) =>
          onChange(roundNice(v * (e.nativeEvent.actionName === 'increment' ? 1.25 : 0.8)))
        }
      >
        <Railway width={width} styles={styles} />

        {/* Zone markers (stations) */}
        {run > 0 &&
          BUDGET_ZONES.slice(0, 3).map((z) => {
            const sx = valueToRatio(z.upTo) * run + ENGINE_W;
            return (
              <View key={z.key} style={[styles.station, { left: sx - 1 }]} pointerEvents="none">
                <View style={[styles.stationPole, { backgroundColor: z.color }]} />
                <Text style={styles.stationText}>{z.upTo >= 100000 ? `${z.upTo / 100000}L` : `${z.upTo / 1000}k`}</Text>
              </View>
            );
          })}

        {/* Carriages: clipped to the distance travelled, attached to the engine */}
        <View style={[styles.carsClip, { width: x }]} pointerEvents="none">
          <View style={styles.carsRow}>
            {Array.from({ length: carCount }, (_, i) => (
              <Carriage key={i} color={trainColor} moving={moving} styles={styles} />
            ))}
          </View>
        </View>

        {/* Engine */}
        <View style={[styles.engineWrap, { left: x }]} pointerEvents="none">
          <Engine color={trainColor} moving={moving} styles={styles} />
        </View>
      </View>

      <View style={styles.zoneLabels}>
        {BUDGET_ZONES.map((z) => (
          <Text
            key={z.key}
            style={[styles.zoneLabel, hasValue && zone.key === z.key && { color: z.color, fontWeight: '800' }]}
          >
            {z.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// Two rails and wooden sleepers
function Railway({ width, styles }) {
  const sleepers = Math.max(0, Math.floor(width / 14));
  return (
    <View style={styles.railway} pointerEvents="none">
      <View style={styles.sleepers}>
        {Array.from({ length: sleepers }, (_, i) => (
          <View key={i} style={styles.sleeper} />
        ))}
      </View>
      <View style={[styles.rail, { top: 2 }]} />
      <View style={[styles.rail, { top: 9 }]} />
    </View>
  );
}

// Looping 0 -> 1 animation that only runs while `active` is true
function useLoop(active, duration) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
    );
    anim.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [active, anim, duration]);
  return anim;
}

function Wheel({ spin, styles }) {
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={[styles.wheel, { transform: [{ rotate }] }]}>
      <View style={styles.spoke} />
    </Animated.View>
  );
}

function Engine({ color, moving, styles }) {
  const spin = useLoop(moving, 500);
  const steam = useLoop(moving, 900);
  const bounce = useLoop(moving, 260);

  const bounceY = bounce.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -1.2, 0] });

  return (
    <Animated.View style={[styles.engine, { transform: [{ translateY: bounceY }] }]}>
      {/* steam puffs */}
      {[0, 0.33, 0.66].map((offset) => {
        const t = Animated.modulo(Animated.add(steam, offset), 1);
        return (
          <Animated.View
            key={offset}
            style={[
              styles.puff,
              {
                opacity: moving ? t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.75, 0] }) : 0,
                transform: [
                  { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) },
                  { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
                  { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.5] }) },
                ],
              },
            ]}
          />
        );
      })}
      <View style={[styles.chimney, { backgroundColor: color }]} />
      <View style={[styles.cab, { backgroundColor: color }]}>
        <View style={styles.cabWindow} />
      </View>
      <View style={[styles.boiler, { backgroundColor: color }]}>
        <View style={styles.boilerBand} />
      </View>
      <View style={styles.light} />
      <View style={[styles.cowcatcher, { borderLeftColor: color }]} />
      <View style={styles.wheels}>
        <Wheel spin={spin} styles={styles} />
        <Wheel spin={spin} styles={styles} />
        <Wheel spin={spin} styles={styles} />
      </View>
    </Animated.View>
  );
}

function Carriage({ color, moving, styles }) {
  const spin = useLoop(moving, 500);
  return (
    <View style={styles.carWrap}>
      <View style={[styles.car, { backgroundColor: color }]}>
        <View style={styles.carWindow} />
        <View style={styles.carWindow} />
      </View>
      <View style={styles.carWheels}>
        <Wheel spin={spin} styles={styles} />
        <Wheel spin={spin} styles={styles} />
      </View>
      <View style={styles.coupler} />
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 10,
    },
    valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
    value: { fontSize: 22, fontWeight: '800' },
    valueSub: { fontSize: 12, color: c.muted },
    track: { height: TRACK_H, marginTop: 4, justifyContent: 'flex-end', userSelect: 'none', cursor: 'grab' },
    railway: { position: 'absolute', left: 0, right: 0, bottom: 6, height: 16 },
    sleepers: { flexDirection: 'row', justifyContent: 'space-between', height: 16 },
    sleeper: { width: 4, height: 16, borderRadius: 1, backgroundColor: c.line },
    rail: { position: 'absolute', left: 0, right: 0, height: 3, borderRadius: 2, backgroundColor: c.muted, opacity: 0.7 },
    station: { position: 'absolute', bottom: 22, alignItems: 'center', width: 2 },
    stationPole: { width: 2, height: 46, borderRadius: 1, opacity: 0.6 },
    stationText: { position: 'absolute', top: -14, width: 30, textAlign: 'center', fontSize: 10, fontWeight: '700', color: c.muted },
    carsClip: { position: 'absolute', left: 0, bottom: 12, height: 40, overflow: 'hidden' },
    carsRow: { position: 'absolute', right: 0, bottom: 0, flexDirection: 'row-reverse', gap: CAR_GAP },
    carWrap: { width: CAR_W, height: 30, justifyContent: 'flex-end' },
    car: {
      height: 20,
      borderRadius: 5,
      marginBottom: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-evenly',
    },
    carWindow: { width: 9, height: 8, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.85)' },
    carWheels: { position: 'absolute', bottom: 0, left: 4, right: 4, flexDirection: 'row', justifyContent: 'space-between' },
    coupler: { position: 'absolute', right: -CAR_GAP, bottom: 11, width: CAR_GAP, height: 3, backgroundColor: c.muted },
    engineWrap: { position: 'absolute', bottom: 12, width: ENGINE_W, height: 46 },
    engine: { width: ENGINE_W, height: 46 },
    chimney: { position: 'absolute', left: 31, top: 8, width: 7, height: 11, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
    puff: { position: 'absolute', left: 30, top: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: c.muted },
    cab: {
      position: 'absolute',
      left: 0,
      top: 6,
      width: 18,
      height: 34,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
      alignItems: 'center',
      paddingTop: 5,
    },
    cabWindow: { width: 10, height: 9, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.9)' },
    boiler: {
      position: 'absolute',
      left: 16,
      top: 18,
      width: 30,
      height: 18,
      borderTopRightRadius: 9,
      borderBottomRightRadius: 3,
      justifyContent: 'center',
    },
    boilerBand: { position: 'absolute', left: 10, width: 3, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.18)' },
    light: { position: 'absolute', left: 42, top: 21, width: 6, height: 6, borderRadius: 3, backgroundColor: '#CFE6FF' },
    cowcatcher: {
      position: 'absolute',
      left: 44,
      top: 30,
      width: 0,
      height: 0,
      borderLeftWidth: 7,
      borderTopWidth: 6,
      borderTopColor: 'transparent',
    },
    wheels: { position: 'absolute', bottom: 0, left: 2, right: 6, flexDirection: 'row', justifyContent: 'space-between' },
    wheel: {
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: c.ink,
      borderWidth: 2,
      borderColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    spoke: { width: 7, height: 1.5, backgroundColor: c.card },
    zoneLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    zoneLabel: { fontSize: 11, fontWeight: '600', color: c.muted },
  });
