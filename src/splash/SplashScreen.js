// Animated splash screen: a 3D rotating globe in space.
//
// Effects (all drawn with react-native-svg, re-rendered every animation frame):
//   • deep-space background with twinkling stars, shooting stars and a soft nebula glow
//   • globe "spins in" fast and settles into a slow rotation, with a soft floor shadow
//   • drifting cloud layer that rotates a little faster than the land
//   • sonar-style ripple rings pulsing out from the globe
//   • gold pins pop up on every destination in the app
//   • glowing gold flight paths arc from India to cities abroad
//   • an airplane with a contrail orbits the globe (behind + in front of it),
//     plus a small satellite on a second, differently tilted orbit
//   • lens sparkle, letter-by-letter title reveal and a loading bar
//
// How the "3D" works (no 3D library needed):
//   Points are stored as longitude/latitude. Each frame we rotate them by the
//   current spin angle and use an orthographic projection (how a globe looks
//   from far away) to get x/y on screen. z tells us if a point faces us (z > 0)
//   or is on the far side.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { CONTINENTS, densify } from './worldShapes';
import { destinations } from '../data/destinations';

const DEG = Math.PI / 180;
const TILT = 18 * DEG; // tip the north pole towards the viewer
const ORBIT_TILT = -16 * DEG; // airplane orbit tilt
const SAT_TILT = 28 * DEG; // satellite orbit tilt
const SPIN_MS = 16000; // one slow globe rotation
const ORBIT_MS = 3600; // one airplane lap
const SAT_MS = 5200; // one satellite lap
const MIN_SHOW_MS = 3600; // keep the splash up at least this long
const TITLE = 'Travel Explorer';

// ---------- static geometry (computed once) ----------
const LAND = CONTINENTS.map((p) => densify(p));
const MERIDIANS = Array.from({ length: 12 }, (_, i) => Array.from({ length: 37 }, (_, k) => [i * 30 - 180, -90 + k * 5]));
const PARALLELS = [-60, -30, 0, 30, 60].map((lat) => Array.from({ length: 73 }, (_, k) => [-180 + k * 5, lat]));

// Tiny seeded random generator so stars/clouds are the same every launch
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const CLOUDS = (() => {
  const r = rng(7);
  return Array.from({ length: 14 }, () => {
    const lon = r() * 360 - 180;
    const lat = r() * 110 - 55;
    const rad = 6 + r() * 9;
    return Array.from({ length: 20 }, (_, k) => {
      const a = (k / 20) * 2 * Math.PI;
      const wobble = 1 + 0.25 * Math.sin(a * 3 + lon);
      return [lon + (rad * wobble * Math.cos(a) * 1.6) / Math.max(0.3, Math.cos(lat * DEG)), lat + rad * wobble * Math.sin(a) * 0.7];
    });
  });
})();

const PINS = destinations.map((d) => [d.coords.lon, d.coords.lat]);

const HUB = [77.2, 28.6]; // New Delhi
const ROUTES = ['dubai', 'london', 'singapore', 'tokyo', 'paris', 'newyork', 'bali', 'maldives']
  .map((id) => destinations.find((d) => d.id === id))
  .filter(Boolean)
  .map((d) => [d.coords.lon, d.coords.lat]);

// ---------- maths helpers ----------
// Rotate a lon/lat point by the spin angle and tilt. Returns a unit vector;
// x right, y down (screen), z towards the viewer.
function rotate([lon, lat], spin) {
  const l = lon * DEG - spin;
  const p = lat * DEG;
  return {
    x: Math.cos(p) * Math.sin(l),
    y: -(Math.cos(TILT) * Math.sin(p) - Math.sin(TILT) * Math.cos(p) * Math.cos(l)),
    z: Math.sin(TILT) * Math.sin(p) + Math.cos(TILT) * Math.cos(p) * Math.cos(l),
  };
}

function polygonPath(points, spin, R) {
  let d = '';
  let anyVisible = false;
  points.forEach((pt, i) => {
    let { x, y, z } = rotate(pt, spin);
    if (z >= 0) anyVisible = true;
    else {
      const m = Math.hypot(x, y) || 1; // far side: squash onto the edge
      x /= m;
      y /= m;
    }
    d += `${i === 0 ? 'M' : 'L'}${(x * R).toFixed(1)},${(y * R).toFixed(1)}`;
  });
  return anyVisible ? d + 'Z' : '';
}

function linePath(points, spin, R) {
  let d = '';
  let pen = false;
  points.forEach((pt) => {
    const { x, y, z } = rotate(pt, spin);
    if (z < 0) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${(x * R).toFixed(1)},${(y * R).toFixed(1)}`;
    pen = true;
  });
  return d;
}

// Great-circle points between two lon/lat positions (for flight paths)
function toVec([lon, lat]) {
  const l = lon * DEG;
  const p = lat * DEG;
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
}
function toLonLat([x, y, z]) {
  return [Math.atan2(y, x) / DEG, Math.asin(Math.max(-1, Math.min(1, z))) / DEG];
}
function greatCircle(a, b, n = 48) {
  const va = toVec(a);
  const vb = toVec(b);
  const dot = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const w = Math.acos(dot);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const s1 = Math.sin((1 - t) * w) / Math.sin(w);
    const s2 = Math.sin(t * w) / Math.sin(w);
    return { ll: toLonLat([s1 * va[0] + s2 * vb[0], s1 * va[1] + s2 * vb[1], s1 * va[2] + s2 * vb[2]]), t, w };
  });
}
const ARCS = ROUTES.map((dest) => greatCircle(HUB, dest));

function orbitPoint(a, rx, ry, tilt) {
  const x0 = rx * Math.cos(a);
  const y0 = ry * Math.sin(a);
  return { x: x0 * Math.cos(tilt) - y0 * Math.sin(tilt), y: x0 * Math.sin(tilt) + y0 * Math.cos(tilt), z: Math.sin(a) };
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

const PLANE_PATH =
  'M14,0 C14,1.6 12,2 10,2 L3,2 L-3,10 L-6,10 L-2,2 L-8,2 L-11,6 L-13,6 L-11,0 L-13,-6 L-11,-6 L-8,-2 L-2,-2 L-6,-10 L-3,-10 L3,-2 L10,-2 C12,-2 14,-1.6 14,0 Z';
const SPARKLE = 'M0,-10 C1,-2 2,-1 10,0 C2,1 1,2 0,10 C-1,2 -2,1 -10,0 C-2,-1 -1,-2 0,-10 Z';

export default function SplashScreen({ ready, onFinish }) {
  const { width, height } = useWindowDimensions();
  const [now, setNow] = useState(0);
  const startRef = useRef(null);
  const exit = useRef(new Animated.Value(0)).current;
  const [minTimePassed, setMinTimePassed] = useState(false);

  const R = Math.min(width, 560) * 0.26;
  const size = R * 3.5;
  const c = size / 2;

  const stars = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: 90 }, () => ({
      x: r() * width,
      y: r() * height,
      r: 0.4 + r() * 1.3,
      phase: r() * Math.PI * 2,
      speed: 0.6 + r() * 2,
      gold: r() > 0.88,
    }));
  }, [width, height]);

  // Animation loop
  useEffect(() => {
    let raf;
    const tick = (t) => {
      if (startRef.current === null) startRef.current = t;
      setNow(t - startRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const timer = setTimeout(() => setMinTimePassed(true), MIN_SHOW_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);

  // Leave when the app is ready AND the minimum time has passed: zoom + fade
  useEffect(() => {
    if (!ready || !minTimePassed) return;
    Animated.timing(exit, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(
      () => onFinish && onFinish()
    );
  }, [ready, minTimePassed, exit, onFinish]);

  // ---------- per-frame values ----------
  const intro = easeOutCubic(clamp01(now / 1100)); // 0 -> 1 during the first second
  // Spin-in: starts fast, eases into the slow rotation
  const spin = (now / SPIN_MS) * 2 * Math.PI + 2.4 * (1 - Math.exp(-now / 700)) - 100 * DEG;
  const globeScale = 0.55 + 0.45 * easeOutBack(clamp01(now / 1200));
  const bob = Math.sin((now / 2600) * 2 * Math.PI) * 4;

  const land = LAND.map((p) => polygonPath(p, spin, R)).filter(Boolean);
  const grid = [...MERIDIANS, ...PARALLELS].map((p) => linePath(p, spin, R)).filter(Boolean);
  const clouds = CLOUDS.map((p) => polygonPath(p, spin * 1.35 + 0.8, R * 1.012)).filter(Boolean);

  // Pins pop in one by one
  const pins = PINS.map((pt, i) => {
    const { x, y, z } = rotate(pt, spin);
    const t = clamp01((now - 700 - i * 40) / 420);
    return { x: x * R, y: y * R, z, s: t > 0 ? easeOutBack(t) : 0, i };
  }).filter((p) => p.z > 0.05 && p.s > 0);

  // Flight arcs: a new one starts every 650 ms, each draws for 1.1 s then fades
  const ARC_EVERY = 650;
  const ARC_DRAW = 1100;
  const ARC_LIFE = 2000;
  const arcStart = 1300;
  const arcs = [];
  if (now > arcStart) {
    const k = Math.floor((now - arcStart) / ARC_EVERY);
    for (let j = Math.max(0, k - 3); j <= k; j++) {
      const age = now - arcStart - j * ARC_EVERY;
      if (age < 0 || age > ARC_LIFE) continue;
      const pts = ARCS[j % ARCS.length];
      const progress = clamp01(age / ARC_DRAW);
      const fade = age > ARC_DRAW ? 1 - (age - ARC_DRAW) / (ARC_LIFE - ARC_DRAW) : 1;
      let d = '';
      let pen = false;
      let head = null;
      const last = Math.floor(progress * (pts.length - 1));
      for (let i = 0; i <= last; i++) {
        const { ll, t, w } = pts[i];
        const lift = 1 + Math.sin(Math.PI * t) * Math.min(0.28, w * 0.2);
        const v = rotate(ll, spin);
        const sx = v.x * lift;
        const sy = v.y * lift;
        const visible = v.z > 0 || Math.hypot(sx, sy) > 1; // above the horizon
        if (!visible) {
          pen = false;
          continue;
        }
        d += `${pen ? 'L' : 'M'}${(sx * R).toFixed(1)},${(sy * R).toFixed(1)}`;
        pen = true;
        if (i === last) head = { x: sx * R, y: sy * R };
      }
      if (d) arcs.push({ key: j, d, head: progress < 1 ? head : null, opacity: fade });
    }
  }

  // Airplane orbit
  const rx = R * 1.5;
  const ry = R * 0.42;
  const a = ((now / ORBIT_MS) * 2 * Math.PI) % (2 * Math.PI);
  const plane = orbitPoint(a, rx, ry, ORBIT_TILT);
  const ahead = orbitPoint(a + 0.02, rx, ry, ORBIT_TILT);
  const heading = Math.atan2(ahead.y - plane.y, ahead.x - plane.x) / DEG;
  const planeFront = plane.z > 0;
  const planeScale = 0.85 + (0.35 * (plane.z + 1)) / 2;

  // Satellite orbit (opposite direction)
  const sa = (-(now / SAT_MS) * 2 * Math.PI) % (2 * Math.PI);
  const sat = orbitPoint(sa, R * 1.28, R * 0.3, SAT_TILT);
  const satFront = sat.z > 0;

  const orbitSegs = useMemo(() => {
    const make = (rxx, ryy, tilt) =>
      Array.from({ length: 72 }, (_, i) => {
        const p1 = orbitPoint((i / 72) * 2 * Math.PI, rxx, ryy, tilt);
        const p2 = orbitPoint(((i + 1) / 72) * 2 * Math.PI, rxx, ryy, tilt);
        return { d: `M${p1.x},${p1.y}L${p2.x},${p2.y}`, front: (p1.z + p2.z) / 2 > 0, i };
      });
    return { plane: make(rx, ry, ORBIT_TILT), sat: make(R * 1.28, R * 0.3, SAT_TILT) };
  }, [rx, ry, R]);

  const trail = Array.from({ length: 16 }, (_, i) => {
    const p1 = orbitPoint(a - (i + 1) * 0.055, rx, ry, ORBIT_TILT);
    const p2 = orbitPoint(a - i * 0.055, rx, ry, ORBIT_TILT);
    return { d: `M${p1.x},${p1.y}L${p2.x},${p2.y}`, front: (p1.z + p2.z) / 2 > 0, opacity: 0.9 * (1 - i / 16) };
  });

  // Ripple rings every 2.4 s
  const ripples = [0, 800, 1600].map((offset) => {
    const t = ((now + 2400 - offset) % 2400) / 2400;
    return { r: R * (1.02 + t * 0.75), opacity: (1 - t) * 0.35 * intro };
  });

  // Shooting star every 2.8 s
  const SHOOT_EVERY = 2800;
  const shootK = Math.floor(now / SHOOT_EVERY);
  const shootT = (now % SHOOT_EVERY) / 750;
  let shooting = null;
  if (shootT < 1 && now > 600) {
    const r = rng(100 + shootK);
    const sx = width * (0.35 + r() * 0.6);
    const sy = height * (0.05 + r() * 0.3);
    const len = 140 + r() * 80;
    const travel = 260;
    const hx = sx - travel * shootT;
    const hy = sy + travel * 0.45 * shootT;
    const op = Math.sin(Math.PI * shootT);
    shooting = Array.from({ length: 8 }, (_, i) => {
      const f1 = i / 8;
      const f2 = (i + 1) / 8;
      return {
        d: `M${hx + len * f1},${hy - len * 0.45 * f1}L${hx + len * f2},${hy - len * 0.45 * f2}`,
        opacity: op * (1 - f1),
        w: 2.2 * (1 - f1) + 0.4,
      };
    });
  }

  const sparkle = 0.5 + 0.5 * Math.sin(now / 380);
  const progress = ready ? clamp01(now / MIN_SHOW_MS) : Math.min(0.85, now / MIN_SHOW_MS);

  const renderOrbit = (segs, front, color) =>
    segs
      .filter((s) => s.front === front && s.i % 2 === 0)
      .map((s) => <Path key={`o${color}${front}${s.i}`} d={s.d} stroke={color} strokeWidth={1.1} />);

  const renderTrail = (front) =>
    trail
      .filter((s) => s.front === front)
      .map((s, i) => (
        <Path key={`t${front}${i}`} d={s.d} stroke="#F2C94C" strokeOpacity={s.opacity} strokeWidth={2.4} strokeLinecap="round" />
      ));

  const renderPlane = () => (
    <G transform={`translate(${plane.x},${plane.y}) rotate(${heading}) scale(${planeScale})`} opacity={planeFront ? 1 : 0.4}>
      <Path d={PLANE_PATH} fill="#FFFFFF" stroke="#0E2A4D" strokeWidth={1} />
    </G>
  );

  const renderSat = () => (
    <G opacity={satFront ? 1 : 0.35}>
      <Circle cx={sat.x} cy={sat.y} r={7} fill="#7CC4FF" opacity={0.25} />
      <Circle cx={sat.x} cy={sat.y} r={2.6} fill="#DDF0FF" />
    </G>
  );

  const containerStyle = { opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) };
  const zoomStyle = { transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }] };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, containerStyle]} pointerEvents="none">
      {/* Space background, nebula, stars, shooting star */}
      <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor="#030A1C" />
            <Stop offset="0.55" stopColor="#071A3D" />
            <Stop offset="1" stopColor="#0B2A5C" />
          </LinearGradient>
          <RadialGradient id="neb1" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#1D6FE0" stopOpacity="0.45" />
            <Stop offset="1" stopColor="#1D6FE0" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="neb2" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#0BB5A8" stopOpacity="0.28" />
            <Stop offset="1" stopColor="#0BB5A8" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#bg)" />
        <Ellipse
          cx={width * 0.5}
          cy={height * 0.42}
          rx={R * 3.2 * (1 + 0.04 * Math.sin(now / 900))}
          ry={R * 2.6}
          fill="url(#neb1)"
          opacity={intro}
        />
        <Ellipse cx={width * 0.18} cy={height * 0.8} rx={R * 2.2} ry={R * 1.6} fill="url(#neb2)" opacity={intro} />
        <Ellipse cx={width * 0.9} cy={height * 0.15} rx={R * 1.8} ry={R * 1.3} fill="url(#neb2)" opacity={intro * 0.8} />
        {stars.map((s, i) => (
          <Circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={s.gold ? '#F2C94C' : '#FFFFFF'}
            opacity={intro * (0.25 + 0.75 * (0.5 + 0.5 * Math.sin((now / 1000) * s.speed + s.phase)))}
          />
        ))}
        {shooting &&
          shooting.map((seg, i) => (
            <Path key={`s${i}`} d={seg.d} stroke="#FFFFFF" strokeOpacity={seg.opacity} strokeWidth={seg.w} strokeLinecap="round" />
          ))}
      </Svg>

      <Animated.View style={[styles.center, zoomStyle]}>
        <View style={{ transform: [{ scale: globeScale }], opacity: intro }}>
          <Svg width={size} height={size * 1.05}>
            <Defs>
              <RadialGradient id="ocean" cx="40%" cy="35%" r="75%">
                <Stop offset="0" stopColor="#3B9BF0" />
                <Stop offset="0.5" stopColor="#1557B8" />
                <Stop offset="1" stopColor="#08245C" />
              </RadialGradient>
              <RadialGradient id="land" cx="40%" cy="35%" r="75%">
                <Stop offset="0" stopColor="#5BD39A" />
                <Stop offset="1" stopColor="#1C7A55" />
              </RadialGradient>
              <RadialGradient id="highlight" cx="34%" cy="28%" r="45%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.42" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="rim" cx="44%" cy="40%" r="62%">
                <Stop offset="0.58" stopColor="#020A1F" stopOpacity="0" />
                <Stop offset="1" stopColor="#020A1F" stopOpacity="0.6" />
              </RadialGradient>
              <RadialGradient id="atmo" cx="50%" cy="50%" r="50%">
                <Stop offset="0.8" stopColor="#7CC4FF" stopOpacity="0.5" />
                <Stop offset="1" stopColor="#7CC4FF" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="shadow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#000000" stopOpacity="0.6" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="pinGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#F2C94C" stopOpacity="0.8" />
                <Stop offset="1" stopColor="#F2C94C" stopOpacity="0" />
              </RadialGradient>
            </Defs>

            {/* Soft floor shadow */}
            <Ellipse
              cx={c}
              cy={c + R * 1.34}
              rx={R * 0.95 * (1 - bob / 60)}
              ry={R * 0.15 * (1 - bob / 60)}
              fill="url(#shadow)"
            />

            <G transform={`translate(${c},${c + bob})`}>
              {/* Ripples */}
              {ripples.map((rp, i) => (
                <Circle key={`r${i}`} r={rp.r} fill="none" stroke="#7CC4FF" strokeOpacity={rp.opacity} strokeWidth={1.4} />
              ))}

              {/* Far half of orbits */}
              {renderOrbit(orbitSegs.sat, false, 'rgba(124,196,255,0.16)')}
              {renderOrbit(orbitSegs.plane, false, 'rgba(255,255,255,0.18)')}
              {renderTrail(false)}
              {!planeFront && renderPlane()}
              {!satFront && renderSat()}

              {/* Globe body */}
              <Circle r={R * 1.14} fill="url(#atmo)" />
              <Circle r={R} fill="url(#ocean)" />
              {grid.map((d, i) => (
                <Path key={`g${i}`} d={d} stroke="#FFFFFF" strokeOpacity={0.1} strokeWidth={0.8} fill="none" />
              ))}
              {land.map((d, i) => (
                <Path key={`l${i}`} d={d} fill="url(#land)" stroke="#36B37E" strokeWidth={0.6} />
              ))}
              {clouds.map((d, i) => (
                <Path key={`c${i}`} d={d} fill="#FFFFFF" opacity={0.22} />
              ))}

              {/* Destination pins */}
              {pins.map((p) => (
                <G key={`p${p.i}`} transform={`translate(${p.x},${p.y}) scale(${p.s * (0.6 + 0.4 * p.z)})`}>
                  <Circle r={6} fill="url(#pinGlow)" />
                  <Circle r={2.2} fill="#F2C94C" stroke="#FFF6D6" strokeWidth={0.6} />
                </G>
              ))}

              <Circle r={R} fill="url(#rim)" />
              <Circle r={R} fill="url(#highlight)" />

              {/* Flight paths */}
              {arcs.map((arc) => (
                <G key={`a${arc.key}`} opacity={arc.opacity}>
                  <Path d={arc.d} stroke="#F2C94C" strokeOpacity={0.35} strokeWidth={4} fill="none" strokeLinecap="round" />
                  <Path d={arc.d} stroke="#FFE7A0" strokeWidth={1.4} fill="none" strokeLinecap="round" />
                  {arc.head && (
                    <G>
                      <Circle cx={arc.head.x} cy={arc.head.y} r={6} fill="url(#pinGlow)" />
                      <Circle cx={arc.head.x} cy={arc.head.y} r={2} fill="#FFFFFF" />
                    </G>
                  )}
                </G>
              ))}

              {/* Lens sparkle near the highlight */}
              <G transform={`translate(${-R * 0.5},${-R * 0.55}) scale(${0.6 + sparkle * 0.7}) rotate(${now / 40})`} opacity={0.35 + sparkle * 0.55}>
                <Path d={SPARKLE} fill="#FFFFFF" />
              </G>

              {/* Near half of orbits */}
              {renderOrbit(orbitSegs.sat, true, 'rgba(124,196,255,0.22)')}
              {renderOrbit(orbitSegs.plane, true, 'rgba(255,255,255,0.28)')}
              {renderTrail(true)}
              {planeFront && renderPlane()}
              {satFront && renderSat()}
            </G>
          </Svg>
        </View>

        {/* Title: letters rise in one by one */}
        <View style={styles.titleRow} accessibilityLabel={TITLE}>
          {TITLE.split('').map((ch, i) => {
            const t = easeOutCubic(clamp01((now - 600 - i * 45) / 450));
            return (
              <Text key={i} style={[styles.title, { opacity: t, transform: [{ translateY: (1 - t) * 14 }] }]}>
                {ch === ' ' ? ' ' : ch}
              </Text>
            );
          })}
        </View>
        <Text style={[styles.subtitle, { opacity: clamp01((now - 1400) / 600) }]}>
          Discover India & the world, one journey at a time
        </Text>

        {/* Gold shimmer line + loading bar */}
        <View style={[styles.bar, { opacity: clamp01((now - 1200) / 500) }]}>
          <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', marginTop: 4 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: 0.6, color: '#F3F7FD' },
  subtitle: { fontSize: 14, marginTop: 8, letterSpacing: 0.3, color: '#A9C2E6', textAlign: 'center', paddingHorizontal: 24 },
  bar: { width: 160, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 22, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2, backgroundColor: '#F2C94C' },
});
