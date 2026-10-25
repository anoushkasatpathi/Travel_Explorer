import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { radius } from '../theme';

export default function EmptyState({ icon, title, message, actionLabel, onAction }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={34} color={colors.accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && (
        <Pressable onPress={onAction} style={styles.btn}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    wrap: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48, gap: 8 },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    title: { fontSize: 18, fontWeight: '700', color: c.ink, textAlign: 'center' },
    message: { fontSize: 14, color: c.muted, textAlign: 'center', lineHeight: 20 },
    btn: {
      marginTop: 12,
      backgroundColor: c.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: radius.pill,
    },
    btnText: { color: '#fff', fontWeight: '700' },
  });
