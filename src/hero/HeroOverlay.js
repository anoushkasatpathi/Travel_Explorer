// Draws the flying image for the hero transition (see HeroContext.js).
// It sits above the navigator and animates position, size and corner radius.

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import PlaceImage from '../components/PlaceImage';
import { useHero } from './HeroContext';

const DURATION = 420;

export default function HeroOverlay() {
  const { flight, endFlight } = useHero();
  const progress = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!flight) return;
    progress.setValue(0);
    fade.setValue(1);
    Animated.sequence([
      // layout properties (left/top/width/height) can't use the native driver
      Animated.timing(progress, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        useNativeDriver: false,
      }),
      Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: false }),
    ]).start(({ finished }) => finished && endFlight());
  }, [flight, progress, fade, endFlight]);

  if (!flight) return null;
  const { from, to } = flight;
  const lerp = (a, b) => progress.interpolate({ inputRange: [0, 1], outputRange: [a, b] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.box,
        {
          left: lerp(from.x, to.x),
          top: lerp(from.y, to.y),
          width: lerp(from.w, to.w),
          height: lerp(from.h, to.h),
          borderRadius: lerp(from.radius, to.radius),
          opacity: fade,
        },
      ]}
    >
      <PlaceImage
        wiki={flight.wiki}
        category={flight.category}
        iconSize={48}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', overflow: 'hidden' },
});
