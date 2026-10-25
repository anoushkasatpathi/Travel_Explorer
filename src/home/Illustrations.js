// Vector illustrations for the landing page, drawn with react-native-svg so
// they stay sharp at any size and need no image files:
//   PaperPlane   – folded paper plane (hero, pricing panel)
//   PaperPeaks   – low-poly white "paper" mountains with Eiffel Tower,
//                  Big Ben and a sail-shaped hotel on top
//   Cloud        – soft cloud made of overlapping circles
//   PolyHeart    – low-poly heart for the tip card

import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';

export function PaperPlane({ width = 300, dark = false }) {
  const h = (width * 200) / 320;
  const c = dark
    ? { top: '#EAF2FF', wing: '#C3D6F5', keel: '#93B2E3', shade: '#7898CC', edge: '#5F82BE' }
    : { top: '#FFFFFF', wing: '#E4EEFB', keel: '#C6DAF4', shade: '#A9C4EA', edge: '#9DB9E2' };
  return (
    <Svg width={width} height={h} viewBox="0 0 320 200">
      {/* soft shadow */}
      <Polygon points="300,12 40,140 150,150" fill="#0B2A5C" opacity={0.06} transform="translate(6,14)" />
      {/* far wing */}
      <Polygon points="305,8 150,122 172,192" fill={c.wing} stroke={c.edge} strokeWidth={0.8} />
      {/* keel / fold */}
      <Polygon points="305,8 150,122 160,150" fill={c.keel} stroke={c.edge} strokeWidth={0.8} />
      <Polygon points="150,122 172,192 160,150" fill={c.shade} />
      {/* near wing (top) */}
      <Polygon points="305,8 8,98 150,122" fill={c.top} stroke={c.edge} strokeWidth={0.8} />
      {/* crease highlight */}
      <Line x1="305" y1="8" x2="150" y2="122" stroke="#FFFFFF" strokeWidth={1.2} opacity={0.9} />
    </Svg>
  );
}

// Build a low-poly band of triangles between a ridge line and the bottom
function lowPoly(ridge, base, palette, seed = 1) {
  const tris = [];
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = 0; i < ridge.length - 1; i++) {
    const [ax, ay] = ridge[i];
    const [bx, by] = ridge[i + 1];
    const mx = (ax + bx) / 2 + (rand() - 0.5) * 20;
    const my = Math.min(base, Math.max(ay, by) + 40 + rand() * 40);
    const facingLight = by < ay; // slope going up to the right catches the light
    const pick = (o) => palette[Math.min(palette.length - 1, Math.max(0, o))];
    tris.push({ p: `${ax},${ay} ${bx},${by} ${mx},${my}`, f: pick(facingLight ? 0 : 2) });
    tris.push({ p: `${ax},${ay} ${mx},${my} ${ax},${base}`, f: pick(facingLight ? 1 : 3) });
    tris.push({ p: `${mx},${my} ${bx},${by} ${bx},${base}`, f: pick(facingLight ? 2 : 1) });
    tris.push({ p: `${ax},${base} ${mx},${my} ${bx},${base}`, f: pick(3) });
  }
  return tris;
}

const BACK_RIDGE = [[0, 330], [70, 280], [140, 300], [215, 215], [300, 260], [385, 175], [455, 235], [530, 150], [615, 205], [700, 140]];
const FRONT_RIDGE = [[0, 400], [90, 355], [175, 380], [265, 320], [350, 365], [450, 305], [560, 355], [640, 315], [700, 335]];

export function PaperPeaks({ width = 700, dark = false }) {
  const h = (width * 420) / 700;
  const back = dark ? ['#C7D8F2', '#A9C1E6', '#8EABD9', '#7795C7'] : ['#FFFFFF', '#EEF4FC', '#DCE8F8', '#CADCF3'];
  const front = dark ? ['#DCE7F7', '#BFD2EE', '#A6BEE3', '#90AAD5'] : ['#FFFFFF', '#F6F9FE', '#E8F0FB', '#D9E6F7'];
  const backTris = lowPoly(BACK_RIDGE, 420, back, 3);
  const frontTris = lowPoly(FRONT_RIDGE, 420, front, 7);
  const lm = dark ? '#E6EEFB' : '#FFFFFF';
  const lmShade = dark ? '#B3C7E8' : '#D6E4F6';
  const lmLine = dark ? '#8DA8D4' : '#AFC6E6';

  return (
    <Svg width={width} height={h} viewBox="0 0 700 420">
      {backTris.map((t, i) => (
        <Polygon key={`b${i}`} points={t.p} fill={t.f} stroke={back[2]} strokeWidth={0.4} />
      ))}

      {/* Eiffel Tower */}
      <G transform="translate(395,262)">
        <Path d="M-46,0 Q-20,-55 -9,-118 L-3,-170 L3,-170 L9,-118 Q20,-55 46,0 L26,0 Q0,-30 -26,0 Z" fill={lm} stroke={lmLine} strokeWidth={1} />
        <Path d="M0,-170 L3,-170 L9,-118 Q20,-55 46,0 L26,0 Q14,-14 0,-20 Z" fill={lmShade} opacity={0.6} />
        <Rect x={-22} y={-58} width={44} height={6} fill={lm} stroke={lmLine} strokeWidth={0.8} />
        <Rect x={-12} y={-112} width={24} height={5} fill={lm} stroke={lmLine} strokeWidth={0.8} />
        <Line x1={0} y1={-170} x2={0} y2={-186} stroke={lmLine} strokeWidth={1.5} />
      </G>

      {/* Big Ben */}
      <G transform="translate(520,215)">
        <Rect x={-14} y={-130} width={28} height={130} fill={lm} stroke={lmLine} strokeWidth={1} />
        <Rect x={0} y={-130} width={14} height={130} fill={lmShade} opacity={0.55} />
        <Rect x={-17} y={-150} width={34} height={22} fill={lm} stroke={lmLine} strokeWidth={1} />
        <Circle cx={0} cy={-139} r={7} fill="#FFFFFF" stroke={lmLine} strokeWidth={1.2} />
        <Line x1={0} y1={-139} x2={0} y2={-144} stroke={lmLine} strokeWidth={1} />
        <Line x1={0} y1={-139} x2={4} y2={-139} stroke={lmLine} strokeWidth={1} />
        <Rect x={-12} y={-165} width={24} height={15} fill={lm} stroke={lmLine} strokeWidth={1} />
        <Path d="M-12,-165 L0,-205 L12,-165 Z" fill={lm} stroke={lmLine} strokeWidth={1} />
        <Path d="M0,-205 L12,-165 L0,-165 Z" fill={lmShade} opacity={0.6} />
        {[-110, -90, -70, -50, -30].map((y) => (
          <Line key={y} x1={-14} y1={y} x2={14} y2={y} stroke={lmLine} strokeWidth={0.6} />
        ))}
      </G>

      {/* Sail-shaped hotel */}
      <G transform="translate(615,200)">
        <Path d="M-8,0 L-8,-150 Q50,-90 40,0 Z" fill={lm} stroke={lmLine} strokeWidth={1} />
        <Path d="M10,-120 Q50,-80 40,0 L14,0 Z" fill={lmShade} opacity={0.55} />
        <Line x1={-8} y1={-150} x2={-8} y2={-168} stroke={lmLine} strokeWidth={1.4} />
        {[-120, -95, -70, -45, -20].map((y, i) => (
          <Line key={y} x1={-8} y1={y} x2={10 + i * 6} y2={y + 6} stroke={lmLine} strokeWidth={0.6} />
        ))}
      </G>

      {frontTris.map((t, i) => (
        <Polygon key={`f${i}`} points={t.p} fill={t.f} stroke={front[2]} strokeWidth={0.4} />
      ))}
    </Svg>
  );
}

export function Cloud({ width = 220, opacity = 0.95, color = '#FFFFFF' }) {
  const h = width * 0.45;
  return (
    <Svg width={width} height={h} viewBox="0 0 220 100" opacity={opacity}>
      <Circle cx={60} cy={62} r={34} fill={color} />
      <Circle cx={100} cy={46} r={42} fill={color} />
      <Circle cx={145} cy={58} r={34} fill={color} />
      <Circle cx={180} cy={70} r={24} fill={color} />
      <Circle cx={30} cy={74} r={22} fill={color} />
      <Rect x={30} y={70} width={160} height={30} rx={15} fill={color} />
    </Svg>
  );
}

export function PolyHeart({ size = 110 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#CFE0F7" />
        </LinearGradient>
      </Defs>
      <Polygon points="50,90 10,50 30,48" fill="#DCE8F8" />
      <Polygon points="50,90 30,48 50,40" fill="#FFFFFF" />
      <Polygon points="50,90 50,40 70,48" fill="#E9F1FC" />
      <Polygon points="50,90 70,48 90,50" fill="#C8DAF3" />
      <Polygon points="10,50 8,28 30,48" fill="#EEF4FC" />
      <Polygon points="8,28 28,14 30,48" fill="url(#hg)" />
      <Polygon points="28,14 50,40 30,48" fill="#F7FAFF" />
      <Polygon points="50,40 72,14 70,48" fill="#DFEAF9" />
      <Polygon points="72,14 92,28 70,48" fill="#CCDDF4" />
      <Polygon points="92,28 90,50 70,48" fill="#B9CEEE" />
    </Svg>
  );
}
