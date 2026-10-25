// Travel Buddy Finder: browse trip plans from other travellers, show interest,
// or post your own trip to find like-minded people.
// With Firebase configured the feed is realtime (Firestore onSnapshot); without
// it, sample posts + your own posts are stored on the device.
// Motion: cards slide in with a stagger, filter pills have a sliding highlight,
// "I'm in!" animates, and the floating "Post a trip" button expands into the form.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useBuddies } from '../context/BuddyContext';
import { useAuth } from '../context/AuthContext';
import { getDestinationById } from '../data/destinations';
import BuddyCard from '../components/BuddyCard';
import { PostTripForm } from '../components/PostTripSheet';
import ExpandingFab from '../components/ExpandingFab';
import FilterPills from '../components/FilterPills';
import SyncBadge from '../components/SyncBadge';
import { FadeSlideIn, stagger } from '../motion/motion';
import EmptyState from '../components/EmptyState';
import { radius } from '../theme';

const FILTERS = [
  { key: 'all', label: 'All trips' },
  { key: 'solo', label: 'Solo' },
  { key: 'group', label: 'Groups' },
  { key: 'interested', label: 'Interested' },
  { key: 'mine', label: 'My posts' },
];

function confirmDelete(onYes) {
  if (Platform.OS === 'web') {
    if (window.confirm('Delete this trip post?')) onYes();
    return;
  }
  Alert.alert('Delete post?', 'Your trip post will be removed.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onYes },
  ]);
}

export default function BuddyScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { posts, deletePost, isInterested, cloud, usingSamples, error } = useBuddies();
  const fab = useRef(null);
  const { enabled: firebaseOn } = useAuth();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [destFilter, setDestFilter] = useState(null);

  // Opened from a Details screen: "Find buddies" or "Post a trip to X"
  useEffect(() => {
    const p = route.params;
    if (!p) return;
    if (p.destinationId) setDestFilter(p.destinationId);
    if (p.compose) setTimeout(() => fab.current?.open({ destinationId: p.destinationId || null }), 350);
    navigation.setParams({ destinationId: undefined, compose: undefined, t: undefined });
  }, [route.params?.t, route.params?.destinationId, route.params?.compose]); // eslint-disable-line react-hooks/exhaustive-deps

  const filterDest = getDestinationById(destFilter);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const d = getDestinationById(p.destinationId);
      if (!d) return false;
      if (destFilter && p.destinationId !== destFilter) return false;
      if (filter === 'solo' && p.travelType !== 'solo') return false;
      if (filter === 'group' && p.travelType !== 'group') return false;
      if (filter === 'mine' && !p.mine) return false;
      if (filter === 'interested' && !isInterested(p.id)) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.country.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.styles.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [posts, filter, query, destFilter, isInterested]);

  const openCompose = () => fab.current?.open({ destinationId: destFilter });

  const header = (
    <View>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Travel Buddies</Text>
          <Text style={styles.subtitle}>Find like-minded people to explore with</Text>
        </View>
        <SyncBadge include={['buddies']} compact={false} />
      </View>

      <View style={[styles.banner, error && styles.bannerError]}>
        <MaterialCommunityIcons name={error ? 'alert-circle-outline' : cloud ? 'cloud-check-outline' : 'information-outline'} size={16} color={error ? colors.heart : colors.accent} />
        <Text style={styles.bannerText}>
          {error
            ? `${error} Showing sample posts for now.`
            : cloud && !usingSamples
              ? 'Live feed: posts from every traveller, updated in real time.'
              : cloud
                ? 'No trips posted yet: showing sample posts. Be the first to post one!'
                : firebaseOn
                  ? "Can't reach the cloud right now: showing sample posts, and your posts stay on this device."
                  : 'Demo mode: sample posts and your own posts are stored on this device. Add Firebase keys to .env to share posts with everyone.'}
        </Text>
      </View>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search destination, name or style…"
          placeholderTextColor={colors.muted}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          style={styles.searchInput}
        />
      </View>

      <FilterPills
        options={FILTERS}
        value={filter}
        onChange={setFilter}
        style={{ marginTop: 12 }}
        trailing={
          filterDest ? (
            <Pressable onPress={() => setDestFilter(null)} style={[styles.filter, styles.destPill]} accessibilityLabel="Clear destination filter">
              <Ionicons name="location" size={13} color={colors.accent} />
              <Text style={[styles.filterText, { color: colors.accent }]}>{filterDest.name}</Text>
              <Ionicons name="close" size={14} color={colors.accent} />
            </Pressable>
          ) : null
        }
      />

      <Text style={styles.count}>
        {visible.length} {visible.length === 1 ? 'trip' : 'trips'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item, index }) => (
          <FadeSlideIn delay={stagger(index, 80)} from={{ y: 34, scale: 0.98 }} duration={700} trigger={`${filter}|${destFilter}`}>
            <BuddyCard
              post={item}
              onOpenDestination={(d) => navigation.navigate('Details', { id: d.id })}
              onDelete={(p) => confirmDelete(() => deletePost(p.id))}
            />
          </FadeSlideIn>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={filterDest ? `No trips to ${filterDest.name} yet` : 'No trips match'}
            message="Be the first: post your plan and let others join you."
            actionLabel="Post a trip"
            onAction={openCompose}
          />
        }
      />

      <ExpandingFab
        ref={fab}
        renderContent={({ close, payload }) => (
          <PostTripForm
            embedded
            initialDestinationId={payload?.destinationId ?? destFilter}
            onClose={close}
            onPosted={() => {
              setFilter('all');
              setQuery('');
            }}
          />
        )}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    list: { padding: 16, paddingBottom: 110, width: '100%', maxWidth: 720, alignSelf: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    title: { fontSize: 24, fontWeight: '800', color: c.ink },
    subtitle: { fontSize: 13, color: c.muted, marginTop: 2 },
    postBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.accent,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.pill,
    },
    postText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    banner: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: c.accentSoft,
      borderRadius: radius.sm,
      padding: 10,
      marginBottom: 12,
    },
    bannerText: { flex: 1, fontSize: 12, color: c.ink, lineHeight: 17 },
    bannerError: { backgroundColor: c.heartSoft },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      height: 46,
    },
    searchInput: { flex: 1, fontSize: 15, color: c.ink, outlineStyle: 'none' },
    filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    filter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.card,
    },
    filterActive: { backgroundColor: c.accent, borderColor: c.accent },
    filterText: { fontSize: 13, fontWeight: '700', color: c.ink },
    destPill: { backgroundColor: c.accentSoft, borderColor: c.accentSoft },
    count: { fontSize: 13, color: c.muted, marginTop: 12, marginBottom: 10 },
  });
