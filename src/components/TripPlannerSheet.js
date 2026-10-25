// Bottom sheet for planning a trip to a wishlisted destination.
//   • "3-Day Plan" tab: a checklist for Day 1 / Day 2 / Day 3 (add, tick, delete,
//     or tap "Suggest a plan" to auto-fill from the destination's attractions)
//   • "Notes" tab: free-text notes, saved automatically as you type
// Everything is stored by TripPlanContext (AsyncStorage cache + Firestore sync).
//
// Draggable bottom sheet: springs up when opened; drag the handle/header down
// to dismiss (it springs back if you let go early). Tapping the backdrop or ✕
// animates it away too.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  PanResponder,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { DAY_COUNT, useTripPlans } from '../context/TripPlanContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import PlaceImage from './PlaceImage';
import { radius } from '../theme';

const animateNext = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

export default function TripPlannerSheet({ destination, visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible && destination && <SheetContent destination={destination} onClose={onClose} />}
    </Modal>
  );
}

function SheetContent({ destination: d, onClose: requestClose }) {
  const insets = useSafeAreaInsets();
  // ----- drag-to-dismiss -----
  const screenH = Dimensions.get('window').height;
  const sheetY = useRef(new Animated.Value(screenH)).current;
  const closing = useRef(false);
  useEffect(() => {
    Animated.spring(sheetY, { toValue: 0, damping: 22, stiffness: 180, mass: 0.9, useNativeDriver: true }).start();
  }, [sheetY]);
  const onClose = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(sheetY, { toValue: screenH, duration: 320, useNativeDriver: true }).start(() => requestClose());
  };
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const drag = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderMove: (_, g) => sheetY.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > 120 || g.vy > 1.1) closeRef.current();
          else Animated.spring(sheetY, { toValue: 0, damping: 18, stiffness: 220, useNativeDriver: true }).start();
        },
      }),
    [sheetY]
  );
  const backdropOpacity = sheetY.interpolate({ inputRange: [0, screenH], outputRange: [1, 0], extrapolate: 'clamp' });

  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { getPlan, setNotes, addItem, toggleItem, removeItem, fillSuggestions } = useTripPlans();
  const plan = getPlan(d.id);

  const [tab, setTab] = useState('plan'); // 'plan' | 'notes'
  const [day, setDay] = useState(0);
  const [draft, setDraft] = useState('');

  // Notes are edited locally and saved shortly after typing stops (debounce),
  // so we don't write to storage on every single keystroke.
  const [notes, setLocalNotes] = useState(plan.notes);
  const [saved, setSaved] = useState(true);
  const timer = useRef(null);
  const onNotesChange = (text) => {
    setLocalNotes(text);
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setNotes(d.id, text);
      setSaved(true);
    }, 500);
  };
  // Save immediately when the sheet closes
  const notesRef = useRef(notes);
  notesRef.current = notes;
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      setNotes(d.id, notesRef.current);
    },
    [d.id, setNotes]
  );

  const all = plan.days.flat();
  const done = all.filter((it) => it.done).length;
  const items = plan.days[day];

  const submit = () => {
    if (!draft.trim()) return;
    animateNext();
    addItem(d.id, day, draft);
    setDraft('');
  };

  return (
    <View style={styles.backdropWrap}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdropTint, { opacity: backdropOpacity }]} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close planner" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 12, transform: [{ translateY: sheetY }] }]}>
          {/* drag area: handle + header */}
          <View {...drag.panHandlers} accessibilityHint="Drag down to close">
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <PlaceImage wiki={d.wiki} category={d.category} style={styles.thumb} iconSize={20} />
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>Trip planner</Text>
              <Text style={styles.title} numberOfLines={1}>
                {d.name}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8} accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {[
              { key: 'plan', label: '3-Day Plan', icon: 'format-list-checks' },
              { key: 'notes', label: 'Notes', icon: 'notebook-edit-outline' },
            ].map((t) => (
              <Pressable
                key={t.key}
                onPress={() => {
                  animateNext();
                  setTab(t.key);
                }}
                style={[styles.tab, tab === t.key && styles.tabActive]}
              >
                <MaterialCommunityIcons name={t.icon} size={16} color={tab === t.key ? '#fff' : colors.muted} />
                <Text style={[styles.tabText, tab === t.key && { color: '#fff' }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          {tab === 'plan' ? (
            <>
              {/* Progress */}
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>
                  {all.length === 0 ? 'No tasks yet' : `${done} of ${all.length} done`}
                </Text>
                <Pressable
                  onPress={() => {
                    animateNext();
                    fillSuggestions(d.id, d);
                  }}
                  style={styles.suggestBtn}
                >
                  <Ionicons name="sparkles" size={14} color={colors.accent} />
                  <Text style={styles.suggestText}>Suggest a plan</Text>
                </Pressable>
              </View>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: all.length ? `${(done / all.length) * 100}%` : '0%' }]} />
              </View>

              {/* Day selector */}
              <View style={styles.days}>
                {Array.from({ length: DAY_COUNT }, (_, i) => {
                  const dayItems = plan.days[i];
                  const dayDone = dayItems.length > 0 && dayItems.every((it) => it.done);
                  return (
                    <Pressable
                      key={i}
                      onPress={() => {
                        animateNext();
                        setDay(i);
                      }}
                      style={[styles.dayChip, day === i && styles.dayChipActive]}
                    >
                      <Text style={[styles.dayLabel, day === i && styles.dayLabelActive]}>Day {i + 1}</Text>
                      <Text style={[styles.dayCount, day === i && styles.dayLabelActive]}>
                        {dayDone ? '✓ done' : `${dayItems.length} ${dayItems.length === 1 ? 'task' : 'tasks'}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Items */}
              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {items.length === 0 && (
                  <Text style={styles.empty}>
                    Nothing planned for Day {day + 1} yet. Add a task below or tap "Suggest a plan".
                  </Text>
                )}
                {items.map((it) => (
                  <View key={it.id} style={styles.item}>
                    <Pressable
                      onPress={() => {
                        animateNext();
                        toggleItem(d.id, day, it.id);
                      }}
                      style={styles.itemMain}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: it.done }}
                    >
                      <Ionicons
                        name={it.done ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={it.done ? colors.success : colors.muted}
                      />
                      <Text style={[styles.itemText, it.done && styles.itemDone]}>{it.text}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        animateNext();
                        removeItem(d.id, day, it.id);
                      }}
                      hitSlop={8}
                      accessibilityLabel={`Delete ${it.text}`}
                    >
                      <Ionicons name="close" size={18} color={colors.muted} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>

              {/* Add row */}
              <View style={styles.addRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={submit}
                  placeholder={`Add a task for Day ${day + 1}…`}
                  placeholderTextColor={colors.muted}
                  keyboardAppearance={isDark ? 'dark' : 'light'}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  maxLength={80}
                  style={styles.addInput}
                />
                <Pressable
                  onPress={submit}
                  style={[styles.addBtn, !draft.trim() && { opacity: 0.4 }]}
                  disabled={!draft.trim()}
                  accessibilityLabel="Add task"
                >
                  <Ionicons name="add" size={22} color="#fff" />
                </Pressable>
              </View>
            </>
          ) : (
            <View>
              <TextInput
                value={notes}
                onChangeText={onNotesChange}
                multiline
                placeholder={'Hotel bookings, budget, what to pack, food to try…'}
                placeholderTextColor={colors.muted}
                keyboardAppearance={isDark ? 'dark' : 'light'}
                maxLength={1000}
                textAlignVertical="top"
                style={styles.notes}
              />
              <View style={styles.notesFooter}>
                <Text style={styles.notesMeta}>
                  {saved ? '✓ Saved' : 'Saving…'}
                </Text>
                <Text style={styles.notesMeta}>{notes.length}/1000</Text>
              </View>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    backdropWrap: { flex: 1, justifyContent: 'flex-end' },
    backdropTint: { backgroundColor: 'rgba(0,0,0,0.45)' },
    kav: { width: '100%', maxWidth: 640, alignSelf: 'center' },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingHorizontal: 18,
      paddingTop: 8,
      maxHeight: '88%',
    },
    handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.line, alignSelf: 'center', marginBottom: 12, marginTop: 2 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    thumb: { width: 48, height: 48, borderRadius: 12 },
    kicker: { fontSize: 12, fontWeight: '700', color: c.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
    title: { fontSize: 20, fontWeight: '800', color: c.ink },
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
    tabs: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.line,
      padding: 4,
      marginTop: 16,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: radius.pill,
    },
    tabActive: { backgroundColor: c.accent },
    tabText: { fontSize: 14, fontWeight: '700', color: c.muted },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
    progressText: { fontSize: 13, fontWeight: '600', color: c.muted },
    suggestBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    suggestText: { fontSize: 12, fontWeight: '700', color: c.accent },
    bar: { height: 6, borderRadius: 3, backgroundColor: c.line, marginTop: 8, overflow: 'hidden' },
    barFill: { height: '100%', backgroundColor: c.success, borderRadius: 3 },
    days: { flexDirection: 'row', gap: 8, marginTop: 14 },
    dayChip: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      paddingVertical: 8,
      alignItems: 'center',
    },
    dayChipActive: { backgroundColor: c.ink, borderColor: c.ink },
    dayLabel: { fontSize: 14, fontWeight: '800', color: c.ink },
    dayLabelActive: { color: c.bg },
    dayCount: { fontSize: 11, color: c.muted, marginTop: 1 },
    list: { marginTop: 10, maxHeight: 260 },
    empty: { fontSize: 13, color: c.muted, textAlign: 'center', paddingVertical: 24, paddingHorizontal: 12, lineHeight: 19 },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingHorizontal: 12,
      paddingVertical: 11,
      marginBottom: 8,
    },
    itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    itemText: { flex: 1, fontSize: 15, color: c.ink },
    itemDone: { color: c.muted, textDecorationLine: 'line-through' },
    addRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
    addInput: {
      flex: 1,
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
    addBtn: {
      width: 46,
      height: 46,
      borderRadius: radius.md,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notes: {
      marginTop: 16,
      minHeight: 200,
      maxHeight: 320,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      padding: 14,
      fontSize: 15,
      lineHeight: 22,
      color: c.ink,
      outlineStyle: 'none',
    },
    notesFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    notesMeta: { fontSize: 12, color: c.muted },
  });
