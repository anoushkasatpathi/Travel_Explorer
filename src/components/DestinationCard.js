// Grid card used on the Home screen (Stage 1).
// Micro-animations: cards fade/slide in one after another, and shrink
// slightly while pressed (spring). onPress receives the image ref so the
// hero transition can measure where the photo is.

import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PlaceImage from './PlaceImage';
import HeartButton from './HeartButton';
import CategoryPill from './CategoryPill';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { radius, shadow } from '../theme';
import { getCountry } from '../data/countries';
import { isAbroad } from '../data/destinations';

export default function DestinationCard({ destination, width, onPress, index = 0 }) {
  const d = destination;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const imageRef = useRef(null);

  const appear = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index, 8) * 60,
      useNativeDriver: true,
    }).start();
  }, [appear, index]);

  const springTo = (v) => Animated.spring(press, { toValue: v, speed: 40, bounciness: 6, useNativeDriver: true }).start();

  return (
    <Animated.View
      style={{
        width,
        opacity: appear,
        transform: [
          { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
          { scale: press },
        ],
      }}
    >
      <Pressable
        onPress={() => onPress(imageRef)}
        onPressIn={() => springTo(0.96)}
        onPressOut={() => springTo(1)}
        style={styles.card}
      >
        <PlaceImage ref={imageRef} wiki={d.wiki} category={d.category} style={styles.image}>
          <HeartButton id={d.id} size={32} style={styles.heart} />
          <CategoryPill category={d.category} style={styles.pill} />
        </PlaceImage>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {d.name}
          </Text>
          <View style={styles.row}>
            <Ionicons name="location-sharp" size={12} color={colors.muted} />
            <Text style={styles.location} numberOfLines={1}>
              {isAbroad(d) ? `${getCountry(d.countryCode).flag} ${d.country}` : d.location}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.line,
      ...shadow,
    },
    image: { height: 160, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
    heart: { position: 'absolute', top: 8, right: 8 },
    pill: { position: 'absolute', bottom: 8, left: 8 },
    body: { padding: 10, gap: 3 },
    name: { fontSize: 15, fontWeight: '700', color: c.ink },
    row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    location: { fontSize: 12, color: c.muted, flexShrink: 1 },
  });
