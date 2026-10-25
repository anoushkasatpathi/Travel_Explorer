// Round heart button that adds/removes a destination from the wishlist.
// Micro-animation: the heart "pops" (springs bigger and back) when tapped.

import { useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';
import { shadow } from '../theme';

export default function HeartButton({ id, size = 34, style }) {
  const { isWishlisted, toggle } = useWishlist();
  const { colors } = useTheme();
  const saved = isWishlisted(id);
  const pop = useRef(new Animated.Value(1)).current;

  const onPress = () => {
    toggle(id);
    pop.setValue(saved ? 0.8 : 1.4);
    Animated.spring(pop, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      style={({ pressed }) => [
        styles.btn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.overlay,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Ionicons
          name={saved ? 'heart' : 'heart-outline'}
          size={size * 0.55}
          color={saved ? colors.heart : colors.ink}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', ...shadow },
});
