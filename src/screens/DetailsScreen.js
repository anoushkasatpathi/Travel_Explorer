// Destination Details: Stage 2 (description, best time, attractions)
// + full-bleed photo stage with the giant depth title that shrinks to the
// top-left, a dimmed photo, a fading description and sliding attraction cards
// (same motion as the Destinations hero view), then live weather, Google Maps,
// local essentials, currency, buddies and the Add/Remove wishlist button.

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getDestinationById, isAbroad, placeLabel } from '../data/destinations';
import { getCountry } from '../data/countries';
import { useWishlist } from '../context/WishlistContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import CategoryPill from '../components/CategoryPill';
import WeatherCard, { ForecastStrip } from '../components/WeatherCard';
import EmptyState from '../components/EmptyState';
import HeroSlide from '../stage/HeroSlide';
import StageDetails from '../stage/StageDetails';
import GalleryViewer from '../components/GalleryViewer';
import { tween } from '../motion/motion';
import LocalInfoCard from '../components/LocalInfoCard';
import CurrencyConverter from '../components/CurrencyConverter';
import BuddyTeaser from '../components/BuddyTeaser';
import { openInMaps } from '../utils/maps';
import { shareDestination } from '../utils/share';
import { radius, shadow } from '../theme';
import { useHero, detailsStageHeight } from '../hero/HeroContext';

const MAX_WIDTH = 760;

export default function DetailsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { isWishlisted, toggle } = useWishlist();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const d = getDestinationById(route.params?.id);
  const { closeWithHero } = useHero();
  const scrollY = useRef(0);
  const { width } = useWindowDimensions();
  const stageH = detailsStageHeight();
  const wide = width >= 900;
  const [viewer, setViewer] = useState(null);

  // Stage: start with the giant title, then shrink it and reveal the details
  const expandV = useRef(new Animated.Value(0)).current;
  const revealV = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const wait = route.params?.hero ? 700 : 450; // let the hero flight land first
    Animated.parallel([tween(expandV, 1, { duration: 900, delay: wait }), tween(revealV, 1, { duration: 1200, delay: wait + 350 })]).start();
    Animated.loop(
      Animated.sequence([tween(bounce, 1, { duration: 900, delay: 1800 }), tween(bounce, 0, { duration: 900 })])
    ).start();
  }, [expandV, revealV, bounce, route.params?.hero]);

  // Micro-animation: the content sheet slides up and fades in
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 480,
      delay: route.params?.hero ? 180 : 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, route.params?.hero]);

  const goBack = () => {
    if (route.params?.hero && d) closeWithHero(navigation, d, scrollY.current);
    else navigation.goBack();
  };

  if (!d) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon="alert-circle-outline"
          title="Destination not found"
          message="It may have been removed."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  const saved = isWishlisted(d.id);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
        }}
      >
        {/* Full-bleed stage */}
          <HeroSlide
            destination={d}
            width={width}
            height={stageH}
            expand={expandV}
            titleMax={wide ? 260 : 150}
            smallTitle={wide ? 48 : 34}
            titleTarget={{ left: 24, top: insets.top + 70 }}
            showSeeDetails={false}
          >
            <StageDetails
              destination={d}
              width={width}
              height={stageH}
              reveal={revealV}
              top={insets.top + 70 + (wide ? 48 : 34) + 16}
              showShare={false}
              onCardPress={(i) => setViewer(Math.min(i, d.attractions.length - 1))}
            />
            <View style={[styles.heroButtons, { top: insets.top + 12 }]}>
              <Pressable onPress={goBack} style={styles.glassBtn} accessibilityLabel="Go back">
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </Pressable>
              <View style={styles.heroRight}>
                <Pressable
                  onPress={() => shareDestination(d)}
                  style={({ pressed }) => [styles.glassBtn, pressed && { opacity: 0.7 }]}
                  accessibilityLabel={`Share ${d.name}`}
                >
                  <Ionicons name="share-social-outline" size={20} color="#fff" />
                </Pressable>
              </View>
            </View>
            <Animated.View
              pointerEvents="none"
              style={[styles.scrollHint, { opacity: revealV, transform: [{ translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) }] }]}
            >
              <Ionicons name="chevron-down" size={18} color="#fff" />
            </Animated.View>
          </HeroSlide>

        <View style={styles.inner}>
          <Animated.View
            style={[
              styles.sheet,
              {
                opacity: enter,
                transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
              },
            ]}
          >
            <CategoryPill category={d.category} />
            <Text style={styles.name}>{d.name}</Text>
            <View style={styles.row}>
              <Ionicons name="location-sharp" size={14} color={colors.muted} />
              <Text style={styles.location}>{isAbroad(d) ? `${getCountry(d.countryCode).flag} ${placeLabel(d)}` : `${d.location}, India`}</Text>
            </View>

            <View style={styles.tags}>
              <Tag icon="wallet-outline" text={`~₹${Math.round(d.approxCost / 1000)}k per person`} styles={styles} color={colors.ink} />
              <Tag
                icon="calendar-range"
                text={`${d.idealDays[0]}–${d.idealDays[1]} days`}
                styles={styles}
                color={colors.ink}
              />
            </View>


            <View style={styles.infoRow}>
              <View style={[styles.infoCard, { flex: 1 }]}>
                <View style={styles.infoHeader}>
                  <MaterialCommunityIcons name="calendar-star" size={16} color={colors.accent} />
                  <Text style={styles.infoLabel}>Best time</Text>
                </View>
                <Text style={styles.infoValue}>{d.bestTime}</Text>
              </View>
              <WeatherCard coords={d.coords} style={{ flex: 1 }} />
            </View>
            <ForecastStrip coords={d.coords} />

            <View style={styles.actionRow}>
              <Pressable
                onPress={() => openInMaps(`${d.name}, ${d.location}, ${d.country}`)}
                style={({ pressed }) => [styles.actionBtn, { flex: 1 }, pressed && { opacity: 0.7 }]}
              >
                <MaterialCommunityIcons name="google-maps" size={20} color={colors.accent} />
                <Text style={styles.actionText}>View on Maps</Text>
              </Pressable>
              <Pressable
                onPress={() => shareDestination(d)}
                style={({ pressed }) => [styles.actionBtn, { flex: 1 }, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="share-social-outline" size={19} color={colors.accent} />
                <Text style={styles.actionText}>Share</Text>
              </Pressable>
            </View>

          </Animated.View>

          <Animated.View style={[styles.below, { opacity: enter }]}>
            <View style={styles.extra}>
              <Text style={styles.sectionTitle}>Before you go</Text>
              <Text style={styles.sectionHint}>Emergency numbers, money and local customs</Text>
              <LocalInfoCard destination={d} />
              <View style={{ height: 12 }} />
              <CurrencyConverter destination={d} />

              <Text style={styles.sectionTitle}>Travel buddies</Text>
              <Text style={styles.sectionHint}>Find people heading to {d.name}</Text>
              <BuddyTeaser destination={d} navigation={navigation} />
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      <GalleryViewer visible={viewer !== null} startIndex={viewer ?? 0} destination={d} onClose={() => setViewer(null)} />

      {/* Sticky bottom button: Stage 4 add/remove */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          onPress={() => toggle(d.id)}
          style={({ pressed }) => [styles.cta, saved && styles.ctaSaved, pressed && { opacity: 0.85 }]}
        >
          <Ionicons
            name={saved ? 'heart-dislike-outline' : 'heart-outline'}
            size={20}
            color={saved ? colors.heart : '#fff'}
          />
          <Text style={[styles.ctaText, saved && { color: colors.heart }]}>
            {saved ? 'Remove from Wishlist' : 'Add to Wishlist'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Tag({ icon, text, styles, color }) {
  return (
    <View style={styles.tag}>
      <MaterialCommunityIcons name={icon} size={14} color={color} />
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    inner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
    heroButtons: {
      position: 'absolute',
      left: 16,
      right: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    heroRight: { flexDirection: 'row', gap: 10 },
    glassBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollHint: { position: 'absolute', left: 0, right: 0, bottom: 8, alignItems: 'center' },
    below: {},
    roundBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow,
    },
    sheet: {
      marginTop: -28,
      backgroundColor: c.bg,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: 20,
      paddingBottom: 0,
    },
    name: { fontSize: 28, fontWeight: '800', color: c.ink, marginTop: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    location: { fontSize: 14, color: c.muted },
    tags: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    tagText: { fontSize: 12, fontWeight: '600', color: c.ink },
    description: { fontSize: 15, lineHeight: 23, color: c.ink, marginTop: 16 },
    infoRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
    infoCard: {
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.line,
      padding: 14,
      minHeight: 120,
    },
    infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoLabel: { fontSize: 12, fontWeight: '700', color: c.muted, textTransform: 'uppercase' },
    infoValue: { fontSize: 15, fontWeight: '600', color: c.ink, marginTop: 10, lineHeight: 21 },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: radius.md,
      backgroundColor: c.accentSoft,
    },
    actionText: { fontSize: 15, fontWeight: '700', color: c.accent },
    extra: { paddingHorizontal: 20 },
    sectionTitle: { fontSize: 19, fontWeight: '800', color: c.ink, marginTop: 26 },
    sectionHint: { fontSize: 12, color: c.muted, marginTop: 2, marginBottom: 12 },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 20,
      paddingTop: 12,
      backgroundColor: c.footer,
      borderTopWidth: 1,
      borderTopColor: c.line,
    },
    cta: {
      width: '100%',
      maxWidth: MAX_WIDTH - 40,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: c.accent,
    },
    ctaSaved: { backgroundColor: c.card, borderWidth: 1.5, borderColor: c.heart },
    ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
