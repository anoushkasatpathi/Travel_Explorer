// Small live-temperature badge shown on package cards (real-time weather).
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWeather } from '../hooks/useWeather';

export default function LiveTemp({ coords, style }) {
  const { current } = useWeather(coords);
  if (!current) return null;
  return (
    <View style={[styles.badge, style]}>
      <MaterialCommunityIcons name={current.icon} size={13} color="#0B2350" />
      <Text style={styles.text}>{current.temp}°C</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: { fontSize: 11, fontWeight: '800', color: '#0B2350' },
});
