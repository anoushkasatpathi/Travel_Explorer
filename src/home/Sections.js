// Landing-page sections that follow the template layout:
//   FeatureTiles · PopularPackages · PricingPlans · HowItWorks · StatsBand · Footer
// Template placeholders (fake ratings, "10K+ happy travellers", testimonials)
// are replaced with real data from this app.

import { useMemo, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import PlaceImage from '../components/PlaceImage';
import LiveTemp from '../components/LiveTemp';
import { PaperPlane, PolyHeart } from './Illustrations';
import { Logo } from '../navigation/TopNav';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useBuddies } from '../context/BuddyContext';
import { useHero } from '../hero/HeroContext';
import { destinations, getDestinationById, placeLabel } from '../data/destinations';
import { COUNTRIES } from '../data/countries';
import { formatMoney } from '../utils/money';
import { fonts } from '../fonts';

// ---------- shared ----------
export function SectionTitle({ children, action, onAction, light }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.sectionTitle, light && { color: '#fff' }]}>{children}</Text>
      {action && (
        <Pressable onPress={onAction} style={styles.sectionAction} accessibilityRole="button">
          <Text style={styles.sectionActionText}>{action}</Text>
          <View style={styles.arrowCircle}>
            <Ionicons name="arrow-forward" size={14} color="#1E6FE8" />
          </View>
        </Pressable>
      )}
    </View>
  );
}

// Paper-style icon tile with a folded corner
function PaperIcon({ icon, size = 64 }) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        backgroundColor: isDark ? '#16294A' : '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '-4deg' }],
        shadowColor: '#0B2A5C',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 0,
          height: 0,
          borderTopWidth: 16,
          borderLeftWidth: 16,
          borderTopColor: colors.bg,
          borderLeftColor: isDark ? '#2B4A7A' : '#D6E4F6',
          borderTopRightRadius: 14,
        }}
      />
      <MaterialCommunityIcons name={icon} size={size * 0.5} color={colors.accent} />
    </View>
  );
}

// ---------- Feature tiles ----------
const FEATURES = [
  { icon: 'weather-partly-cloudy', title: 'Live Weather', text: 'Real-time conditions & 5-day forecast via OpenWeather.', go: 'Destinations' },
  { icon: 'shield-check-outline', title: 'Local Essentials', text: 'Emergency helplines and etiquette tips.', go: 'Destinations' },
  { icon: 'swap-horizontal-circle-outline', title: 'Currency Converter', text: 'Live exchange rates for 12 currencies.', go: 'Destinations' },
  { icon: 'account-group-outline', title: 'Travel Buddies', text: 'Find people heading your way.', go: 'Buddies' },
];

export function FeatureTiles({ width, navigation }) {
  const styles = useThemedStyles(makeStyles);
  const wide = width >= 900;
  return (
    <View style={[styles.features, wide && { flexWrap: 'nowrap' }]}>
      {FEATURES.map((f) => (
        <Pressable
          key={f.title}
          onPress={() => navigation.navigate(f.go)}
          style={({ pressed }) => [styles.feature, wide ? { flex: 1 } : { flexBasis: width >= 600 ? '46%' : '100%', flexGrow: 1 }, pressed && { opacity: 0.8 }]}
        >
          <PaperIcon icon={f.icon} size={wide ? 68 : 54} />
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>{f.title}</Text>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

// ---------- Popular packages ----------
const PACKAGES = [
  { id: 'maldives', title: 'Maldives Paradise' },
  { id: 'bali', title: 'Bali Island Escape' },
  { id: 'tokyo', title: 'Japan Discovery' },
  { id: 'srinagar', title: 'Kashmir Valley Retreat' },
  { id: 'dubai', title: 'Dubai Luxe Getaway' },
  { id: 'ladakh', title: 'Ladakh Road Trip' },
  { id: 'paris', title: 'Classic Paris' },
  { id: 'goa', title: 'Goa Beach Break' },
];

export function PopularPackages({ width, navigation }) {
  const styles = useThemedStyles(makeStyles);
  const wide = width >= 900;
  const inner = Math.min(width, 1200) - (wide ? 80 : 32) - (wide ? 48 : 28);
  const cardW = wide ? (inner - 3 * 18) / 4 : 250;
  const items = PACKAGES.map((p) => ({ ...p, d: getDestinationById(p.id) })).filter((p) => p.d);

  const list = items.map((p, i) => <PackageCard key={p.id} pkg={p} width={cardW} navigation={navigation} index={i} />);

  return (
    <View style={styles.panel}>
      <SectionTitle action="View All Destinations" onAction={() => navigation.navigate('Destinations', { t: Date.now() })}>
        POPULAR PACKAGES
      </SectionTitle>
      {wide ? (
        <View style={styles.pkgGrid}>{list}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: 4 }}>
          {list}
        </ScrollView>
      )}
    </View>
  );
}

function PackageCard({ pkg, width, navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { openWithHero } = useHero();
  const imgRef = useRef(null);
  const press = useRef(new Animated.Value(1)).current;
  const d = pkg.d;
  const days = d.idealDays[1];
  const month = new Date().getMonth() + 1;
  const inSeason = d.bestMonths.includes(month);
  const spring = (v) => Animated.spring(press, { toValue: v, speed: 40, bounciness: 6, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ width, transform: [{ scale: press }] }}>
      <Pressable
        onPress={() => openWithHero(navigation, imgRef, d, 14)}
        onPressIn={() => spring(0.97)}
        onPressOut={() => spring(1)}
        style={styles.pkg}
        accessibilityLabel={`${pkg.title}, ${days} days, ${formatMoney(d.approxCost, 'INR')} per person`}
      >
        <PlaceImage ref={imgRef} wiki={d.wiki} category={d.category} style={styles.pkgImg} iconSize={36}>
          <LiveTemp coords={d.coords} style={{ position: 'absolute', top: 10, left: 10 }} />
          <View style={styles.fold} />
        </PlaceImage>
        <View style={styles.pkgBody}>
          <Text style={styles.pkgTitle} numberOfLines={1}>
            {pkg.title}
          </Text>
          <View style={styles.pkgMetaRow}>
            <View style={styles.pkgMeta}>
              <Ionicons name="location-sharp" size={12} color={colors.muted} />
              <Text style={styles.pkgMetaText} numberOfLines={1}>
                {placeLabel(d)}
              </Text>
            </View>
            <View style={styles.pkgMeta}>
              <MaterialCommunityIcons name="clock-outline" size={12} color={colors.muted} />
              <Text style={styles.pkgMetaText}>
                {days} Days / {days - 1} Nights
              </Text>
            </View>
          </View>
          <View style={styles.pkgBottom}>
            <View>
              <Text style={styles.price}>{formatMoney(d.approxCost, 'INR')}</Text>
              <Text style={styles.per}>Per Person (approx.)</Text>
            </View>
            {inSeason && (
              <View style={styles.season}>
                <Text style={styles.seasonText}>In season</Text>
              </View>
            )}
            <View style={styles.goBtn}>
              <Ionicons name="arrow-forward" size={16} color="#1E6FE8" />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ---------- Pricing ----------
const PLANS = [
  {
    name: 'Economy',
    tag: 'Great value for smart travellers',
    budget: 15000,
    where: 'india',
    perks: ['Trains or budget flights', 'Hostels & homestays', 'Local transport', 'Street-food trails'],
  },
  {
    name: 'Premium',
    tag: 'Comfort and convenience',
    budget: 45000,
    where: 'all',
    popular: true,
    perks: ['Economy flights', '3–4 star hotels', 'Airport transfers', 'City tours', 'Weekend getaways abroad'],
  },
  {
    name: 'Business',
    tag: 'International & flexible',
    budget: 100000,
    where: 'abroad',
    perks: ['International flights', '4–5 star hotels', 'Guided day tours', 'Travel insurance', 'Lounge access'],
  },
  {
    name: 'Luxury',
    tag: 'The ultimate travel experience',
    budget: 200000,
    where: 'abroad',
    perks: ['Premium-cabin flights', 'Luxury resorts & villas', 'Private transfers', 'Exclusive experiences', '24/7 concierge'],
  },
];

export function PricingPlans({ width, navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { isDark } = useTheme();
  const wide = width >= 900;
  const select = (p) => navigation.navigate('Packages', { budget: p.budget, where: p.where, plan: p.name, t: Date.now() });

  const cards = PLANS.map((p) => (
    <View key={p.name} style={[styles.plan, wide ? { flex: 1 } : { width: 230 }, p.popular && styles.planPopular]}>
      {p.popular && (
        <View style={styles.ribbon}>
          <Text style={styles.ribbonText}>Most Popular</Text>
        </View>
      )}
      <Text style={styles.planName}>{p.name}</Text>
      <Text style={styles.planTag}>{p.tag}</Text>
      <Text style={styles.planPrice}>{formatMoney(p.budget, 'INR')}</Text>
      <Text style={styles.planPer}>Per Person budget</Text>
      <View style={styles.perks}>
        {p.perks.map((k) => (
          <View key={k} style={styles.perk}>
            <Ionicons name="checkmark" size={14} color="#1E6FE8" />
            <Text style={styles.perkText}>{k}</Text>
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <Pressable
        onPress={() => select(p)}
        style={({ pressed }) => [styles.planBtn, p.popular && styles.planBtnSolid, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel={`Select ${p.name} plan`}
      >
        <Text style={[styles.planBtnText, p.popular && { color: '#fff' }]}>Select Plan</Text>
      </Pressable>
    </View>
  ));

  return (
    <View style={styles.pricing}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={isDark ? '#0B2350' : '#2A7DE6'} />
            <Stop offset="1" stopColor={isDark ? '#123A7A' : '#7DB8F7'} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" rx={22} fill="url(#pg)" />
      </Svg>
      <View style={[styles.pricingInner, wide && { flexDirection: 'row' }]}>
        <View style={wide ? { width: 190 } : { marginBottom: 6 }}>
          <Text style={[styles.sectionTitle, { color: '#fff' }]}>PRICING GUIDES</Text>
          <View style={styles.pricingRule} />
          <Text style={styles.pricingNote}>Budget per person. Pick a plan to see destinations that fit it.</Text>
          {wide && (
            <View style={{ marginTop: 30, marginLeft: -10 }}>
              <PaperPlane width={190} />
            </View>
          )}
        </View>
        {wide ? (
          <View style={styles.planRow}>{cards}</View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 18, paddingBottom: 4 }}>
            {cards}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// ---------- How it works ----------
const STEPS = [
  { icon: 'map-marker-radius', title: '1. Choose Destination', text: 'Browse 41 places or let the Trip Matcher pick.' },
  { icon: 'notebook-edit-outline', title: '2. Plan Your Days', text: 'Build a 3-day checklist and trip notes.' },
  { icon: 'weather-partly-cloudy', title: '3. Check Weather & Money', text: 'Live forecast, rates and local helplines.' },
  { icon: 'send', title: '4. Enjoy Your Trip', text: 'Share plans and travel with buddies.' },
];

export function HowItWorks({ width }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const wide = width >= 900;
  return (
    <View style={styles.panel}>
      <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: 18 }]}>HOW IT WORKS</Text>
      <View style={[styles.steps, wide && { flexWrap: 'nowrap' }]}>
        {STEPS.map((s, i) => (
          <View key={s.title} style={[styles.step, wide ? { flex: 1 } : { flexBasis: width >= 600 ? '46%' : '100%', flexGrow: 1 }]}>
            <View style={styles.stepIcon}>
              <MaterialCommunityIcons name={s.icon} size={34} color="#fff" style={s.icon === 'send' ? { transform: [{ rotate: '-25deg' }] } : null} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
            {wide && i < STEPS.length - 1 && (
              <MaterialCommunityIcons name="dots-horizontal" size={22} color={colors.accent} style={{ marginHorizontal: 4 }} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------- Stats + tip ----------
export function StatsBand({ width }) {
  const styles = useThemedStyles(makeStyles);
  const { isDark } = useTheme();
  const { posts } = useBuddies();
  const wide = width >= 900;

  // Pick one etiquette tip per day
  const tip = useMemo(() => {
    const dayNo = Math.floor(Date.now() / 86400000);
    const d = destinations[dayNo % destinations.length];
    return { text: d.etiquette[dayNo % d.etiquette.length], place: d.name };
  }, []);

  const stats = [
    { icon: 'airplane', value: `${destinations.length}`, label: 'Destinations' },
    { icon: 'earth', value: `${Object.keys(COUNTRIES).length}`, label: 'Countries' },
    { icon: 'account-group-outline', value: `${posts.length}`, label: 'Trip Posts' },
    { icon: 'phone-in-talk-outline', value: '24/7', label: 'Local Helplines' },
  ];

  return (
    <View style={[styles.stats, wide && { flexDirection: 'row' }]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="sg" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={isDark ? '#0B2350' : '#1E6FE8'} />
            <Stop offset="1" stopColor={isDark ? '#173E7C' : '#4D9AF2'} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" rx={22} fill="url(#sg)" />
      </Svg>
      <View style={[styles.statRow, wide && { flex: 1.2 }]}>
        {stats.map((s, i) => (
          <View key={s.label} style={[styles.stat, i > 0 && wide && styles.statDivider, !wide && { flexBasis: '46%' }]}>
            <MaterialCommunityIcons name={s.icon} size={28} color="#fff" />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.tip, wide && { flex: 1 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.quote}>“</Text>
          <Text style={styles.tipText}>{tip.text}.</Text>
          <Text style={styles.tipBy}>— Travel tip of the day · {tip.place}</Text>
        </View>
        <PolyHeart size={wide ? 100 : 72} />
      </View>
    </View>
  );
}

// ---------- Footer ----------
export function Footer({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const links = [
    ['Destinations', 'Destinations'],
    ['Packages', 'Packages'],
    ['Buddies', 'Buddies'],
    ['My Trips', 'MyTrips'],
  ];
  return (
    <View style={styles.footer}>
      <View style={styles.footerInner}>
        <Logo compact />
        <View style={styles.footerLinks}>
          {links.map(([label, route]) => (
            <Pressable key={route} onPress={() => navigation.navigate(route)}>
              <Text style={styles.footerLink}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.footerSmall}>
          Weather: OpenWeather (backup Open-Meteo) · Rates: ExchangeRate-API · Photos: Wikipedia / Wikimedia Commons
        </Text>
        <Text style={styles.footerSmall}>Built with React Native & Expo for the GDGC VNRVJIET App Development assignment.</Text>
      </View>
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
    sectionTitle: { fontFamily: fonts.heading, fontSize: 18, letterSpacing: 0.8, color: c.accentDeep === '#0F3E8C' ? '#123B7A' : c.ink },
    sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionActionText: { fontFamily: fonts.bold, fontSize: 12, color: c.accent },
    arrowCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1.5,
      borderColor: '#1E6FE8',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff',
    },
    panel: {
      backgroundColor: c.card,
      borderRadius: 22,
      padding: 22,
      borderWidth: 1,
      borderColor: c.line,
      shadowColor: '#0B2A5C',
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    // features
    features: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    feature: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 },
    featureTitle: { fontFamily: fonts.bold, fontSize: 14, color: c.ink },
    featureText: { fontSize: 12, color: c.muted, marginTop: 3, lineHeight: 17 },
    // packages
    pkgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
    pkg: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.line,
      overflow: 'hidden',
      shadowColor: '#0B2A5C',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    pkgImg: { height: 160 },
    fold: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 0,
      height: 0,
      borderTopWidth: 26,
      borderLeftWidth: 26,
      borderTopColor: c.card,
      borderLeftColor: 'rgba(214,228,246,0.95)',
    },
    pkgBody: { padding: 14 },
    pkgTitle: { fontFamily: fonts.bold, fontSize: 15, color: c.ink },
    pkgMetaRow: { gap: 4, marginTop: 8 },
    pkgMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
    pkgMetaText: { fontSize: 11, color: c.muted, flexShrink: 1 },
    pkgBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
    price: { fontFamily: fonts.heading, fontSize: 19, color: c.accent },
    per: { fontSize: 10, color: c.muted, marginTop: 1 },
    season: { marginLeft: 'auto', backgroundColor: c.accentSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    seasonText: { fontSize: 10, fontWeight: '800', color: c.accentDeep },
    goBtn: {
      marginLeft: 'auto',
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // pricing
    pricing: { borderRadius: 22, overflow: 'hidden' },
    pricingInner: { padding: 22, gap: 16 },
    pricingRule: { width: 34, height: 3, backgroundColor: '#fff', borderRadius: 2, marginTop: 10 },
    pricingNote: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 10, lineHeight: 17 },
    planRow: { flex: 1, flexDirection: 'row', gap: 14, alignItems: 'stretch', paddingTop: 18 },
    plan: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      minHeight: 360,
      shadowColor: '#0B2A5C',
      shadowOpacity: 0.12,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    planPopular: { transform: [{ translateY: -14 }], borderWidth: 2, borderColor: '#FFFFFF' },
    ribbon: { position: 'absolute', top: -12, backgroundColor: '#123B7A', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 6 },
    ribbonText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    planName: { fontFamily: fonts.heading, fontSize: 18, color: c.ink, marginTop: 6 },
    planTag: { fontSize: 11, color: c.muted, textAlign: 'center', marginTop: 4, minHeight: 28 },
    planPrice: { fontFamily: fonts.heading, fontSize: 26, color: c.accent, marginTop: 8 },
    planPer: { fontSize: 11, color: c.muted },
    perks: { alignSelf: 'stretch', marginTop: 14, gap: 7 },
    perk: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    perkText: { fontSize: 12, color: c.ink, flexShrink: 1 },
    planBtn: {
      alignSelf: 'stretch',
      marginTop: 16,
      height: 40,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: '#1E6FE8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    planBtnSolid: { backgroundColor: '#1E6FE8' },
    planBtnText: { fontFamily: fonts.bold, fontSize: 13, color: '#1E6FE8' },
    // steps
    steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepIcon: {
      width: 62,
      height: 62,
      borderRadius: 18,
      backgroundColor: '#1E6FE8',
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '-6deg' }],
      shadowColor: '#1E6FE8',
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    stepTitle: { fontFamily: fonts.bold, fontSize: 13, color: c.ink },
    stepText: { fontSize: 12, color: c.muted, marginTop: 3, lineHeight: 17 },
    // stats
    stats: { borderRadius: 22, overflow: 'hidden', padding: 22, gap: 18 },
    statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    stat: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 6, minWidth: 110 },
    statDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.3)' },
    statValue: { fontFamily: fonts.heading, fontSize: 26, color: '#fff' },
    statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
    tip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderRadius: 16,
      padding: 16,
    },
    quote: { fontFamily: fonts.black, fontSize: 36, color: '#fff', lineHeight: 36, height: 26 },
    tipText: { fontSize: 14, color: '#fff', lineHeight: 20, fontWeight: '600' },
    tipBy: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 8 },
    // footer
    footer: { backgroundColor: c.sidebar, marginTop: 30 },
    footerInner: { width: '100%', maxWidth: 1200, alignSelf: 'center', padding: 28, gap: 14 },
    footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 22 },
    footerLink: { color: '#fff', fontFamily: fonts.semi, fontSize: 14 },
    footerSmall: { color: c.sidebarInk, fontSize: 12, lineHeight: 18 },
  });
