// Small pill that tells the user where their data lives right now.
//   local       – no Firebase keys: stored on this device
//   connecting  – talking to Firestore
//   synced      – up to date in the cloud
//   offline     – using the offline cache; changes sync when back online
//   error       – blocked by security rules / misconfiguration
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useTripPlans } from '../context/TripPlanContext';
import { useBuddies } from '../context/BuddyContext';
import { useThemedStyles } from '../context/ThemeContext';

const ORDER = ['error', 'offline', 'connecting', 'syncing', 'synced'];
const META = {
  local: { icon: 'cellphone', label: 'Saved on this device' },
  'local-fallback': { icon: 'cellphone', label: 'Saved on this device (cloud unavailable)' },
  connecting: { icon: 'cloud-sync-outline', label: 'Connecting…' },
  syncing: { icon: 'cloud-upload-outline', label: 'Saving…' },
  synced: { icon: 'cloud-check-outline', label: 'Synced' },
  offline: { icon: 'cloud-off-outline', label: 'Offline – will sync later' },
  error: { icon: 'alert-circle-outline', label: 'Sync blocked – check Firestore rules' },
};

export function useCombinedSyncStatus(include = ['wishlist', 'plans']) {
  const auth = useAuth();
  const w = useWishlist();
  const t = useTripPlans();
  const b = useBuddies();
  if (!auth.enabled) return 'local';
  const map = { wishlist: w.syncStatus, plans: t.syncStatus, buddies: b.syncStatus };
  const list = include.map((k) => map[k]).filter(Boolean);
  if (list.every((s) => s === 'local-fallback' || s === 'local')) return 'local-fallback';
  for (const s of ORDER) if (list.includes(s)) return s;
  return 'synced';
}

export default function SyncBadge({ include, style, compact }) {
  const styles = useThemedStyles(makeStyles);
  const status = useCombinedSyncStatus(include);
  const m = META[status] || META.local;
  const tone = status === 'error' ? styles.err : status === 'synced' ? styles.ok : null;
  return (
    <View style={[styles.pill, tone, style]} accessibilityLabel={`Sync status: ${m.label}`}>
      <MaterialCommunityIcons name={m.icon} size={13} color={status === 'error' ? '#E23B5A' : status === 'synced' ? '#0E9FB8' : '#62748C'} />
      {!compact && <Text style={[styles.text, status === 'error' && { color: '#E23B5A' }]}>{m.label}</Text>}
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
    },
    ok: { borderColor: 'rgba(14,159,184,0.35)' },
    err: { borderColor: 'rgba(226,59,90,0.4)', backgroundColor: c.heartSoft },
    text: { fontSize: 11.5, fontWeight: '700', color: c.muted },
  });
