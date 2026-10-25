import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../context/ThemeContext';

export default function ThemeToggle({ style }) {
  const { isDark, toggle, colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }, style]}
    >
      <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={isDark ? '#9CC6FF' : colors.ink} />
    </Pressable>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    btn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
    },
  });
