// Horizontal row of category filters (Stage 3).

import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemedStyles } from '../context/ThemeContext';
import { CATEGORIES, categoryMeta, radius } from '../theme';

export default function CategoryChips({ selected, onSelect }) {
  const styles = useThemedStyles(makeStyles);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {CATEGORIES.map((cat) => {
        const active = cat === selected;
        const meta = categoryMeta[cat];
        return (
          <Pressable
            key={cat}
            onPress={() => onSelect(cat)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.chip, active && { backgroundColor: meta.color, borderColor: meta.color }]}
          >
            <MaterialCommunityIcons name={meta.icon} size={16} color={active ? '#fff' : meta.color} />
            <Text style={[styles.label, active && styles.labelActive]}>{cat}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    row: { gap: 8, paddingHorizontal: 16 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      height: 38,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.card,
    },
    label: { fontSize: 14, fontWeight: '600', color: c.ink },
    labelActive: { color: '#fff' },
  });
