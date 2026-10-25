// Floating "Post a trip" button that expands into the form:
// a blue circle grows out of the button until it fills the screen, then the
// form rises in on top. Closing plays it in reverse back into the button.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EASE, EASE_IN_OUT, tween } from '../motion/motion';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../fonts';

const FAB = 60;

const ExpandingFab = forwardRef(function ExpandingFab({ label = 'Post a trip', renderContent }, ref) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const fabRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState(null); // {x, y} centre of the FAB on screen
  const [payload, setPayload] = useState(null);
  const grow = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  // gentle idle pulse on the button
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([tween(pulse, 1, { duration: 1400, delay: 1200 }), tween(pulse, 0, { duration: 1400 })]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const show = (data = null) => {
    setPayload(data);
    const done = (x, y) => {
      setOrigin({ x, y });
      setOpen(true);
      grow.setValue(0);
      content.setValue(0);
      Animated.sequence([tween(grow, 1, { duration: 620, easing: EASE_IN_OUT }), tween(content, 1, { duration: 520, easing: EASE })]).start();
    };
    const node = fabRef.current;
    if (node?.measureInWindow) node.measureInWindow((x, y, w, h) => done(x + w / 2, y + h / 2));
    else {
      const { width, height } = Dimensions.get('window');
      done(width - 46, height - 46);
    }
  };

  const hide = () => {
    Animated.sequence([tween(content, 0, { duration: 260 }), tween(grow, 0, { duration: 520, easing: EASE_IN_OUT })]).start(() => setOpen(false));
  };

  useImperativeHandle(ref, () => ({ open: show, close: hide }));

  const { width, height } = Dimensions.get('window');
  const R = origin ? Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y)) : 0;
  const scale = grow.interpolate({ inputRange: [0, 1], outputRange: [FAB / 2 / Math.max(R, 1), 1] });

  return (
    <>
      <Animated.View
        style={[
          styles.fabWrap,
          { bottom: insets.bottom + 22, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] },
        ]}
      >
        <Pressable ref={fabRef} onPress={() => show()} style={({ pressed }) => [styles.fab, { backgroundColor: colors.accent }, pressed && { transform: [{ scale: 0.95 }] }]} accessibilityRole="button" accessibilityLabel={label}>
          <Ionicons name="add" size={26} color="#fff" />
          <Text style={styles.fabText}>{label}</Text>
        </Pressable>
      </Animated.View>

      <Modal visible={open} transparent animationType="none" onRequestClose={hide} statusBarTranslucent>
        <View style={StyleSheet.absoluteFill}>
          {origin && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.circle,
                {
                  backgroundColor: colors.accent,
                  width: R * 2,
                  height: R * 2,
                  borderRadius: R,
                  left: origin.x - R,
                  top: origin.y - R,
                  transform: [{ scale }],
                  opacity: grow.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 0.94] }),
                },
              ]}
            />
          )}
          <Pressable style={StyleSheet.absoluteFill} onPress={hide} accessibilityLabel="Close" />
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: content, transform: [{ translateY: content.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] },
            ]}
            pointerEvents="box-none"
          >
            {open && renderContent?.({ close: hide, payload })}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
});

export default ExpandingFab;

const styles = StyleSheet.create({
  fabWrap: { position: 'absolute', right: 20 },
  fab: {
    height: FAB,
    paddingHorizontal: 20,
    borderRadius: FAB / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0B2350',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  fabText: { fontFamily: fonts.bold, color: '#fff', fontSize: 14 },
  circle: { position: 'absolute' },
});
