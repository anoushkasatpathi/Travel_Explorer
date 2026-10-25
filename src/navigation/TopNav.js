// Top navigation bar, styled after the "Travel Around The World" template.
// - Wide screens: logo, inline links with an animated underline, dark-mode
//   switch and a "Sign In" (traveller profile) button.
// - Phones: logo + menu button that opens a drawer sliding in from the left.
// Rendered by the tab navigator (tabBarPosition: 'top', custom tabBar).

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useBuddies, initials } from '../context/BuddyContext';
import ProfileSheet from '../components/ProfileSheet';
import { fonts } from '../fonts';

export const NAV_BREAKPOINT = 900;

export default function TopNav({ state, descriptors, navigation, items }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isDark, toggle, colors } = useTheme();
  const { profileName } = useBuddies();
  const [drawer, setDrawer] = useState(false);
  const [profile, setProfile] = useState(false);
  const wide = width >= NAV_BREAKPOINT;

  const go = (route, index) => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (state.index !== index && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    setDrawer(false);
  };

  const bg = isDark ? '#071430' : '#2A7DE6';

  return (
    <View style={[styles.bar, { paddingTop: insets.top + (wide ? 12 : 8), backgroundColor: bg }]}>
      <View style={[styles.inner, { paddingHorizontal: wide ? 40 : 16 }]}>
        {!wide && (
          <Pressable onPress={() => setDrawer(true)} style={styles.iconBtn} accessibilityLabel="Open menu">
            <Ionicons name="menu" size={24} color="#fff" />
          </Pressable>
        )}

        <Logo compact={!wide} />

        {wide && (
          <View style={styles.links}>
            {state.routes.map((route, index) => (
              <NavLink
                key={route.key}
                label={items[route.name].label}
                focused={state.index === index}
                badge={descriptors[route.key].options.tabBarBadge}
                onPress={() => go(route, index)}
              />
            ))}
          </View>
        )}

        <View style={{ flex: wide ? 0 : 1 }} />

        <Pressable
          onPress={toggle}
          style={styles.iconBtn}
          accessibilityRole="switch"
          accessibilityState={{ checked: isDark }}
          accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color="#fff" />
        </Pressable>

        <Pressable
          onPress={() => setProfile(true)}
          style={({ pressed }) => [styles.signIn, !wide && styles.signInCompact, pressed && { opacity: 0.8 }]}
          accessibilityLabel={profileName ? `Profile: ${profileName}` : 'Sign in'}
        >
          {profileName ? (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(profileName)}</Text>
            </View>
          ) : null}
          {(wide || !profileName) && (
            <Text style={styles.signInText}>{profileName ? profileName.split(' ')[0] : 'Sign In'}</Text>
          )}
          {!profileName && <Ionicons name="person-outline" size={15} color="#fff" />}
        </Pressable>
      </View>

      <Drawer
        visible={drawer}
        onClose={() => setDrawer(false)}
        routes={state.routes}
        index={state.index}
        items={items}
        descriptors={descriptors}
        onGo={go}
        colors={colors}
      />
      <ProfileSheet visible={profile} onClose={() => setProfile(false)} />
    </View>
  );
}

export function Logo({ compact, light = true }) {
  const color = light ? '#FFFFFF' : '#0B2350';
  return (
    <View style={styles.logo} accessibilityLabel="Travel Explorer">
      <MaterialCommunityIcons name="send" size={compact ? 26 : 32} color={color} style={{ transform: [{ rotate: '-25deg' }] }} />
      <View>
        <Text style={[styles.logoTitle, { color, fontSize: compact ? 16 : 20 }]}>TRAVEL</Text>
        <Text style={[styles.logoSub, { color }]}>EXPLORER · INDIA & BEYOND</Text>
      </View>
    </View>
  );
}

function NavLink({ label, focused, onPress, badge }) {
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: focused ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [focused, anim]);

  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} style={styles.link}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={[styles.linkText, focused && styles.linkActive]}>{label}</Text>
        {badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Animated.View
        style={[
          styles.underline,
          { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), opacity: anim },
        ]}
      />
    </Pressable>
  );
}

function Drawer({ visible, onClose, routes, index, items, descriptors, onGo, colors }) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      slide.setValue(0);
      Animated.timing(slide, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [visible, slide]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
      <Animated.View
        style={[
          styles.drawer,
          { paddingTop: insets.top + 18, backgroundColor: colors.sidebar },
          { transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-300, 0] }) }] },
        ]}
      >
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Logo />
        </View>
        {routes.map((route, i) => {
          const meta = items[route.name];
          const focused = i === index;
          const badge = descriptors[route.key].options.tabBarBadge;
          return (
            <Pressable
              key={route.key}
              onPress={() => onGo(route, i)}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              style={[styles.drawerItem, focused && { backgroundColor: colors.sidebarActive }]}
            >
              <Ionicons name={focused ? meta.icon[0] : meta.icon[1]} size={20} color={focused ? '#fff' : colors.sidebarInk} />
              <Text style={[styles.drawerText, { color: focused ? '#fff' : colors.sidebarInk }]}>{meta.label}</Text>
              {badge !== undefined && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: { paddingBottom: 12, zIndex: 10 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 1280, alignSelf: 'center' },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoTitle: { fontFamily: fonts.heading, letterSpacing: 1.5, lineHeight: 22 },
  logoSub: { fontFamily: fonts.semi, fontSize: 8, letterSpacing: 1.2, opacity: 0.9 },
  links: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 28 },
  link: { paddingVertical: 6 },
  linkText: { fontFamily: fonts.semi, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  linkActive: { fontFamily: fonts.bold, color: '#FFFFFF' },
  underline: { height: 2, backgroundColor: '#FFFFFF', borderRadius: 1, marginTop: 6, alignSelf: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  signIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  signInCompact: { paddingHorizontal: 10, paddingVertical: 6 },
  signInText: { fontFamily: fonts.bold, color: '#fff', fontSize: 13 },
  avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#1E6FE8', fontWeight: '800', fontSize: 10 },
  badge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: '#E23B5A', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,10,25,0.5)' },
  drawer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 280, paddingHorizontal: 12, gap: 6 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12 },
  drawerText: { flex: 1, fontFamily: fonts.bold, fontSize: 15 },
});
