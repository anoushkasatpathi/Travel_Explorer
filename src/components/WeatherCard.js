// Live weather tile on the Details screen: current conditions (OpenWeather)
// plus an optional 5-day forecast strip.

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWeather } from '../hooks/useWeather';
import { formatLocalTime, hasOpenWeatherKey } from '../services/weather';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { radius } from '../theme';

export default function WeatherCard({ coords, style }) {
  const { loading, current, error, reload, source } = useWeather(coords);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="thermometer" size={16} color={colors.accent} />
        <Text style={styles.label}>Weather now</Text>
      </View>

      {loading && !current && <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} />}

      {error && !current && (
        <Pressable onPress={reload}>
          <Text style={styles.error}>{error}. Tap to retry</Text>
        </Pressable>
      )}

      {current && (
        <>
          <View style={styles.main}>
            <MaterialCommunityIcons name={current.icon} size={30} color={colors.ink} />
            <Text style={styles.temp}>{current.temp}°C</Text>
          </View>
          <Text style={styles.desc} numberOfLines={1}>
            {current.label}
          </Text>
          <Text style={styles.meta}>
            Feels {current.feelsLike}° · {current.humidity}% · {current.wind} km/h
          </Text>
          <Text style={styles.source}>via {source}</Text>
        </>
      )}
    </View>
  );
}

export function ForecastStrip({ coords }) {
  const { forecast, current, source, note, loading } = useWeather(coords);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (loading && !forecast.length) return null;
  if (!forecast.length) return null;

  return (
    <View style={styles.fcCard}>
      <View style={styles.fcHeader}>
        <MaterialCommunityIcons name="calendar-week" size={16} color={colors.accent} />
        <Text style={styles.fcTitle}>5-day forecast</Text>
        {current?.sunrise && (
          <Text style={styles.sun}>
            ☀ {formatLocalTime(current.sunrise)} · ☾ {formatLocalTime(current.sunset)}
          </Text>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
        {forecast.map((f) => (
          <View key={f.key} style={styles.day}>
            <Text style={styles.dayName}>{f.day}</Text>
            <MaterialCommunityIcons name={f.icon} size={26} color={colors.accent} />
            <Text style={styles.dayMax}>{f.max}°</Text>
            <Text style={styles.dayMin}>{f.min}°</Text>
            {f.rain > 0 && <Text style={styles.rain}>💧{f.rain}%</Text>}
          </View>
        ))}
      </ScrollView>
      <Text style={styles.fcSource}>
        Live data from {source}
        {!hasOpenWeatherKey ? ' · add an OpenWeather key in .env for OpenWeather data' : ''}
        {note ? ' · OpenWeather key not accepted yet, using backup source' : ''}
      </Text>
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.line,
      padding: 14,
      minHeight: 120,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    label: { fontSize: 12, fontWeight: '700', color: c.muted, textTransform: 'uppercase' },
    main: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    temp: { fontSize: 26, fontWeight: '800', color: c.ink },
    desc: { fontSize: 14, fontWeight: '600', color: c.ink, marginTop: 2 },
    meta: { fontSize: 11, color: c.muted, marginTop: 4, lineHeight: 15 },
    source: { fontSize: 10, color: c.muted, marginTop: 4, opacity: 0.8 },
    error: { fontSize: 13, color: c.muted, marginTop: 10 },
    fcCard: {
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.line,
      padding: 14,
      marginTop: 12,
    },
    fcHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    fcTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: c.ink },
    sun: { fontSize: 11, color: c.muted },
    days: { gap: 8 },
    day: {
      width: 64,
      alignItems: 'center',
      gap: 3,
      paddingVertical: 10,
      borderRadius: radius.sm,
      backgroundColor: c.accentSoft,
    },
    dayName: { fontSize: 12, fontWeight: '800', color: c.ink },
    dayMax: { fontSize: 15, fontWeight: '800', color: c.ink },
    dayMin: { fontSize: 12, color: c.muted },
    rain: { fontSize: 10, color: c.accentDeep },
    fcSource: { fontSize: 10, color: c.muted, marginTop: 8 },
  });
