// Emergency & Local Info card on the Details screen:
// emergency helplines (tap to call), currency, languages and etiquette tips.

import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { getCountry } from '../data/countries';
import { radius } from '../theme';

function call(entry) {
  const url = `tel:${entry.number}`;
  const go = () => Linking.openURL(url).catch(() => Alert.alert('Unable to place call', entry.display || entry.number));
  if (Platform.OS === 'web') return go();
  Alert.alert(`Call ${entry.label}?`, entry.display || entry.number, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Call', onPress: go },
  ]);
}

export default function LocalInfoCard({ destination: d }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const country = getCountry(d.countryCode);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="shield-check-outline" size={18} color={colors.accent} />
        <Text style={styles.title}>Local essentials</Text>
        <Text style={styles.flag}>{country.flag}</Text>
      </View>

      {/* Emergency */}
      <Text style={styles.subTitle}>Emergency helplines · tap to call</Text>
      <View style={styles.grid}>
        {country.emergency.map((e) => (
          <Pressable
            key={e.label}
            onPress={() => call(e)}
            accessibilityRole="button"
            accessibilityLabel={`Call ${e.label}, ${e.display || e.number}`}
            style={({ pressed }) => [styles.sos, pressed && { opacity: 0.75 }]}
          >
            <View style={styles.sosIcon}>
              <MaterialCommunityIcons name={e.icon} size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sosNumber}>{e.display || e.number}</Text>
              <Text style={styles.sosLabel} numberOfLines={2}>
                {e.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Currency + languages */}
      <View style={styles.factsRow}>
        <View style={styles.fact}>
          <MaterialCommunityIcons name="cash-multiple" size={18} color={colors.accent} />
          <Text style={styles.factLabel}>Currency</Text>
          <Text style={styles.factValue}>
            {country.currency.name} ({country.currency.symbol === country.currency.code ? country.currency.code : `${country.currency.symbol} ${country.currency.code}`})
          </Text>
        </View>
        <View style={styles.fact}>
          <MaterialCommunityIcons name="translate" size={18} color={colors.accent} />
          <Text style={styles.factLabel}>Languages</Text>
          <Text style={styles.factValue}>{d.languages.join(', ')}</Text>
        </View>
      </View>

      {/* Etiquette */}
      <Text style={styles.subTitle}>Cultural etiquette</Text>
      {d.etiquette.map((tip) => (
        <View key={tip} style={styles.tip}>
          <MaterialCommunityIcons name="hand-heart-outline" size={16} color={colors.accent} style={{ marginTop: 1 }} />
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      ))}

      <Text style={styles.note}>Numbers are for general guidance. Confirm local helplines when you arrive.</Text>
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { flex: 1, fontSize: 15, fontWeight: '800', color: c.ink },
    flag: { fontSize: 18 },
    subTitle: { fontSize: 12, fontWeight: '700', color: c.muted, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sos: {
      flexGrow: 1,
      flexBasis: '46%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 8,
      borderRadius: radius.sm,
      backgroundColor: c.accentSoft,
    },
    sosIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sosNumber: { fontSize: 15, fontWeight: '800', color: c.accentDeep },
    sosLabel: { fontSize: 11, color: c.muted },
    factsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    fact: { flex: 1, backgroundColor: c.bg, borderRadius: radius.sm, padding: 10, gap: 2, borderWidth: 1, borderColor: c.line },
    factLabel: { fontSize: 11, fontWeight: '700', color: c.muted, textTransform: 'uppercase', marginTop: 4 },
    factValue: { fontSize: 13, fontWeight: '600', color: c.ink, lineHeight: 18 },
    tip: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    tipText: { flex: 1, fontSize: 14, color: c.ink, lineHeight: 20 },
    note: { fontSize: 11, color: c.muted, marginTop: 4, fontStyle: 'italic' },
  });
