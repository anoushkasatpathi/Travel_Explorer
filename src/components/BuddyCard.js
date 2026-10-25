// One trip post in the Buddy Finder feed.
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import PlaceImage from './PlaceImage';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useBuddies, formatRange, timeAgo, initials } from '../context/BuddyContext';
import { getDestinationById, placeLabel } from '../data/destinations';
import { formatMoney } from '../utils/money';
import { radius, shadow } from '../theme';

export default function BuddyCard({ post: p, onOpenDestination, onDelete }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { toggleInterest, isInterested } = useBuddies();
  const d = getDestinationById(p.destinationId);
  const interested = isInterested(p.id);
  const pop = useRef(new Animated.Value(1)).current;
  const on = useRef(new Animated.Value(interested ? 1 : 0)).current; // colour/icon morph
  const ripple = useRef(new Animated.Value(0)).current;
  const bump = useRef(new Animated.Value(0)).current;

  // Animate whenever the interest state changes (locally or from the realtime feed)
  useEffect(() => {
    Animated.spring(on, { toValue: interested ? 1 : 0, damping: 14, stiffness: 160, useNativeDriver: false }).start();
  }, [interested, on]);
  if (!d) return null;

  const onInterest = () => {
    toggleInterest(p.id);
    pop.setValue(0.82);
    Animated.spring(pop, { toValue: 1, friction: 3, tension: 180, useNativeDriver: true }).start();
    if (!interested) {
      ripple.setValue(0);
      Animated.timing(ripple, { toValue: 1, duration: 650, useNativeDriver: true }).start();
    }
    bump.setValue(0);
    Animated.sequence([
      Animated.timing(bump, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.spring(bump, { toValue: 0, friction: 4, useNativeDriver: true }),
    ]).start();
  };
  const btnBg = on.interpolate({ inputRange: [0, 1], outputRange: [colors.accent, colors.card] });
  const btnText = on.interpolate({ inputRange: [0, 1], outputRange: ['#FFFFFF', colors.accent] });
  const iconSpin = on.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.card}>
      {/* Who */}
      <View style={styles.top}>
        <View style={[styles.avatar, { backgroundColor: p.avatarColor }]}>
          <Text style={styles.avatarText}>{initials(p.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{p.name}</Text>
            {p.mine && <Text style={styles.youBadge}>You</Text>}
          </View>
          <Text style={styles.meta}>
            {p.travelType === 'solo' ? 'Solo traveller' : `Group of ${p.groupSize}`} · posted {timeAgo(p.createdAt)}
          </Text>
        </View>
        {p.mine && (
          <Pressable onPress={() => onDelete(p)} hitSlop={8} accessibilityLabel="Delete post" style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={colors.heart} />
          </Pressable>
        )}
      </View>

      {/* Where & when */}
      <Pressable onPress={() => onOpenDestination(d)} style={({ pressed }) => [styles.trip, pressed && { opacity: 0.85 }]}>
        <PlaceImage wiki={d.wiki} category={d.category} style={styles.thumb} iconSize={18} />
        <View style={{ flex: 1 }}>
          <Text style={styles.dest} numberOfLines={1}>
            {d.name}
          </Text>
          <Text style={styles.destSub} numberOfLines={1}>
            {placeLabel(d)}
          </Text>
          <View style={styles.dateRow}>
            <MaterialCommunityIcons name="calendar-month-outline" size={13} color={colors.accent} />
            <Text style={styles.date}>
              {formatRange(p.startDate, p.days)} · {p.days} {p.days === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      <Text style={styles.message}>{p.message}</Text>

      <View style={styles.tags}>
        {p.styles.map((t) => (
          <Text key={t} style={styles.tag}>
            {t}
          </Text>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.stat}>
          <MaterialCommunityIcons name="account-multiple-plus-outline" size={16} color={colors.accent} />
          <Text style={styles.statText}>
            {p.spots} {p.spots === 1 ? 'spot' : 'spots'} open
          </Text>
        </View>
        <View style={styles.stat}>
          <MaterialCommunityIcons name="wallet-outline" size={16} color={colors.accent} />
          <Text style={styles.statText}>~{formatMoney(p.budget, 'INR')} pp</Text>
        </View>
        <View style={{ flex: 1 }} />
        {!p.mine ? (
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            {/* ripple burst when you join */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ripple,
                { borderColor: colors.accent, opacity: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.9] }) }] },
              ]}
            />
            <Pressable onPress={onInterest} accessibilityRole="button" accessibilityState={{ selected: interested }}>
              <Animated.View style={[styles.joinBtn, { backgroundColor: btnBg }]}>
                <Animated.View style={{ transform: [{ rotate: iconSpin }] }}>
                  <Ionicons name={interested ? 'checkmark-circle' : 'hand-left-outline'} size={16} color={interested ? colors.accent : '#fff'} />
                </Animated.View>
                <Animated.Text style={[styles.joinText, { color: btnText }]}>{interested ? 'Interested' : "I'm in!"}</Animated.Text>
              </Animated.View>
            </Pressable>
          </Animated.View>
        ) : (
          <Text style={styles.interestCount}>
            {p.interestedCount} {p.interestedCount === 1 ? 'person' : 'people'} interested
          </Text>
        )}
      </View>
      {!p.mine && p.interestedCount > 0 && (
        <Animated.Text style={[styles.interestNote, { transform: [{ translateY: bump.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }, { scale: bump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }]}>
          {p.interestedCount} {p.interestedCount === 1 ? 'traveller is' : 'travellers are'} interested
        </Animated.Text>
      )}
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    card: { backgroundColor: c.card, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, padding: 14, ...shadow },
    top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { fontSize: 15, fontWeight: '800', color: c.ink },
    youBadge: {
      fontSize: 10,
      fontWeight: '800',
      color: c.accent,
      backgroundColor: c.accentSoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
      overflow: 'hidden',
    },
    meta: { fontSize: 12, color: c.muted, marginTop: 1 },
    deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.heartSoft, alignItems: 'center', justifyContent: 'center' },
    trip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
      padding: 8,
      borderRadius: radius.sm,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.line,
    },
    thumb: { width: 54, height: 54, borderRadius: 10 },
    dest: { fontSize: 15, fontWeight: '800', color: c.ink },
    destSub: { fontSize: 12, color: c.muted },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    date: { fontSize: 12, fontWeight: '700', color: c.accent },
    message: { fontSize: 14, color: c.ink, lineHeight: 20, marginTop: 10 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    tag: {
      fontSize: 11,
      fontWeight: '700',
      color: c.accentDeep,
      backgroundColor: c.accentSoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.pill,
      overflow: 'hidden',
    },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { fontSize: 12, fontWeight: '700', color: c.ink },
    joinBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: c.accent,
    },
    ripple: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 999, borderWidth: 2 },
    joinText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    interestCount: { fontSize: 12, fontWeight: '700', color: c.muted },
    interestNote: { fontSize: 11, color: c.muted, marginTop: 6, textAlign: 'right' },
  });
