// Bottom sheet form for posting a trip plan to the Buddy Finder.
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { TRAVEL_STYLES, MONTHS, useBuddies } from '../context/BuddyContext';
import { destinations, getDestinationById } from '../data/destinations';
import { formatMoney } from '../utils/money';
import { radius } from '../theme';

const BUDGETS = [8000, 15000, 25000, 50000, 100000, 200000];

function nextMonths(count = 6) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` };
  });
}
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

export default function PostTripSheet({ visible, onClose, initialDestinationId, onPosted }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {visible && <Form onClose={onClose} initialDestinationId={initialDestinationId} onPosted={onPosted} />}
    </Modal>
  );
}

// The form itself. `embedded` = rendered inside the expanding "Post a trip"
// button overlay (no backdrop of its own).
export function PostTripForm({ onClose, initialDestinationId, onPosted, embedded = false }) {
  return <Form onClose={onClose} initialDestinationId={initialDestinationId} onPosted={onPosted} embedded={embedded} />;
}

function Form({ onClose, initialDestinationId, onPosted, embedded }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { addPost, profileName } = useBuddies();
  const months = useMemo(() => nextMonths(6), []);
  const today = new Date();

  const [name, setName] = useState(profileName);
  const [destId, setDestId] = useState(initialDestinationId || null);
  const [search, setSearch] = useState('');
  const [monthIdx, setMonthIdx] = useState(0);
  const [day, setDay] = useState(Math.min(today.getDate() + 7, 28));
  const [days, setDays] = useState(3);
  const [travelType, setTravelType] = useState('solo');
  const [groupSize, setGroupSize] = useState(2);
  const [spots, setSpots] = useState(2);
  const [picked, setPicked] = useState([]);
  const [budget, setBudget] = useState(15000);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const dest = getDestinationById(destId);
  const destOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return destinations.filter((d) => !q || d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)).slice(0, 14);
  }, [search]);

  const m = months[monthIdx];
  const maxDay = daysInMonth(m.year, m.month);
  const minDay = monthIdx === 0 ? today.getDate() : 1;
  const safeDay = Math.max(minDay, Math.min(day, maxDay));
  const start = new Date(m.year, m.month, safeDay);

  const valid = name.trim().length >= 2 && dest && message.trim().length >= 10;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await addPost({
      name: name.trim(),
      destinationId: dest.id,
      startDate: start.toISOString(),
      days,
      travelType,
      groupSize: travelType === 'solo' ? 1 : groupSize,
      spots,
      styles: picked,
      budget,
      message: message.trim(),
      });
      onPosted?.();
      onClose();
    } catch (e) {
      console.warn('Post failed', e.message);
      setError(
        e.code === 'permission-denied'
          ? 'The database rejected this post. Check that firestore.rules are published.'
          : "Couldn't post right now. Check your connection and try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleStyle = (s) => setPicked((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 4 ? [...prev, s] : prev));

  return (
    <View style={embedded ? styles.embedded : styles.backdrop}>
      {!embedded && <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12, maxHeight: height * 0.92 - insets.top }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Post a trip</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close form">
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 1 }}>
            <Label styles={styles}>Your name</Label>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Surya"
              placeholderTextColor={colors.muted}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              maxLength={30}
              style={styles.input}
            />

            <Label styles={styles}>Where to?{dest ? `  ·  ${dest.name}` : ''}</Label>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search a destination…"
              placeholderTextColor={colors.muted}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              style={styles.input}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
              {destOptions.map((d) => (
                <Chip key={d.id} label={d.name} active={destId === d.id} onPress={() => setDestId(d.id)} styles={styles} />
              ))}
            </ScrollView>

            <Label styles={styles}>When?</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {months.map((mo, i) => (
                <Chip key={mo.label} label={mo.label} active={monthIdx === i} onPress={() => setMonthIdx(i)} styles={styles} />
              ))}
            </ScrollView>
            <View style={styles.steppers}>
              <Stepper label="Start day" value={safeDay} min={minDay} max={maxDay} onChange={setDay} styles={styles} colors={colors} />
              <Stepper label="Days" value={days} min={1} max={21} onChange={setDays} styles={styles} colors={colors} />
            </View>

            <Label styles={styles}>Travelling as</Label>
            <View style={styles.segment}>
              {[
                { key: 'solo', label: 'Solo' },
                { key: 'group', label: 'Group' },
              ].map((t) => (
                <Pressable key={t.key} onPress={() => setTravelType(t.key)} style={[styles.segItem, travelType === t.key && styles.segActive]}>
                  <Text style={[styles.segText, travelType === t.key && { color: '#fff' }]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.steppers}>
              {travelType === 'group' && (
                <Stepper label="Group size" value={groupSize} min={2} max={12} onChange={setGroupSize} styles={styles} colors={colors} />
              )}
              <Stepper label="Buddies wanted" value={spots} min={1} max={8} onChange={setSpots} styles={styles} colors={colors} />
            </View>

            <Label styles={styles}>Travel style (up to 4)</Label>
            <View style={styles.wrapChips}>
              {TRAVEL_STYLES.map((s) => (
                <Chip key={s} label={s} active={picked.includes(s)} onPress={() => toggleStyle(s)} styles={styles} />
              ))}
            </View>

            <Label styles={styles}>Budget per person</Label>
            <View style={styles.wrapChips}>
              {BUDGETS.map((b) => (
                <Chip key={b} label={formatMoney(b, 'INR')} active={budget === b} onPress={() => setBudget(b)} styles={styles} />
              ))}
            </View>

            <Label styles={styles}>About the trip</Label>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="What's the plan? What kind of buddy are you looking for?"
              placeholderTextColor={colors.muted}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              multiline
              maxLength={280}
              textAlignVertical="top"
              style={[styles.input, styles.textarea]}
            />
            <Text style={styles.counter}>{message.length}/280</Text>
          </ScrollView>

          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable onPress={submit} disabled={!valid || busy} style={[styles.submit, (!valid || busy) && { opacity: 0.45 }]}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                <Text style={styles.submitText}>
                  {valid ? `Post trip · ${dest.name}, ${start.getDate()} ${MONTHS[start.getMonth()]}` : 'Add name, destination & a short message'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Label({ children, styles }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Chip({ label, active, onPress, styles }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

function Stepper({ label, value, min, max, onChange, styles, colors }) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepRow}>
        <Pressable onPress={() => onChange(Math.max(min, value - 1))} style={styles.stepBtn} accessibilityLabel={`Decrease ${label}`}>
          <Ionicons name="remove" size={18} color={colors.ink} />
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable onPress={() => onChange(Math.min(max, value + 1))} style={styles.stepBtn} accessibilityLabel={`Increase ${label}`}>
          <Ionicons name="add" size={18} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(3,10,25,0.55)', justifyContent: 'flex-end' },
    embedded: { flex: 1, justifyContent: 'flex-end' },
    error: { color: c.heart, fontSize: 13, fontWeight: '600', marginTop: 10 },
    kav: { width: '100%', maxWidth: 640, alignSelf: 'center', maxHeight: '94%' },
    sheet: { backgroundColor: c.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: 18, paddingTop: 8 },
    handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: c.line, alignSelf: 'center', marginBottom: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    title: { fontSize: 22, fontWeight: '800', color: c.ink },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { fontSize: 12, fontWeight: '800', color: c.muted, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
    input: {
      height: 46,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      fontSize: 15,
      color: c.ink,
      outlineStyle: 'none',
    },
    textarea: { height: 100, paddingTop: 12 },
    counter: { fontSize: 11, color: c.muted, textAlign: 'right', marginTop: 4 },
    chips: { gap: 6, paddingTop: 8 },
    wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.card,
    },
    chipActive: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { fontSize: 13, fontWeight: '700', color: c.ink },
    steppers: { flexDirection: 'row', gap: 10, marginTop: 10 },
    stepper: { flex: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 10 },
    stepLabel: { fontSize: 11, fontWeight: '700', color: c.muted },
    stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
    stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
    stepValue: { fontSize: 18, fontWeight: '800', color: c.ink },
    segment: { flexDirection: 'row', backgroundColor: c.card, borderRadius: radius.pill, borderWidth: 1, borderColor: c.line, padding: 4 },
    segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.pill },
    segActive: { backgroundColor: c.accent },
    segText: { fontSize: 14, fontWeight: '700', color: c.muted },
    submit: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 50,
      borderRadius: radius.md,
      backgroundColor: c.accent,
      marginTop: 12,
    },
    submitText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  });
