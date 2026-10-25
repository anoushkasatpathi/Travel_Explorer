// Full-bleed destination "stage" slide (motion reference a + c):
//
//  ┌──────────────────────────────┐
//  │  (overlays: nav, panels…)    │
//  │                              │
//  │      M O R O C C O           │  ← giant condensed title
//  │ ~~~~~~ scenery ~~~~~~~~~~~~~ │  ← lower part of the photo redrawn ON TOP
//  │        [ See details ]       │     of the title (depth effect)
//  └──────────────────────────────┘
//
// `expand` (Animated 0→1) drives the "See details" transition: the title
// shrinks and moves to the top-left, the button fades out, the photo dims and
// the foreground copy fades away (the title no longer sits behind the scenery).
//
// About the depth effect: true subject cut-outs need a mask per photo. Here the
// photo below a per-destination horizon line (stageStyles.js) is layered above
// the text with a feathered edge, which reads as "text behind the landscape"
// for most horizon-style photos and needs no extra assets.

import { useState } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import PlaceImage from '../components/PlaceImage';
import { useImages } from '../context/ImageContext';
import { fitTitleSize, stageStyle } from './stageStyles';
import { fonts } from '../fonts';

const IMAGE_HEADERS = Platform.OS === 'web' ? undefined : { 'User-Agent': 'TravelExplorer/1.0 (GDGC student project)' };
const FEATHER_STEPS = 7;
const FEATHER = 30;

export default function HeroSlide({
  destination: d,
  width: W,
  height: H,
  expand, // Animated.Value 0..1 (optional)
  titleMax = 220,
  smallTitle = 38,
  titleTarget = { left: 24, top: 74 },
  titleOffset, // Animated value: extra translateY for the title (slide-in parallax)
  onSeeDetails,
  showSeeDetails = true,
  imageRef,
  radius = 0,
  depth = true,
  children,
}) {
  const { getImage } = useImages();
  const entry = getImage(d.wiki);
  const uri = entry ? entry.large || entry.thumb : null;
  const { horizon } = stageStyle(d);
  const title = d.name.toUpperCase();
  const size = fitTitleSize(title, W, titleMax);
  const hY = H * horizon;
  const lineH = size * 1.02;
  const titleTop = hY - lineH * 0.62; // lower ~35% of the letters sits below the horizon

  const [box, setBox] = useState(null); // measured title box {x, w}
  const e = expand || new Animated.Value(0);

  // Shrink-and-move transform (only once we know the title's width)
  let titleTransform = [];
  if (box) {
    const s = smallTitle / size;
    const cx = box.x + box.w / 2;
    const cy = titleTop + lineH / 2;
    const tx = titleTarget.left + (box.w * s) / 2 - cx;
    const ty = titleTarget.top + (lineH * s) / 2 - cy;
    titleTransform = [
      { translateX: e.interpolate({ inputRange: [0, 1], outputRange: [0, tx] }) },
      { translateY: e.interpolate({ inputRange: [0, 1], outputRange: [0, ty] }) },
      { scale: e.interpolate({ inputRange: [0, 1], outputRange: [1, s] }) },
    ];
  }
  if (titleOffset) titleTransform = [{ translateY: titleOffset }, ...titleTransform];

  const fgOpacity = e.interpolate({ inputRange: [0, 0.45], outputRange: [1, 0], extrapolate: 'clamp' });
  const dim = e.interpolate({ inputRange: [0, 1], outputRange: [0, 0.42] });
  const btnOpacity = e.interpolate({ inputRange: [0, 0.3], outputRange: [1, 0], extrapolate: 'clamp' });

  // Feathered foreground: a few thin strips with rising opacity, then solid
  const strips = [];
  if (depth && uri) {
    for (let k = 0; k < FEATHER_STEPS; k++) {
      const top = hY - FEATHER + (k * FEATHER) / FEATHER_STEPS;
      strips.push({ top, height: FEATHER / FEATHER_STEPS + 0.5, opacity: (k + 1) / (FEATHER_STEPS + 1) });
    }
    strips.push({ top: hY, height: H - hY, opacity: 1 });
  }

  return (
    <View style={[styles.frame, { width: W, height: H, borderRadius: radius }]}>
      <PlaceImage ref={imageRef} wiki={d.wiki} category={d.category} size="large" iconSize={64} style={StyleSheet.absoluteFill} />

      {/* legibility scrims */}
      <Svg style={StyleSheet.absoluteFill} width={W} height={H} pointerEvents="none">
        <Defs>
          <LinearGradient id={`t${d.id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity="0.38" />
            <Stop offset="0.28" stopColor="#000" stopOpacity="0" />
            <Stop offset="0.7" stopColor="#000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.45" />
          </LinearGradient>
        </Defs>
        <Rect width={W} height={H} fill={`url(#t${d.id})`} />
      </Svg>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#06142B', opacity: dim }]} />

      {/* Giant title */}
      <View pointerEvents="none" style={[styles.titleRow, { top: titleTop, height: lineH }]}>
        <Animated.Text
          onLayout={(ev) => {
            const { x, width } = ev.nativeEvent.layout;
            if (!box || Math.abs(box.w - width) > 1 || Math.abs(box.x - x) > 1) setBox({ x, w: width });
          }}
          numberOfLines={1}
          style={[styles.title, { fontSize: size, lineHeight: lineH, transform: titleTransform }]}
        >
          {title}
        </Animated.Text>
      </View>

      {/* Scenery in front of the title */}
      {strips.length > 0 && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fgOpacity }]}>
          {strips.map((st, i) => (
            <View key={i} style={{ position: 'absolute', left: 0, width: W, top: st.top, height: st.height, overflow: 'hidden', opacity: st.opacity }}>
              <Image source={{ uri, headers: IMAGE_HEADERS }} resizeMode="cover" style={{ position: 'absolute', left: 0, top: -st.top, width: W, height: H }} />
            </View>
          ))}
        </Animated.View>
      )}

      {showSeeDetails && onSeeDetails && (
        <Animated.View style={[styles.btnWrap, { opacity: btnOpacity }]} pointerEvents="box-none">
          <Pressable onPress={onSeeDetails} style={({ pressed }) => [styles.btn, pressed && { transform: [{ scale: 0.96 }] }]} accessibilityRole="button" accessibilityLabel={`See details for ${d.name}`}>
            <Text style={styles.btnText}>See details</Text>
            <Ionicons name="arrow-forward" size={14} color="#0B2350" />
          </Pressable>
        </Animated.View>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#0B1F3F' },
  titleRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  title: {
    fontFamily: fonts.display,
    color: '#FFFFFF',
    letterSpacing: 2,
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowRadius: 18,
  },
  btnWrap: { position: 'absolute', left: 0, right: 0, bottom: 34, alignItems: 'center' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 999,
  },
  btnText: { fontFamily: fonts.bold, fontSize: 13, color: '#0B2350' },
});
