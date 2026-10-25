// Real-time currency converter on the Details screen.
// - Type an amount in the local currency (or swap to type in your own).
// - Pick "your currency" from the chips (it's remembered for every destination).
// - "Typical prices" shows everyday costs converted instantly.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { useHomeCurrency } from '../context/HomeCurrencyContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { getCountry, HOME_CURRENCIES, CURRENCY_SYMBOLS } from '../data/countries';
import { formatMoney, parseAmount } from '../utils/money';
import { radius } from '../theme';

function timeAgo(ts) {
  if (!ts) return null;
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function CurrencyConverter({ destination: d }) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const country = getCountry(d.countryCode);
  const local = country.currency.code;
  const { home, setHome } = useHomeCurrency();
  // If your home currency IS the local one (e.g. INR in India), compare with USD instead
  const target = home === local ? (local === 'USD' ? 'INR' : 'USD') : home;

  const fx = useExchangeRates();
  const [fromLocal, setFromLocal] = useState(true);
  const [text, setText] = useState(String(country.prices[1]?.amount ?? 100));

  const from = fromLocal ? local : target;
  const to = fromLocal ? target : local;
  const amount = parseAmount(text);
  const result = fx.convert(amount, from, to);
  const unit = fx.convert(1, local, target);

  const options = useMemo(() => HOME_CURRENCIES.filter((c) => c !== local), [local]);

  const swap = () => {
    if (result !== null) setText(String(Math.round(result * 100) / 100));
    setFromLocal((v) => !v);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="swap-horizontal-circle-outline" size={18} color={colors.accent} />
        <Text style={styles.title}>Currency converter</Text>
        <View style={[styles.liveDot, { backgroundColor: fx.live ? '#22C3A6' : colors.muted }]} />
        <Text style={styles.liveText}>{fx.loading ? 'Loading…' : fx.live ? 'Live' : 'Offline'}</Text>
      </View>

      {/* Amount row */}
      <View style={styles.row}>
        <View style={styles.box}>
          <Text style={styles.boxLabel}>{fromLocal ? `${country.flag} ${local}` : target}</Text>
          <View style={styles.inputRow}>
            <Text style={styles.symbol}>{CURRENCY_SYMBOLS[from] || from}</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              keyboardType="decimal-pad"
              keyboardAppearance={isDark ? 'dark' : 'light'}
              style={styles.input}
              accessibilityLabel={`Amount in ${from}`}
              selectTextOnFocus
            />
          </View>
        </View>

        <Pressable onPress={swap} style={styles.swap} accessibilityLabel="Swap currencies">
          <Ionicons name="swap-horizontal" size={20} color="#fff" />
        </Pressable>

        <View style={[styles.box, styles.resultBox]}>
          <Text style={styles.boxLabel}>{fromLocal ? target : `${country.flag} ${local}`}</Text>
          {fx.loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 6, alignSelf: 'flex-start' }} />
          ) : (
            <Text style={styles.result} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(result, to)}
            </Text>
          )}
        </View>
      </View>

      {/* Rate info */}
      {!fx.loading && unit !== null && (
        <Text style={styles.rate}>
          1 {local} = {formatMoney(unit, target, { precise: true })} · {fx.source}
          {fx.updatedAt ? ` · updated ${timeAgo(fx.updatedAt)}` : ''}
          {!fx.live ? ' (approx.)' : ''}
        </Text>
      )}
      {!!fx.backupNote && (
        <View style={styles.backupRow}>
          <Ionicons name="information-circle-outline" size={12} color={colors.muted} />
          <Text style={styles.backupText}>{fx.backupNote}</Text>
        </View>
      )}

      {/* Your currency */}
      <Text style={styles.subTitle}>Convert to</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {options.map((c) => (
          <Pressable
            key={c}
            onPress={() => setHome(c)}
            style={[styles.chip, c === target && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: c === target }}
          >
            <Text style={[styles.chipText, c === target && { color: '#fff' }]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Typical prices */}
      <Text style={styles.subTitle}>Typical prices</Text>
      {country.prices.map((p) => (
        <View key={p.label} style={styles.priceRow}>
          <MaterialCommunityIcons name={p.icon} size={18} color={colors.muted} />
          <Text style={styles.priceLabel}>{p.label}</Text>
          <Text style={styles.priceLocal}>{formatMoney(p.amount, local)}</Text>
          <Text style={styles.priceHome}>≈ {formatMoney(fx.convert(p.amount, local, target), target)}</Text>
        </View>
      ))}

      {!fx.live && !fx.loading && (
        <Pressable onPress={fx.refresh} style={styles.retry}>
          <Ionicons name="refresh" size={14} color={colors.accent} />
          <Text style={styles.retryText}>Try loading live rates again</Text>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    title: { flex: 1, fontSize: 15, fontWeight: '800', color: c.ink },
    liveDot: { width: 7, height: 7, borderRadius: 4 },
    liveText: { fontSize: 11, fontWeight: '700', color: c.muted },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    box: { flex: 1, backgroundColor: c.bg, borderRadius: radius.sm, padding: 10, borderWidth: 1, borderColor: c.line },
    resultBox: { backgroundColor: c.accentSoft, borderColor: c.accentSoft },
    boxLabel: { fontSize: 11, fontWeight: '700', color: c.muted },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    symbol: { fontSize: 18, fontWeight: '700', color: c.muted },
    input: { flex: 1, fontSize: 20, fontWeight: '800', color: c.ink, paddingVertical: 0, outlineStyle: 'none', minWidth: 40 },
    swap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    result: { fontSize: 20, fontWeight: '800', color: c.accentDeep, marginTop: 2 },
    rate: { fontSize: 11, color: c.muted, marginTop: 8 },
    backupRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    backupText: { fontSize: 10.5, color: c.muted, fontStyle: 'italic' },
    subTitle: { fontSize: 12, fontWeight: '700', color: c.muted, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
    chips: { gap: 6 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bg,
    },
    chipActive: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { fontSize: 12, fontWeight: '800', color: c.ink },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 7,
      borderTopWidth: 1,
      borderTopColor: c.line,
    },
    priceLabel: { flex: 1, fontSize: 13, color: c.ink },
    priceLocal: { fontSize: 13, fontWeight: '700', color: c.ink },
    priceHome: { fontSize: 12, color: c.muted, minWidth: 74, textAlign: 'right' },
    retry: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-start' },
    retryText: { fontSize: 12, fontWeight: '700', color: c.accent },
  });
