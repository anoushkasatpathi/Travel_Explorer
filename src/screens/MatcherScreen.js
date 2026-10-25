// Packages / Trip Matcher (Extension 1), redesigned as an animated step-by-step flow:
//   1 Trip style → 2 Where → 3 Budget (train slider) → 4 Length → 5 Matches
// - each step slides + fades in (direction-aware), the stepper bar fills up
// - a live "top matches" preview updates as you answer
// - results show score rings that fill up and REORDER with animated
//   transitions whenever an answer changes
// Opening a pricing plan from Home ("Select Plan") pre-sets the budget and
// jumps to the budget step.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { DURATIONS, TRIP_TYPES, WHERE, matchDestinations } from '../utils/matcher';
import TrainBudgetSlider, { formatRupees } from '../components/TrainBudgetSlider';
import PlaceImage from '../components/PlaceImage';
import HeartButton from '../components/HeartButton';
import EmptyState from '../components/EmptyState';
import ProgressRing from '../motion/ProgressRing';
import { DUR, EASE, FadeSlideIn, tween } from '../motion/motion';
import { placeLabel } from '../data/destinations';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { radius, shadow } from '../theme';
import { fonts } from '../fonts';

const MAX_WIDTH = 680;
const STEPS = [
  { key: 'style', label: 'Style', title: 'What kind of trip?' },
  { key: 'where', label: 'Where', title: 'Where would you like to go?' },
  { key: 'budget', label: 'Budget', title: 'Budget per person' },
  { key: 'length', label: 'Length', title: 'How long is the trip?' },
  { key: 'results', label: 'Matches', title: 'Your matches' },
];
const EMPTY = { tripType: null, budget: null, duration: null, where: 'all' };

export default function MatcherScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [answers, setAnswers] = useState(EMPTY);
  const [dragging, setDragging] = useState(false); // pause scrolling while the train is dragged
  const [plan, setPlan] = useState(null); // pricing plan picked on the Home page
  const [step, setStepState] = useState(0);
  const [dir, setDir] = useState(1);
  const progress = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);

  const setStep = (s) => {
    const next = Math.max(0, Math.min(STEPS.length - 1, s));
    setDir(next >= step ? 1 : -1);
    setStepState(next);
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  };

  useEffect(() => {
    tween(progress, step / (STEPS.length - 1), { duration: DUR.slow, native: false }).start();
  }, [step, progress]);

  // Opened from a pricing plan ("Select Plan") on the Home page
  useEffect(() => {
    const p = route.params;
    if (!p?.t) return;
    setAnswers((prev) => ({ ...prev, budget: p.budget ?? prev.budget, where: p.where ?? prev.where }));
    setPlan(p.plan || null);
    setDir(1);
    setStepState(2);
  }, [route.params?.t]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key, value) => setAnswers((prev) => ({ ...prev, [key]: prev[key] === value ? null : value })); // tap again to unselect

  const anySelected = answers.tripType || answers.budget || answers.duration;
  const results = useMemo(() => (anySelected ? matchDestinations(answers).slice(0, 12) : []), [answers, anySelected]);
  const current = STEPS[step];
  const isResults = current.key === 'results';

  const summary = [
    answers.tripType && { step: 0, text: TRIP_TYPES.find((t) => t.key === answers.tripType)?.label },
    { step: 1, text: WHERE.find((w) => w.key === answers.where)?.label },
    answers.budget && { step: 2, text: formatRupees(answers.budget) },
    answers.duration && { step: 3, text: DURATIONS.find((d) => d.key === answers.duration)?.label },
  ].filter(Boolean);

  return (
    <View style={styles.safe}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} scrollEnabled={!dragging}>
        <FadeSlideIn from={{ y: 16 }}>
          <Text style={styles.kicker}>PACKAGES · TRIP MATCHER</Text>
          <Text style={styles.title}>Find your perfect trip</Text>
        </FadeSlideIn>

        {plan && (
          <FadeSlideIn delay={150} style={styles.planBanner} from={{ y: 10 }}>
            <Ionicons name="pricetag" size={14} color={colors.accent} />
            <Text style={styles.planText}>{plan} plan selected: your budget is set on the train. Choose a trip style next.</Text>
          </FadeSlideIn>
        )}

        {/* Stepper */}
        <View style={styles.stepper}>
          <View style={styles.stepTrack}>
            <Animated.View style={[styles.stepFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>
          <View style={styles.stepDots}>
            {STEPS.map((s, i) => {
              const done = i < step;
              const activeStep = i === step;
              return (
                <Pressable key={s.key} onPress={() => setStep(i)} style={styles.stepItem} accessibilityRole="tab" accessibilityState={{ selected: activeStep }} accessibilityLabel={`Step ${i + 1}: ${s.label}`}>
                  <View style={[styles.dot, (done || activeStep) && styles.dotOn, activeStep && styles.dotActive]}>
                    {done ? <Ionicons name="checkmark" size={12} color="#fff" /> : <Text style={[styles.dotText, activeStep && { color: '#fff' }]}>{i + 1}</Text>}
                  </View>
                  <Text style={[styles.stepLabel, activeStep && { color: colors.accent }]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Current step */}
        <FadeSlideIn key={step} trigger={step} from={{ x: dir * 48 }} duration={DUR.med} style={styles.panel}>
          <Text style={styles.stepCount}>
            STEP {step + 1} OF {STEPS.length}
          </Text>
          <Text style={styles.qTitle}>{current.title}</Text>

          {current.key === 'style' && (
            <View style={styles.grid}>
              {TRIP_TYPES.map((t, i) => (
                <FadeSlideIn key={t.key} delay={i * 60} from={{ y: 14 }} style={styles.gridItem}>
                  <Option active={answers.tripType === t.key} onPress={() => set('tripType', t.key)} icon={t.icon} label={t.label} />
                </FadeSlideIn>
              ))}
            </View>
          )}

          {current.key === 'where' && (
            <View style={styles.rowOptions}>
              {WHERE.map((w, i) => (
                <FadeSlideIn key={w.key} delay={i * 70} from={{ y: 14 }} style={{ flex: 1 }}>
                  <Option active={answers.where === w.key} onPress={() => setAnswers((prev) => ({ ...prev, where: w.key }))} icon={w.icon} label={w.label} />
                </FadeSlideIn>
              ))}
            </View>
          )}

          {current.key === 'budget' && (
            <TrainBudgetSlider value={answers.budget} onChange={(amount) => setAnswers((prev) => ({ ...prev, budget: amount }))} onDragChange={setDragging} />
          )}

          {current.key === 'length' && (
            <View style={styles.rowOptions}>
              {DURATIONS.map((d, i) => (
                <FadeSlideIn key={d.key} delay={i * 70} from={{ y: 14 }} style={{ flex: 1 }}>
                  <Option active={answers.duration === d.key} onPress={() => set('duration', d.key)} label={d.label} hint={d.hint} />
                </FadeSlideIn>
              ))}
            </View>
          )}

          {isResults && (
            <>
              <View style={styles.summary}>
                {summary.map((s) => (
                  <Pressable key={s.step} onPress={() => setStep(s.step)} style={styles.summaryChip} accessibilityLabel={`Edit ${s.text}`}>
                    <Text style={styles.summaryText}>{s.text}</Text>
                    <Ionicons name="create-outline" size={12} color={colors.accent} />
                  </Pressable>
                ))}
                {anySelected && (
                  <Pressable
                    onPress={() => {
                      setAnswers(EMPTY);
                      setPlan(null);
                      setStep(0);
                    }}
                  >
                    <Text style={styles.reset}>Start over</Text>
                  </Pressable>
                )}
              </View>
              {!anySelected && <EmptyState icon="sparkles-outline" title="Pick at least one option" message="Go back a step and choose a style, budget or length." />}
              {anySelected && results.length === 0 && <EmptyState icon="sad-outline" title="No close matches" message="Try changing one of your answers." />}
              <RankedResults results={results} rowH={112} onOpen={(d) => navigation.navigate('Details', { id: d.id })} />
            </>
          )}
        </FadeSlideIn>

        {/* Nav buttons */}
        <View style={styles.navRow}>
          <Pressable onPress={() => setStep(step - 1)} disabled={step === 0} style={[styles.backBtn, step === 0 && { opacity: 0.35 }]} accessibilityLabel="Previous step">
            <Ionicons name="arrow-back" size={16} color={colors.ink} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          {!isResults && (
            <Pressable onPress={() => setStep(step + 1)} style={styles.nextBtn} accessibilityLabel={step === STEPS.length - 2 ? 'See matches' : 'Next step'}>
              <Text style={styles.nextText}>{step === STEPS.length - 2 ? 'See matches' : 'Next'}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </Pressable>
          )}
        </View>

        {/* Live preview while answering */}
        {!isResults && anySelected && results.length > 0 && (
          <View style={styles.preview}>
            <View style={styles.previewHead}>
              <Text style={styles.sectionTitle}>Top matches so far</Text>
              <Pressable onPress={() => setStep(STEPS.length - 1)}>
                <Text style={styles.reset}>See all {results.length}</Text>
              </Pressable>
            </View>
            <RankedResults results={results.slice(0, 3)} rowH={96} compact onOpen={(d) => navigation.navigate('Details', { id: d.id })} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Results list whose rows glide to their new position when the ranking changes
function RankedResults({ results, rowH, compact, onOpen }) {
  const tops = useRef({}).current; // id -> Animated.Value(top)
  const fades = useRef({}).current; // id -> Animated.Value(opacity)

  results.forEach(({ destination: d }, i) => {
    if (!tops[d.id]) {
      tops[d.id] = new Animated.Value(i * rowH);
      fades[d.id] = new Animated.Value(0);
    }
  });

  const order = results.map((r) => r.destination.id).join('|');
  useEffect(() => {
    results.forEach(({ destination: d }, i) => {
      Animated.spring(tops[d.id], { toValue: i * rowH, damping: 20, stiffness: 140, mass: 0.9, useNativeDriver: false }).start();
      tween(fades[d.id], 1, { duration: DUR.med, delay: i * 50, native: false }).start();
    });
    // forget rows that left so they fade in again if they come back
    Object.keys(tops).forEach((id) => {
      if (!results.some((r) => r.destination.id === id)) {
        delete tops[id];
        delete fades[id];
      }
    });
  }, [order, rowH]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ height: results.length * rowH, marginTop: 6 }}>
      {results.map((r, i) => (
        <Animated.View
          key={r.destination.id}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: tops[r.destination.id],
            opacity: fades[r.destination.id],
            transform: [{ scale: fades[r.destination.id].interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
          }}
        >
          <ResultRow result={r} rank={i} height={rowH - 12} compact={compact} onOpen={onOpen} />
        </Animated.View>
      ))}
    </View>
  );
}

function ResultRow({ result: { destination: d, score, reasons }, rank, height, compact, onOpen }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={() => onOpen(d)} style={({ pressed }) => [styles.result, { height }, pressed && { opacity: 0.85 }]} accessibilityLabel={`${d.name}, ${score}% match`}>
      <PlaceImage wiki={d.wiki} category={d.category} style={[styles.resultImg, compact && { width: 60, height: 60 }]} iconSize={22}>
        {rank === 0 && (
          <View style={styles.bestBadge}>
            <Ionicons name="star" size={10} color="#fff" />
            <Text style={styles.bestText}>Best</Text>
          </View>
        )}
      </PlaceImage>
      <View style={{ flex: 1 }}>
        <Text style={styles.resultName} numberOfLines={1}>
          {d.name}
        </Text>
        <Text style={styles.resultPlace} numberOfLines={1}>
          {placeLabel(d)}
        </Text>
        {!compact && (
          <View style={styles.reasons}>
            {reasons.slice(0, 2).map((r) => (
              <Text key={r} style={styles.reason} numberOfLines={1}>
                ✓ {r}
              </Text>
            ))}
          </View>
        )}
      </View>
      <ProgressRing size={compact ? 48 : 56} stroke={5} progress={score / 100} color={colors.accent} track={colors.line} delay={rank * 80}>
        <Text style={styles.score}>{score}%</Text>
      </ProgressRing>
      {!compact && <HeartButton id={d.id} size={32} />}
    </Pressable>
  );
}

function Option({ active, onPress, icon, label, hint, style }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const v = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: active ? 1 : 0, damping: 14, stiffness: 200, useNativeDriver: true }).start();
  }, [active, v]);
  return (
    <Animated.View style={{ transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }] }}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.option, active && styles.optionActive, style]}>
        {icon && <MaterialCommunityIcons name={icon} size={24} color={active ? colors.white : colors.accent} />}
        <Text style={[styles.optionLabel, active && { color: colors.white }]}>{label}</Text>
        {hint && <Text style={[styles.optionHint, active && { color: 'rgba(255,255,255,0.85)' }]}>{hint}</Text>}
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, paddingTop: 20, paddingBottom: 40, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
    kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: c.accent },
    title: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, color: c.ink, letterSpacing: 1, marginTop: 2 },
    planBanner: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12, padding: 10, borderRadius: radius.sm, backgroundColor: c.accentSoft },
    planText: { flex: 1, fontSize: 12, color: c.ink, fontWeight: '600' },
    stepper: { marginTop: 18 },
    stepTrack: { position: 'absolute', left: 22, right: 22, top: 13, height: 3, borderRadius: 2, backgroundColor: c.line, overflow: 'hidden' },
    stepFill: { height: '100%', backgroundColor: c.accent, borderRadius: 2 },
    stepDots: { flexDirection: 'row', justifyContent: 'space-between' },
    stepItem: { alignItems: 'center', gap: 6, width: 56 },
    dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.card, borderWidth: 2, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
    dotOn: { backgroundColor: c.accent, borderColor: c.accent },
    dotActive: { transform: [{ scale: 1.12 }] },
    dotText: { fontSize: 12, fontWeight: '800', color: c.muted },
    stepLabel: { fontSize: 11, fontWeight: '700', color: c.muted },
    panel: {
      marginTop: 18,
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.line,
      padding: 18,
      ...shadow,
    },
    stepCount: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: c.muted },
    qTitle: { fontFamily: fonts.heading, fontSize: 20, color: c.ink, marginTop: 4, marginBottom: 14 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    gridItem: { width: '48%', flexGrow: 1 },
    rowOptions: { flexDirection: 'row', gap: 10 },
    option: {
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      paddingVertical: 16,
      paddingHorizontal: 10,
      alignItems: 'center',
      gap: 5,
    },
    optionActive: { backgroundColor: c.accent, borderColor: c.accent },
    optionLabel: { fontSize: 13, fontWeight: '700', color: c.ink, textAlign: 'center' },
    optionHint: { fontSize: 11, color: c.muted, textAlign: 'center' },
    navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999, backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    backText: { fontWeight: '700', color: c.ink },
    nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999, backgroundColor: c.accent },
    nextText: { fontFamily: fonts.bold, color: '#fff', fontSize: 14 },
    summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 },
    summaryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: c.accentSoft },
    summaryText: { fontSize: 12, fontWeight: '700', color: c.accentDeep },
    preview: { marginTop: 24 },
    previewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: c.ink },
    reset: { color: c.accent, fontWeight: '700' },
    result: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.line,
      padding: 10,
    },
    resultImg: { width: 76, height: 76, borderRadius: radius.sm },
    bestBadge: {
      position: 'absolute',
      top: 4,
      left: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: c.accent,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    bestText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    resultName: { fontSize: 16, fontWeight: '700', color: c.ink },
    resultPlace: { fontSize: 12, color: c.muted, marginTop: 1 },
    score: { fontSize: 12, fontWeight: '800', color: c.ink },
    reasons: { marginTop: 5, gap: 1 },
    reason: { fontSize: 11, color: c.muted },
  });
