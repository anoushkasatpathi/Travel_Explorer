// Search card from the template with Flights / Hotels / Cars / Experiences tabs.
//
// This app has no booking backend, so "Search" hands your details to real
// services: Google Flights, Google Hotels and a car-rental search. The
// Experiences tab opens the matching destination guide inside the app.

import { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { destinations } from '../data/destinations';
import { fonts } from '../fonts';

const TABS = [
  { key: 'flights', label: 'Flights', icon: 'airplane' },
  { key: 'hotels', label: 'Hotels', icon: 'office-building-outline' },
  { key: 'cars', label: 'Cars', icon: 'car-outline' },
  { key: 'experiences', label: 'Experiences', icon: 'ticket-outline' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY = 86400000;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
const fmt = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function findDestination(text) {
  const q = text.split(',')[0].trim().toLowerCase();
  if (!q) return null;
  return (
    destinations.find((d) => d.name.toLowerCase() === q) ||
    destinations.find((d) => d.name.toLowerCase().startsWith(q) || q.startsWith(d.name.toLowerCase())) ||
    null
  );
}

export default function SearchWidget({ width, navigation }) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const wide = width >= 900;
  const today = startOfDay(new Date());

  const [tab, setTab] = useState('flights');
  const [from, setFrom] = useState('New Delhi, India');
  const [to, setTo] = useState('Paris, France');
  const [depart, setDepart] = useState(addDays(today, 30));
  const [ret, setRet] = useState(addDays(today, 37));
  const [travellers, setTravellers] = useState(2);
  const [picker, setPicker] = useState(null); // 'depart' | 'return' | 'travellers'

  const match = useMemo(() => findDestination(to), [to]);
  const showFrom = tab === 'flights';

  const search = () => {
    const n = `${travellers} ${travellers === 1 ? 'adult' : 'adults'}`;
    let url = null;
    if (tab === 'flights') {
      url = `https://www.google.com/travel/flights?q=${encodeURIComponent(
        `Flights from ${from} to ${to} on ${iso(depart)} through ${iso(ret)} ${n}`
      )}`;
    } else if (tab === 'hotels') {
      url = `https://www.google.com/travel/search?q=${encodeURIComponent(`hotels in ${to} ${iso(depart)} to ${iso(ret)} ${n}`)}`;
    } else if (tab === 'cars') {
      url = `https://www.google.com/search?q=${encodeURIComponent(`car rental ${to} ${iso(depart)} to ${iso(ret)}`)}`;
    }
    if (url) {
      Linking.openURL(url).catch(() => {});
      return;
    }
    // Experiences: open our guide for that place
    if (match) navigation.navigate('Details', { id: match.id });
    else navigation.navigate('Destinations', { query: to.split(',')[0].trim(), t: Date.now() });
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const fieldStyle = wide ? styles.fieldWide : styles.fieldHalf;

  return (
    <View style={styles.outer}>
      {/* Folder-style tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.tab, active && styles.tabActive]}
            >
              <MaterialCommunityIcons name={t.icon} size={18} color={active ? colors.accent : colors.ink} />
              <Text style={[styles.tabText, active && { color: colors.accent }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.card}>
        <View style={[styles.fields, wide && { flexWrap: 'nowrap' }]}>
          {showFrom && (
            <View style={[fieldStyle, wide && { flex: 1.3 }]}>
              <Text style={styles.label}>From</Text>
              <View style={styles.inputRow}>
                <TextInput value={from} onChangeText={setFrom} style={styles.input} placeholderTextColor={colors.muted} keyboardAppearance={isDark ? 'dark' : 'light'} accessibilityLabel="From" />
                <Pressable onPress={swap} style={styles.swap} accessibilityLabel="Swap from and to">
                  <Ionicons name="swap-horizontal" size={16} color={colors.accent} />
                </Pressable>
              </View>
            </View>
          )}
          <View style={[fieldStyle, wide && { flex: 1.3 }, !showFrom && !wide && { flexBasis: '100%' }]}>
            <Text style={styles.label}>{tab === 'flights' ? 'To' : 'Destination'}</Text>
            <TextInput value={to} onChangeText={setTo} style={styles.inputPlain} placeholder="City or country" placeholderTextColor={colors.muted} keyboardAppearance={isDark ? 'dark' : 'light'} accessibilityLabel="Destination" />
          </View>
          <DateField label={tab === 'hotels' ? 'Check-in' : 'Depart'} value={depart} onPress={() => setPicker('depart')} styles={styles} colors={colors} style={fieldStyle} />
          <DateField label={tab === 'hotels' ? 'Check-out' : 'Return'} value={ret} onPress={() => setPicker('return')} styles={styles} colors={colors} style={fieldStyle} />
          <Pressable onPress={() => setPicker('travellers')} style={[fieldStyle, wide && { flex: 0.9 }]} accessibilityRole="button" accessibilityLabel={`Travellers: ${travellers}`}>
            <Text style={styles.label}>Travelers</Text>
            <View style={[styles.inputBox, styles.inputRow]}>
              <Text style={styles.value}>
                {travellers} {travellers === 1 ? 'Adult' : 'Adults'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.muted} />
            </View>
          </Pressable>
          <Pressable onPress={search} style={({ pressed }) => [styles.searchBtn, !wide && styles.searchBtnFull, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel="Search">
            <Ionicons name="search" size={16} color="#fff" />
            <Text style={styles.searchText}>Search</Text>
          </Pressable>
        </View>

        <View style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
          <Text style={styles.hint}>
            {tab === 'experiences'
              ? 'Opens our destination guide with weather, local tips and attractions.'
              : `Opens ${tab === 'flights' ? 'Google Flights' : tab === 'hotels' ? 'Google Hotels' : 'a car-rental search'} with your details.`}
          </Text>
          {match && tab !== 'experiences' && (
            <Pressable onPress={() => navigation.navigate('Details', { id: match.id })} style={styles.guide}>
              <Text style={styles.guideText}>{match.name} guide →</Text>
            </Pressable>
          )}
        </View>
      </View>

      <PickerModal
        picker={picker}
        onClose={() => setPicker(null)}
        depart={depart}
        ret={ret}
        travellers={travellers}
        onDepart={(d) => {
          setDepart(d);
          if (ret <= d) setRet(addDays(d, 3));
        }}
        onReturn={setRet}
        onTravellers={setTravellers}
        today={today}
        styles={styles}
        colors={colors}
      />
    </View>
  );
}

function DateField({ label, value, onPress, styles, colors, style }) {
  return (
    <Pressable onPress={onPress} style={style} accessibilityRole="button" accessibilityLabel={`${label}: ${fmt(value)}`}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputBox, styles.inputRow]}>
        <Text style={styles.value}>{fmt(value)}</Text>
        <MaterialCommunityIcons name="calendar-blank-outline" size={17} color={colors.muted} />
      </View>
    </Pressable>
  );
}

function PickerModal({ picker, onClose, depart, ret, travellers, onDepart, onReturn, onTravellers, today, styles, colors }) {
  const selected = picker === 'return' ? ret : depart;
  const min = picker === 'return' ? addDays(depart, 1) : today;
  const [month, setMonth] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));

  // reset the visible month whenever the picker opens
  const [lastPicker, setLastPicker] = useState(null);
  if (picker !== lastPicker) {
    setLastPicker(picker);
    if (picker && picker !== 'travellers') setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }

  if (!picker) return null;

  const first = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.popup} onPress={() => {}}>
          {picker === 'travellers' ? (
            <>
              <Text style={styles.popupTitle}>Travelers</Text>
              <View style={styles.stepRow}>
                <Pressable onPress={() => onTravellers(Math.max(1, travellers - 1))} style={styles.stepBtn} accessibilityLabel="Fewer travellers">
                  <Ionicons name="remove" size={20} color={colors.ink} />
                </Pressable>
                <Text style={styles.stepValue}>
                  {travellers} {travellers === 1 ? 'Adult' : 'Adults'}
                </Text>
                <Pressable onPress={() => onTravellers(Math.min(9, travellers + 1))} style={styles.stepBtn} accessibilityLabel="More travellers">
                  <Ionicons name="add" size={20} color={colors.ink} />
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.calHeader}>
                <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={styles.stepBtn} accessibilityLabel="Previous month">
                  <Ionicons name="chevron-back" size={18} color={colors.ink} />
                </Pressable>
                <Text style={styles.popupTitle}>
                  {MONTHS[month.getMonth()]} {month.getFullYear()}
                </Text>
                <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={styles.stepBtn} accessibilityLabel="Next month">
                  <Ionicons name="chevron-forward" size={18} color={colors.ink} />
                </Pressable>
              </View>
              <View style={styles.grid}>
                {DOW.map((d, i) => (
                  <Text key={`h${i}`} style={styles.dow}>
                    {d}
                  </Text>
                ))}
                {cells.map((d, i) => {
                  if (!d) return <View key={`e${i}`} style={styles.cell} />;
                  const disabled = d < min;
                  const isSel = iso(d) === iso(selected);
                  const inRange = d > depart && d < ret;
                  return (
                    <Pressable
                      key={iso(d)}
                      disabled={disabled}
                      onPress={() => {
                        (picker === 'return' ? onReturn : onDepart)(d);
                        onClose();
                      }}
                      style={[styles.cell, inRange && styles.cellRange, isSel && styles.cellSel]}
                    >
                      <Text style={[styles.cellText, disabled && { opacity: 0.3 }, isSel && { color: '#fff' }]}>{d.getDate()}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
          <Pressable onPress={onClose} style={styles.done}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    outer: { width: '100%' },
    tabs: { gap: 4, paddingLeft: 12 },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderTopLeftRadius: 14,
      borderTopRightRadius: 14,
      backgroundColor: c.card === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : 'rgba(16,29,51,0.7)',
    },
    tabActive: { backgroundColor: c.card },
    tabText: { fontFamily: fonts.bold, fontSize: 13, color: c.ink },
    card: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 18,
      shadowColor: '#0B2A5C',
      shadowOpacity: 0.14,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    fields: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 },
    fieldWide: { flex: 1, minWidth: 0 },
    fieldHalf: { flexBasis: '47%', flexGrow: 1 },
    label: { fontFamily: fonts.semi, fontSize: 12, color: c.muted, marginBottom: 6 },
    inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    input: {
      flex: 1,
      height: 46,
      fontSize: 14,
      color: c.ink,
      fontWeight: '600',
      borderBottomWidth: 1,
      borderBottomColor: c.line,
      outlineStyle: 'none',
      minWidth: 0,
    },
    inputBox: { height: 46, borderBottomWidth: 1, borderBottomColor: c.line },
    inputPlain: {
      height: 46,
      fontSize: 14,
      color: c.ink,
      fontWeight: '600',
      borderBottomWidth: 1,
      borderBottomColor: c.line,
      outlineStyle: 'none',
      width: '100%',
    },
    value: { fontSize: 14, fontWeight: '600', color: c.ink },
    swap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 48,
      paddingHorizontal: 26,
      borderRadius: 12,
      backgroundColor: c.accent,
    },
    searchBtnFull: { flexBasis: '100%' },
    searchText: { fontFamily: fonts.bold, color: '#fff', fontSize: 15 },
    hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' },
    hint: { flex: 1, fontSize: 12, color: c.muted, minWidth: 180 },
    guide: { backgroundColor: c.accentSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    guideText: { fontSize: 12, fontWeight: '800', color: c.accent },
    backdrop: { flex: 1, backgroundColor: 'rgba(3,10,25,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    popup: { width: '100%', maxWidth: 340, backgroundColor: c.bg, borderRadius: 20, padding: 18 },
    popupTitle: { fontFamily: fonts.bold, fontSize: 16, color: c.ink },
    calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    dow: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, fontWeight: '800', color: c.muted, paddingVertical: 6 },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
    cellRange: { backgroundColor: c.accentSoft, borderRadius: 0 },
    cellSel: { backgroundColor: c.accent },
    cellText: { fontSize: 14, fontWeight: '600', color: c.ink },
    stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
    stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
    stepValue: { fontSize: 18, fontWeight: '800', color: c.ink },
    done: { marginTop: 16, height: 44, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    doneText: { color: '#fff', fontWeight: '800' },
  });
