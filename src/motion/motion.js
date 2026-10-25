// Shared motion language for the redesigned tabs:
// slow, cinematic easing (600–900 ms), staggered entrances, fade-and-slide.
//
// Everything here respects the OS "Reduce motion" setting: durations shrink to
// near-instant and slides become plain fades.

import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

export const EASE = Easing.bezier(0.22, 1, 0.36, 1); // smooth "ease-out-quint"
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
export const DUR = { fast: 380, med: 650, slow: 850 };

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.()
  .then((v) => (reduceMotion = !!v))
  .catch(() => {});

export function useReducedMotion() {
  const [rm, setRm] = useState(reduceMotion);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => alive && setRm(!!v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => {
      reduceMotion = !!v;
      setRm(!!v);
    });
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return rm;
}

// Cinematic timing helper
export function tween(value, toValue, { duration = DUR.med, delay = 0, easing = EASE, native = true } = {}) {
  return Animated.timing(value, {
    toValue,
    duration: reduceMotion ? Math.min(120, duration) : duration,
    delay: reduceMotion ? 0 : delay,
    easing,
    useNativeDriver: native,
  });
}

// Fades + slides its children in when mounted. `from` is the start offset.
export function FadeSlideIn({ children, delay = 0, duration = DUR.med, from = { y: 24 }, style, trigger }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    tween(v, 1, { duration, delay }).start();
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const tx = from.x ? v.interpolate({ inputRange: [0, 1], outputRange: [from.x, 0] }) : 0;
  const ty = from.y ? v.interpolate({ inputRange: [0, 1], outputRange: [from.y, 0] }) : 0;
  const scale = from.scale ? v.interpolate({ inputRange: [0, 1], outputRange: [from.scale, 1] }) : 1;
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateX: tx }, { translateY: ty }, { scale }] }]}>
      {children}
    </Animated.View>
  );
}

// Stagger delay for list item i (caps so long lists don't wait forever)
export const stagger = (i, step = 70, max = 8) => Math.min(i, max) * step;
