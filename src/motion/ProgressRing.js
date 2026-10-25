// Circular progress ring that animates (fills up) whenever `progress` changes.
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { DUR, tween } from './motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ProgressRing({
  size = 56,
  stroke = 6,
  progress = 0, // 0..1
  color = '#1D6FE0',
  track = 'rgba(255,255,255,0.25)',
  delay = 0,
  duration = DUR.slow,
  children,
  style,
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    tween(v, Math.max(0, Math.min(1, progress)), { duration, delay, native: false }).start();
  }, [progress]); // eslint-disable-line react-hooks/exhaustive-deps

  const offset = v.interpolate({ inputRange: [0, 1], outputRange: [circ, 0] });

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>
    </View>
  );
}
