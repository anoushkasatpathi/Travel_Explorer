// Full-bleed destination slides with a continuous vertical wipe (motion reference a + b):
//  - swipe up/down (mouse wheel or ↑/↓ keys on the web) to change destination
//  - the current photo slides UP and out while the next one rises from the
//    BOTTOM with its giant title trailing slightly (parallax)
//  - the tint behind the frame cross-fades to the new destination's colour
//  - a thin vertical progress line on the right edge shows where you are
//  - "See details" expands in place (shrinking title, dimmed photo, fading
//    description, sliding cards); "Open full guide" flies into Details.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HeroSlide from './HeroSlide';
import StageDetails from './StageDetails';
import GalleryViewer from '../components/GalleryViewer';
import { stageStyle } from './stageStyles';
import { DUR, EASE, EASE_IN_OUT, tween } from '../motion/motion';
import { fonts } from '../fonts';

export default function HeroDeck({ items, width, height, active = true, renderNav, onOpenGuide, initialIndex = 0 }) {
  const wide = width >= 900;
  const m = wide ? 18 : 10;
  const W = Math.max(0, width - m * 2);
  const H = Math.max(0, height - m * 2);
  const n = items.length;

  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(0, n - 1)));
  const [incoming, setIncoming] = useState(null); // { index, dir }
  const [expanded, setExpanded] = useState(false);
  const [viewer, setViewer] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const tintV = useRef(new Animated.Value(1)).current;
  const expandV = useRef(new Animated.Value(0)).current;
  const revealV = useRef(new Animated.Value(0)).current;
  const progV = useRef(new Animated.Value(n ? 1 / n : 0)).current;
  const busy = useRef(false);
  const imageRef = useRef(null);
  const [tints, setTints] = useState(() => {
    const t = stageStyle(items[0]).tint;
    return [t, t];
  });

  // Reset when the filtered list changes
  useEffect(() => {
    setIndex(0);
    setIncoming(null);
    setExpanded(false);
    expandV.setValue(0);
    revealV.setValue(0);
    anim.setValue(0);
    busy.current = false;
    const t = items[0] ? stageStyle(items[0]).tint : '#1C3B6E';
    setTints([t, t]);
    progV.setValue(n ? 1 / n : 0);
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback(
    (dir) => {
      if (busy.current || expanded || n < 2) return;
      const next = (index + dir + n) % n;
      busy.current = true;
      setIncoming({ index: next, dir });
      setTints([stageStyle(items[index]).tint, stageStyle(items[next]).tint]);
      tintV.setValue(0);
      anim.setValue(0);
      Animated.parallel([
        tween(anim, 1, { duration: 900, easing: EASE_IN_OUT }),
        tween(tintV, 1, { duration: 900, easing: EASE_IN_OUT, native: false }),
        tween(progV, (next + 1) / n, { duration: 900, native: false }),
      ]).start(() => {
        setIndex(next);
        setIncoming(null);
        anim.setValue(0);
        busy.current = false;
      });
    },
    [index, n, expanded, items, anim, tintV, progV]
  );

  const seeDetails = useCallback(() => {
    if (busy.current) return;
    setExpanded(true);
    Animated.parallel([tween(expandV, 1, { duration: 900 }), tween(revealV, 1, { duration: 1200, delay: 350 })]).start();
  }, [expandV, revealV]);

  const collapse = useCallback(() => {
    Animated.parallel([tween(revealV, 0, { duration: DUR.fast }), tween(expandV, 0, { duration: DUR.med, delay: 120 })]).start(() => setExpanded(false));
  }, [expandV, revealV]);

  // Touch: vertical swipe
  const goRef = useRef(go);
  goRef.current = go;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 14 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2,
        onPanResponderRelease: (_, g) => {
          if (g.dy < -50 || g.vy < -0.6) goRef.current(1);
          else if (g.dy > 50 || g.vy > 0.6) goRef.current(-1);
        },
      }),
    []
  );

  // Web: mouse wheel + keyboard
  const rootRef = useRef(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return undefined;
    const el = rootRef.current;
    let acc = 0;
    const onWheel = (e) => {
      if (expanded) return;
      e.preventDefault();
      acc += e.deltaY;
      if (Math.abs(acc) > 60) {
        goRef.current(acc > 0 ? 1 : -1);
        acc = 0;
      }
    };
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowDown') goRef.current(1);
      if (e.key === 'ArrowUp') goRef.current(-1);
      if (e.key === 'Escape' && expanded) collapse();
    };
    el?.addEventListener?.('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      el?.removeEventListener?.('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [active, expanded, collapse]);

  if (!n) return null;

  const cur = items[index];
  const nxt = incoming ? items[incoming.index] : null;
  const dir = incoming?.dir || 1;
  const bg = tintV.interpolate({ inputRange: [0, 1], outputRange: tints });

  const curY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -dir * H] });
  const nxtY = anim.interpolate({ inputRange: [0, 1], outputRange: [dir * H, 0] });
  const nxtTitle = anim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [dir * H * 0.45, dir * H * 0.3, 0] });
  const curTitle = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -dir * H * 0.12] });

  const titleTarget = { left: 24, top: wide ? 86 : 70 };
  const smallTitle = wide ? 46 : 34;
  const titleMax = wide ? Math.min(260, H * 0.42) : Math.min(150, H * 0.24);

  return (
    <Animated.View ref={rootRef} style={[styles.root, { width, height, backgroundColor: bg }]}>
      <View style={[styles.frame, { left: m, top: m, width: W, height: H }]} {...pan.panHandlers}>
        {/* current slide */}
        <Animated.View key={cur.id} style={[StyleSheet.absoluteFill, { transform: [{ translateY: curY }] }]}>
          <HeroSlide
            destination={cur}
            width={W}
            height={H}
            expand={expandV}
            titleMax={titleMax}
            smallTitle={smallTitle}
            titleTarget={titleTarget}
            titleOffset={curTitle}
            onSeeDetails={seeDetails}
            imageRef={imageRef}
          >
            {expanded && (
              <StageDetails
                destination={cur}
                width={W}
                height={H}
                reveal={revealV}
                top={titleTarget.top + smallTitle + 16}
                onOpenGuide={() => onOpenGuide?.(cur, imageRef)}
                onCardPress={(i) => setViewer(i)}
              />
            )}
          </HeroSlide>
        </Animated.View>

        {/* incoming slide */}
        {nxt && (
          <Animated.View key={nxt.id} style={[StyleSheet.absoluteFill, { transform: [{ translateY: nxtY }] }]}>
            <HeroSlide destination={nxt} width={W} height={H} titleMax={titleMax} titleOffset={nxtTitle} onSeeDetails={() => {}} />
          </Animated.View>
        )}

        {/* floating minimal nav */}
        <View style={styles.nav} pointerEvents="box-none">
          {renderNav?.({ index, n, destination: cur, expanded, collapse })}
        </View>

        {/* right-edge progress line */}
        <View style={styles.progressWrap} pointerEvents="none">
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { transform: [{ scaleY: progV }] }]} />
          </View>
        </View>

        {/* arrows / collapse */}
        {!expanded ? (
          <View style={styles.arrows}>
            <Pressable onPress={() => go(-1)} style={styles.arrow} accessibilityLabel="Previous destination">
              <Ionicons name="chevron-up" size={18} color="#fff" />
            </Pressable>
            <Pressable onPress={() => go(1)} style={styles.arrow} accessibilityLabel="Next destination">
              <Ionicons name="chevron-down" size={18} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={collapse} style={[styles.arrow, styles.closeBtn]} accessibilityLabel="Close details">
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        )}

        {!expanded && !wide && (
          <View style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>Swipe up for the next place</Text>
          </View>
        )}
      </View>

      <GalleryViewer visible={viewer !== null} startIndex={Math.min(viewer ?? 0, cur.attractions.length - 1)} destination={cur} onClose={() => setViewer(null)} />
    </Animated.View>
  );
}

const glass = {
  backgroundColor: 'rgba(255,255,255,0.14)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.28)',
};

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  frame: { position: 'absolute', borderRadius: 28, overflow: 'hidden', backgroundColor: '#0B1F3F' },
  nav: { position: 'absolute', left: 0, right: 0, top: 0 },
  progressWrap: { position: 'absolute', right: 12, top: '28%', bottom: '28%', justifyContent: 'center' },
  progressTrack: { width: 2, height: '100%', borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  progressFill: { width: '100%', height: '100%', backgroundColor: '#fff', transformOrigin: 'top' },
  arrows: { position: 'absolute', right: 26, bottom: 28, gap: 8 },
  arrow: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', ...glass },
  closeBtn: { position: 'absolute', right: 26, top: 74 },
  hint: { position: 'absolute', left: 0, right: 0, bottom: 10, alignItems: 'center' },
  hintText: { fontFamily: fonts.semi, fontSize: 10, color: 'rgba(255,255,255,0.75)', letterSpacing: 1 },
});

export const deckGlass = glass;
