// Small card on the Details screen linking to the Buddy Finder.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useBuddies } from '../context/BuddyContext';
import { radius } from '../theme';

export default function BuddyTeaser({ destination: d, navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { countFor } = useBuddies();
  const count = countFor(d.id);

  // `t` makes every tap a "new" request so the Buddies screen reacts even if it's already open
  const go = (compose) =>
    navigation.navigate('Tabs', { screen: 'Buddies', params: { destinationId: d.id, compose, t: Date.now() } });

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="account-group-outline" size={24} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          {count > 0 ? `${count} ${count === 1 ? 'traveller is' : 'travellers are'} planning ${d.name}` : `No one has posted ${d.name} yet`}
        </Text>
        <Text style={styles.sub}>{count > 0 ? 'Join a group or post your own plan' : 'Post your dates and find a travel buddy'}</Text>
        <View style={styles.row}>
          {count > 0 && (
            <Pressable onPress={() => go(false)} style={styles.btn}>
              <Text style={styles.btnText}>Find buddies</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </Pressable>
          )}
          <Pressable onPress={() => go(true)} style={[styles.btn, styles.btnGhost]}>
            <Ionicons name="add" size={14} color={colors.accent} />
            <Text style={[styles.btnText, { color: colors.accent }]}>Post a trip</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      padding: 14,
    },
    iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 15, fontWeight: '800', color: c.ink },
    sub: { fontSize: 12, color: c.muted, marginTop: 2 },
    row: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.accent,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: c.accent,
    },
    btnGhost: { backgroundColor: 'transparent' },
    btnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  });
