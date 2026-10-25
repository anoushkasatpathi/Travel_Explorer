// Horizontal filter pills with a highlight that slides (springs) between options.
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../context/ThemeContext';

export default function FilterPills({ options, value, onChange, trailing, style }) {
  const styles = useThemedStyles(makeStyles);
  const [layouts, setLayouts] = useState({});
  const x = useRef(new Animated.Value(0)).current;
  const w = useRef(new Animated.Value(0)).current;
  const first = useRef(true);

  useEffect(() => {
    const l = layouts[value];
    if (!l) return;
    if (first.current) {
      x.setValue(l.x);
      w.setValue(l.width);
      first.current = false;
      return;
    }
    Animated.parallel([
      Animated.spring(x, { toValue: l.x, damping: 18, stiffness: 180, useNativeDriver: false }),
      Animated.spring(w, { toValue: l.width, damping: 18, stiffness: 180, useNativeDriver: false }),
    ]).start();
  }, [value, layouts, x, w]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ flexGrow: 0 }, style]} contentContainerStyle={styles.row}>
      <View style={styles.inner}>
        {layouts[value] && <Animated.View style={[styles.indicator, { left: x, width: w }]} />}
        {options.map((o) => {
          const active = o.key === value;
          return (
            <Pressable
              key={o.key}
              onLayout={(e) => {
                const { x: lx, width } = e.nativeEvent.layout;
                setLayouts((prev) => (prev[o.key]?.x === lx && prev[o.key]?.width === width ? prev : { ...prev, [o.key]: { x: lx, width } }));
              }}
              onPress={() => onChange(o.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={styles.pill}
            >
              <Text style={[styles.text, active && styles.textActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {trailing}
    </ScrollView>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    row: { alignItems: 'center', gap: 8 },
    inner: { flexDirection: 'row', backgroundColor: c.card, borderRadius: 999, borderWidth: 1, borderColor: c.line, padding: 3 },
    indicator: { position: 'absolute', top: 3, bottom: 3, borderRadius: 999, backgroundColor: c.accent },
    pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
    text: { fontSize: 13, fontWeight: '700', color: c.ink },
    textActive: { color: '#fff' },
  });
