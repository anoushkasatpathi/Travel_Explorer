// Landing hero: "TRAVEL / AROUND THE WORLD" over a sky with a floating paper
// plane, a dashed flight trail and paper mountains with landmarks.
// Micro-animations: the plane floats, clouds drift and the trail "flows".

import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop, Circle } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Cloud, PaperPeaks, PaperPlane } from './Illustrations';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../fonts';

const AnimatedPath = Animated.createAnimatedComponent(Path);

function useLoop(duration, { native = true, yoyo = true } = {}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = yoyo
      ? Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
            Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
          ])
        )
      : Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: native }));
    anim.start();
    return () => anim.stop();
  }, [v, duration, native, yoyo]);
  return v;
}

export default function HeroBanner({ width, onExplore }) {
  const { isDark } = useTheme();
  const wide = width >= 900;
  const H = wide ? 600 : 720;

  const float = useLoop(2600);
  const drift = useLoop(9000);
  const dash = useLoop(2400, { native: false, yoyo: false });

  const peaksW = wide ? Math.min(width * 0.56, 800) : width * 1.15;
  const peaksH = (peaksW * 420) / 700;
  const planeW = wide ? Math.min(300, width * 0.22) : Math.min(170, width * 0.44);
  const planeTop = wide ? 22 : H - peaksH - planeW * 0.2;
  const planeRight = wide ? width * 0.2 : 12;
  const planeLeft = width - planeRight - planeW;

  // Dashed trail: from below the text, through a loop, to the plane's tail
  const sx = wide ? width * 0.33 : width * 0.12;
  const sy = wide ? H * 0.66 : H - peaksH * 0.55;
  const tx = planeLeft + planeW * 0.08;
  const ty = planeTop + planeW * 0.36;
  const lx = (sx + tx) / 2;
  const ly = Math.min(sy, ty) + Math.abs(sy - ty) * 0.25;
  const trail = `M${sx},${sy} Q${lx - 60},${sy + 10} ${lx},${ly + 30} a38,38 0 1,1 2,-4 Q${lx + 70},${ly - 30} ${tx},${ty}`;

  const sky = isDark ? ['#071430', '#123166', '#2A5698'] : ['#2A7DE6', '#5EA4F3', '#BFDDFB'];

  return (
    <View style={[styles.wrap, { height: H }]}>
      {/* Sky */}
      <Svg style={StyleSheet.absoluteFill} width={width} height={H}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky[0]} />
            <Stop offset="0.55" stopColor={sky[1]} />
            <Stop offset="1" stopColor={sky[2]} />
          </LinearGradient>
          <RadialGradient id="sun" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={isDark ? 0.25 : 0.55} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={H} fill="url(#sky)" />
        <Circle cx={width * 0.82} cy={H * 0.2} r={wide ? 260 : 170} fill="url(#sun)" />
        {isDark &&
          Array.from({ length: 40 }, (_, i) => (
            <Circle key={i} cx={(i * 97) % width} cy={(i * 53) % (H * 0.55)} r={i % 5 === 0 ? 1.4 : 0.8} fill="#fff" opacity={0.6} />
          ))}
      </Svg>

      {/* Back clouds drifting */}
      <Animated.View
        style={[styles.abs, { top: H * 0.02, left: -60, transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }) }] }]}
      >
        <Cloud width={wide ? 240 : 150} opacity={isDark ? 0.15 : 0.35} />
      </Animated.View>
      <Animated.View
        style={[styles.abs, { top: H * 0.06, right: width * 0.32, transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) }] }]}
      >
        <Cloud width={wide ? 200 : 120} opacity={isDark ? 0.15 : 0.5} />
      </Animated.View>

      {/* Mountains + landmarks */}
      <View style={[styles.abs, { right: wide ? 0 : -width * 0.08, bottom: 0 }]}>
        <PaperPeaks width={peaksW} dark={isDark} />
      </View>

      {/* Dashed trail */}
      <Svg style={StyleSheet.absoluteFill} width={width} height={H} pointerEvents="none">
        <AnimatedPath
          d={trail}
          stroke="#FFFFFF"
          strokeOpacity={0.9}
          strokeWidth={2}
          strokeDasharray="9 9"
          strokeDashoffset={dash.interpolate({ inputRange: [0, 1], outputRange: [18, 0] })}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>

      {/* Floating paper plane */}
      <Animated.View
        style={[
          styles.abs,
          {
            top: planeTop,
            right: planeRight,
            transform: [
              { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
              { rotate: float.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) },
            ],
          },
        ]}
      >
        <PaperPlane width={planeW} />
      </Animated.View>

      {/* Front clouds hugging the mountains (where the search card overlaps) */}
      <Animated.View
        style={[styles.abs, { bottom: -30, left: -60, transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) }] }]}
      >
        <Cloud width={wide ? 520 : 340} opacity={isDark ? 0.25 : 0.95} />
      </Animated.View>
      <Animated.View
        style={[styles.abs, { bottom: -40, right: wide ? width * 0.25 : -80, transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -24] }) }] }]}
      >
        <Cloud width={wide ? 420 : 280} opacity={isDark ? 0.2 : 0.9} />
      </Animated.View>

      {/* Copy */}
      <View style={[styles.copy, wide ? { left: Math.max(40, (width - 1280) / 2 + 40), top: 70, width: width * 0.46 } : { left: 20, right: 20, top: 34 }]}>
        <Text style={[styles.big, { fontSize: wide ? 104 : 62, lineHeight: wide ? 110 : 68 }]}>TRAVEL</Text>
        <Text style={[styles.around, { fontSize: wide ? 40 : 25 }]}>AROUND THE WORLD</Text>
        <Text style={[styles.script, { fontSize: wide ? 38 : 28 }]}>Explore. Dream. Discover.</Text>
        <Text style={[styles.lead, { fontSize: wide ? 17 : 15, maxWidth: 380 }]}>
          Live weather, local essentials and trip planning for {wide ? '41 handpicked' : '41'} destinations across India and the world.
        </Text>
        <Pressable onPress={onExplore} style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.97 }] }]} accessibilityRole="button">
          <Text style={styles.ctaText}>Explore Destinations</Text>
          <MaterialCommunityIcons name="send" size={16} color="#1E6FE8" style={{ transform: [{ rotate: '-20deg' }] }} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', overflow: 'hidden' },
  abs: { position: 'absolute' },
  copy: { position: 'absolute' },
  big: { fontFamily: fonts.black, color: '#FFFFFF', letterSpacing: 2, textShadowColor: 'rgba(11,35,80,0.25)', textShadowRadius: 12 },
  around: { fontFamily: fonts.heading, color: '#FFFFFF', letterSpacing: 1.5, marginTop: -2 },
  script: { fontFamily: fonts.script, color: '#FFFFFF', marginTop: 10 },
  lead: { fontFamily: fonts.semi, color: 'rgba(255,255,255,0.95)', lineHeight: 24, marginTop: 14 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    shadowColor: '#0B2A5C',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ctaText: { fontFamily: fonts.bold, color: '#1E6FE8', fontSize: 15 },
});
