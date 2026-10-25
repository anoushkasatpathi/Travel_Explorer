import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { categoryMeta, radius } from '../theme';

export default function CategoryPill({ category, style }) {
  const meta = categoryMeta[category];
  return (
    <View style={[styles.pill, { backgroundColor: meta.color }, style]}>
      <MaterialCommunityIcons name={meta.icon} size={12} color="#fff" />
      <Text style={styles.text}>{category}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
