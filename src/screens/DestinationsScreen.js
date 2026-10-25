// Destinations screen: Stage 1 (destinations) + Stage 3 (search, category & region filters).
//
// Two views (toggle, remembered on the device):
//   Hero view – full-bleed destination slides with the giant depth title, a
//               vertical wipe between places and "See details" (src/stage/HeroDeck.js)
//   Grid view – the original responsive card grid (2 columns on phones, up to 4 on desktop)
// Both views share the same filters. Can be opened with filters from the Home
// page, e.g. navigate('Destinations', { region: 'abroad', t: Date.now() }).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import HeroDeck, { deckGlass } from '../stage/HeroDeck';
import { tween, DUR } from '../motion/motion';
import { fonts } from '../fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { destinations, filterDestinations } from '../data/destinations';
import DestinationCard from '../components/DestinationCard';
import SearchBar from '../components/SearchBar';
import CategoryChips from '../components/CategoryChips';
import EmptyState from '../components/EmptyState';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { REGIONS, radius } from '../theme';
import { useHero } from '../hero/HeroContext';

const PADDING = 16;
const GAP = 12;
const MAX_WIDTH = 1200;

const VIEW_KEY = '@travel_explorer/destinations_view';

function columnsFor(width) {
  if (width >= 1000) return 4;
  if (width >= 680) return 3;
  return 2;
}

export default function DestinationsScreen({ navigation, route }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [region, setRegion] = useState('all');
  const [width, setWidth] = useState(0); // measured width of the grid content area
  const [area, setArea] = useState({ w: 0, h: 0 }); // full screen area for the hero view
  const [view, setViewState] = useState('hero'); // 'hero' | 'grid'
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersV = useRef(new Animated.Value(0)).current;
  const focused = useIsFocused();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { openWithHero } = useHero();

  // Filters passed in from the Home page (search widget, "View all" links...)
  useEffect(() => {
    const p = route.params;
    if (!p?.t) return;
    if (p.query !== undefined) setQuery(p.query);
    if (p.region) setRegion(p.region);
    if (p.category) setCategory(p.category);
  }, [route.params?.t]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    AsyncStorage.getItem(VIEW_KEY)
      .then((v) => (v === 'grid' || v === 'hero') && setViewState(v))
      .catch(() => {});
  }, []);
  const setView = (v) => {
    setViewState(v);
    setFiltersOpen(false);
    AsyncStorage.setItem(VIEW_KEY, v).catch(() => {});
  };
  useEffect(() => {
    tween(filtersV, filtersOpen ? 1 : 0, { duration: DUR.med }).start();
  }, [filtersOpen, filtersV]);

  const columns = columnsFor(width);
  const cardWidth = width > 0 ? (width - PADDING * 2 - GAP * (columns - 1)) / columns : 0;

  // Re-runs only when a filter changes.
  const results = useMemo(
    () => filterDestinations(destinations, query, category, region),
    [query, category, region]
  );

  const clearFilters = () => {
    setQuery('');
    setCategory('All');
    setRegion('all');
  };
  const activeFilters = (query.trim() ? 1 : 0) + (category !== 'All' ? 1 : 0) + (region !== 'all' ? 1 : 0);

  const filters = (
    <>
        {/* Region switch: Everywhere / India / Abroad */}
        <View style={styles.regions}>
          {REGIONS.map((r) => {
            const active = region === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setRegion(r.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.region, active && styles.regionActive]}
              >
                <MaterialCommunityIcons name={r.icon} size={15} color={active ? '#fff' : colors.muted} />
                <Text style={[styles.regionText, active && { color: '#fff' }]}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.searchWrap}>
          <SearchBar value={query} onChangeText={setQuery} />
        </View>

        <View style={styles.chipsWrap}>
          <CategoryChips selected={category} onSelect={setCategory} />
        </View>

        <Text style={styles.count}>
          {results.length} {results.length === 1 ? 'destination' : 'destinations'}
          {category !== 'All' ? ` in ${category}` : ''}
          {region === 'india' ? ' across India' : region === 'abroad' ? ' abroad' : ''}
          {query.trim() ? ` matching "${query.trim()}"` : ''}
        </Text>
    </>
  );

  const toggle = (
    <View style={styles.toggle}>
      {[
        ['hero', 'Hero view', 'albums-outline'],
        ['grid', 'Grid view', 'grid-outline'],
      ].map(([k, label, icon]) => (
        <Pressable
          key={k}
          onPress={() => setView(k)}
          accessibilityRole="tab"
          accessibilityState={{ selected: view === k }}
          style={[styles.toggleItem, view === k && styles.toggleActive]}
        >
          <Ionicons name={icon} size={14} color={view === k ? '#fff' : colors.muted} />
          <Text style={[styles.toggleText, view === k && { color: '#fff' }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );

  // ---------- Hero view ----------
  if (view === 'hero') {
    return (
      <View style={styles.heroArea} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {area.w > 0 && results.length > 0 && (
          <HeroDeck
            items={results}
            width={area.w}
            height={area.h}
            active={focused}
            onOpenGuide={(d, ref) => openWithHero(navigation, ref, d, 28)}
            renderNav={({ index, n, expanded }) => (
              <View style={styles.deckNav}>
                <View style={styles.deckBrand}>
                  <Ionicons name="compass" size={20} color="#fff" />
                  {!expanded && area.w >= 520 && <Text style={styles.deckBrandText}>DESTINATIONS</Text>}
                </View>
                <View style={styles.deckLinks}>
                  <Text style={styles.deckCount}>
                    {String(index + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
                  </Text>
                  <Pressable onPress={() => setFiltersOpen((v) => !v)} style={styles.deckLink} accessibilityRole="button" accessibilityLabel="Filters">
                    <Ionicons name="options-outline" size={14} color="#fff" />
                    <Text style={styles.deckLinkText}>Filters{activeFilters ? ` · ${activeFilters}` : ''}</Text>
                  </Pressable>
                  <Pressable onPress={() => setView('grid')} style={styles.deckLink} accessibilityRole="button" accessibilityLabel="Grid view">
                    <Ionicons name="grid-outline" size={14} color="#fff" />
                    <Text style={styles.deckLinkText}>Grid</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}

        {area.w > 0 && results.length === 0 && (
          <View style={[styles.heroEmpty]}>
            <EmptyState icon="search" title="No destinations found" message="Try a different name, category or region." actionLabel="Clear filters" onAction={clearFilters} />
          </View>
        )}

        {/* glass filter panel sliding down over the hero */}
        <Animated.View
          pointerEvents={filtersOpen ? 'auto' : 'none'}
          style={[
            styles.filterPanel,
            {
              opacity: filtersV,
              transform: [{ translateY: filtersV.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
            },
          ]}
        >
          <View style={styles.filterHead}>
            <Text style={styles.filterTitle}>Filter destinations</Text>
            <Pressable onPress={() => setFiltersOpen(false)} style={styles.filterClose} accessibilityLabel="Close filters">
              <Ionicons name="close" size={18} color={colors.ink} />
            </Pressable>
          </View>
          {filters}
          <View style={styles.filterFoot}>
            {activeFilters > 0 && (
              <Pressable onPress={clearFilters}>
                <Text style={styles.clearText}>Clear all</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setFiltersOpen(false)} style={styles.applyBtn}>
              <Text style={styles.applyText}>Show {results.length}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ---------- Grid view ----------
  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.container} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>DESTINATIONS</Text>
            <Text style={styles.title}>Where to next?</Text>
          </View>
          {toggle}
        </View>
        {filters}

        <FlatList
          key={`cols-${columns}`} // FlatList needs a new key when the column count changes
          data={width > 0 ? results : []}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <DestinationCard
              destination={item}
              width={cardWidth}
              index={index}
              onPress={(imageRef) => openWithHero(navigation, imageRef, item, 16)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title="No destinations found"
              message="Try a different name, category or region."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    container: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: PADDING,
      paddingTop: 18,
      paddingBottom: 16,
    },
    regions: {
      flexDirection: 'row',
      gap: 6,
      marginHorizontal: PADDING,
      marginBottom: 12,
      padding: 4,
      backgroundColor: c.card,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.line,
      maxWidth: 420,
    },
    region: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 7,
      borderRadius: radius.pill,
    },
    regionActive: { backgroundColor: c.accent },
    regionText: { fontSize: 12.5, fontWeight: '700', color: c.muted },
    kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: c.accent },
    title: { fontSize: 26, fontWeight: '800', color: c.ink },
    searchWrap: { paddingHorizontal: PADDING },
    chipsWrap: { marginTop: 14 },
    count: {
      paddingHorizontal: PADDING,
      marginTop: 12,
      marginBottom: 8,
      fontSize: 13,
      color: c.muted,
    },
    list: { paddingHorizontal: PADDING, paddingBottom: 24, gap: GAP },
    toggle: { flexDirection: 'row', backgroundColor: c.card, borderRadius: radius.pill, borderWidth: 1, borderColor: c.line, padding: 3 },
    toggleItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
    toggleActive: { backgroundColor: c.accent },
    toggleText: { fontSize: 12, fontWeight: '700', color: c.muted },
    // hero view
    heroArea: { flex: 1, backgroundColor: c.bg },
    heroEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    deckNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 18 },
    deckBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deckBrandText: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: '#fff' },
    deckLinks: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deckCount: { fontFamily: fonts.semi, fontSize: 11, letterSpacing: 1, color: 'rgba(255,255,255,0.85)', marginRight: 4 },
    deckLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, ...deckGlass },
    deckLinkText: { fontSize: 11.5, fontWeight: '700', color: '#fff' },
    filterPanel: {
      position: 'absolute',
      top: 64,
      right: 18,
      width: 420,
      maxWidth: '92%',
      paddingTop: 14,
      paddingBottom: 12,
      borderRadius: 22,
      backgroundColor: c.bg === '#F2F6FC' ? 'rgba(242,246,252,0.96)' : 'rgba(8,17,31,0.94)',
      borderWidth: 1,
      borderColor: c.line,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
    filterHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PADDING, marginBottom: 12 },
    filterTitle: { fontFamily: fonts.bold, fontSize: 15, color: c.ink },
    filterClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
    filterFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16, paddingHorizontal: PADDING },
    clearText: { fontWeight: '700', color: c.accent },
    applyBtn: { backgroundColor: c.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
    applyText: { color: '#fff', fontWeight: '800' },
  });
