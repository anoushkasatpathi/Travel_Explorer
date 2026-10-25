// Sign In sheet (opened from the "Sign In" button in the top navigation).
//
// With Firebase configured:
//   - Sign in / Create account with email + password, Forgot password
//   - "Continue as guest" (anonymous account) – creating an account later
//     upgrades the guest and keeps all its data
//   - Signed in: edit display name, see sync status, sign out
// Without Firebase keys: the original local-only "traveller name" profile.

import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useBuddies, initials } from '../context/BuddyContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth, authMessage } from '../context/AuthContext';
import SyncBadge from './SyncBadge';
import { radius } from '../theme';

export default function ProfileSheet({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {visible && <Content onClose={onClose} />}
    </Modal>
  );
}

function Content({ onClose }) {
  const auth = useAuth();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.card}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{auth.isSignedIn ? 'Your account' : 'Sign in'}</Text>
            <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Close profile">
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>
          {!auth.enabled ? (
            <LocalProfile onClose={onClose} />
          ) : auth.isSignedIn ? (
            <SignedIn onClose={onClose} />
          ) : (
            <AuthForms onClose={onClose} />
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function Stats() {
  const styles = useThemedStyles(makeStyles);
  const { ids } = useWishlist();
  const { posts } = useBuddies();
  const myPosts = posts.filter((p) => p.mine).length;
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.stat}>❤ {ids.length} saved places</Text>
      <Text style={styles.stat}>✈ {myPosts} trip posts</Text>
    </View>
  );
}

// ---------- Firebase signed in ----------
function SignedIn({ onClose }) {
  const auth = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState(auth.displayName);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const save = async () => {
    setBusy(true);
    try {
      await auth.updateDisplayName(name);
      setMsg('Saved');
    } catch (e) {
      setMsg(authMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(name || auth.email || '?')}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.email} numberOfLines={1}>
            {auth.email}
          </Text>
          <Stats />
        </View>
      </View>
      <SyncBadge style={{ marginTop: 12 }} />

      <Text style={styles.label}>Display name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Surya"
        placeholderTextColor={colors.muted}
        keyboardAppearance={isDark ? 'dark' : 'light'}
        maxLength={30}
        style={styles.input}
      />
      {msg && <Text style={styles.info}>{msg}</Text>}

      <View style={styles.row}>
        <Pressable
          onPress={async () => {
            await auth.signOut();
            onClose();
          }}
          style={[styles.btn, styles.btnGhost]}
        >
          <Text style={[styles.btnText, { color: colors.heart }]}>Sign out</Text>
        </Pressable>
        <Pressable onPress={save} disabled={busy || name.trim().length < 2} style={[styles.btn, (busy || name.trim().length < 2) && { opacity: 0.5 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
        </Pressable>
      </View>
      <Text style={styles.note}>Your wishlist, trip plans and buddy posts sync to this account on every device.</Text>
    </>
  );
}

// ---------- Firebase sign in / sign up ----------
function AuthForms({ onClose }) {
  const auth = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const run = async (fn, done) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
      done?.();
    } catch (e) {
      setError(authMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (mode === 'signin') return run(() => auth.signIn(email, password), onClose);
    if (mode === 'signup') return run(() => auth.signUp(name, email, password), onClose);
    return run(() => auth.resetPassword(email), () => setInfo('Password reset email sent. Check your inbox.'));
  };

  const valid =
    /\S+@\S+\.\S+/.test(email.trim()) && (mode === 'reset' || password.length >= 6) && (mode !== 'signup' || name.trim().length >= 2);

  return (
    <>
      {auth.isGuest ? (
        <View style={styles.guestBox}>
          <MaterialCommunityIcons name="account-clock-outline" size={18} color={colors.accent} />
          <Text style={styles.guestText}>
            You're browsing as a guest. Your data is saved to a guest account. Create an account to keep it on every device.
          </Text>
        </View>
      ) : auth.guestError ? (
        <View style={styles.guestBox}>
          <MaterialCommunityIcons name="cloud-off-outline" size={18} color={colors.muted} />
          <Text style={styles.guestText}>Guest mode unavailable ({auth.guestError}). Your data stays on this device until you sign in.</Text>
        </View>
      ) : null}

      {mode !== 'reset' && (
        <View style={styles.segment}>
          {[
            ['signin', 'Sign in'],
            ['signup', 'Create account'],
          ].map(([k, label]) => (
            <Pressable key={k} onPress={() => setMode(k)} style={[styles.segItem, mode === k && styles.segActive]} accessibilityRole="tab" accessibilityState={{ selected: mode === k }}>
              <Text style={[styles.segText, mode === k && { color: '#fff' }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {mode === 'signup' && (
        <>
          <Text style={styles.label}>Name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g. Surya" placeholderTextColor={colors.muted} keyboardAppearance={isDark ? 'dark' : 'light'} maxLength={30} style={styles.input} />
        </>
      )}
      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.muted}
        keyboardAppearance={isDark ? 'dark' : 'light'}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        style={styles.input}
      />
      {mode !== 'reset' && (
        <>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
            placeholderTextColor={colors.muted}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
            onSubmitEditing={valid ? submit : undefined}
          />
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {info && <Text style={styles.info}>{info}</Text>}

      <Pressable onPress={submit} disabled={!valid || busy} style={[styles.btn, styles.btnFull, (!valid || busy) && { opacity: 0.5 }]}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{mode === 'signin' ? 'Sign in' : mode === 'signup' ? (auth.isGuest ? 'Create account & keep my data' : 'Create account') : 'Send reset link'}</Text>
        )}
      </Pressable>

      <View style={styles.links}>
        {mode === 'signin' && (
          <Pressable onPress={() => setMode('reset')}>
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>
        )}
        {mode === 'reset' && (
          <Pressable onPress={() => setMode('signin')}>
            <Text style={styles.link}>← Back to sign in</Text>
          </Pressable>
        )}
        {!auth.isGuest && (
          <Pressable onPress={() => run(auth.continueAsGuest, onClose)}>
            <Text style={styles.link}>Continue as guest</Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

// ---------- No Firebase keys: local profile (previous behaviour) ----------
function LocalProfile({ onClose }) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { profileName, setProfileName } = useBuddies();
  const [name, setName] = useState(profileName);

  const save = () => {
    setProfileName(name.trim());
    onClose();
  };

  return (
    <>
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          {name.trim() ? <Text style={styles.avatarText}>{initials(name)}</Text> : <Ionicons name="person" size={26} color="#fff" />}
        </View>
        <Stats />
      </View>

      <Text style={styles.label}>Traveller name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="e.g. Surya" placeholderTextColor={colors.muted} keyboardAppearance={isDark ? 'dark' : 'light'} maxLength={30} style={styles.input} onSubmitEditing={save} />
      <Text style={styles.note}>
        Cloud accounts aren't set up in this build (no Firebase keys in .env), so your name, wishlist and trip plans are stored only on this device.
      </Text>

      <View style={styles.row}>
        {profileName ? (
          <Pressable
            onPress={() => {
              setProfileName('');
              onClose();
            }}
            style={[styles.btn, styles.btnGhost]}
          >
            <Text style={[styles.btnText, { color: colors.heart }]}>Sign out</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={save} disabled={name.trim().length < 2} style={[styles.btn, name.trim().length < 2 && { opacity: 0.5 }]}>
          <Text style={styles.btnText}>{profileName ? 'Save' : 'Continue'}</Text>
        </Pressable>
      </View>
    </>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(3,10,25,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    card: { width: '100%', maxWidth: 420, maxHeight: '92%', backgroundColor: c.bg, borderRadius: radius.lg, padding: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 22, fontWeight: '800', color: c.ink },
    close: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
    avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontWeight: '800', fontSize: 20 },
    email: { fontSize: 14, fontWeight: '800', color: c.ink, marginBottom: 2 },
    stat: { fontSize: 13, color: c.ink, fontWeight: '600', marginVertical: 1 },
    label: { fontSize: 12, fontWeight: '800', color: c.muted, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
    input: {
      height: 46,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      fontSize: 15,
      color: c.ink,
      outlineStyle: 'none',
    },
    note: { fontSize: 12, color: c.muted, marginTop: 10, lineHeight: 17 },
    error: { fontSize: 13, color: c.heart, marginTop: 10, fontWeight: '600' },
    info: { fontSize: 13, color: c.accent, marginTop: 10, fontWeight: '600' },
    row: { flexDirection: 'row', gap: 10, marginTop: 18 },
    btn: { flex: 1, height: 46, borderRadius: radius.md, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    btnFull: { flex: 0, marginTop: 18 },
    btnGhost: { backgroundColor: c.heartSoft },
    btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    segment: { flexDirection: 'row', backgroundColor: c.card, borderRadius: radius.pill, borderWidth: 1, borderColor: c.line, padding: 4, marginTop: 16 },
    segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.pill },
    segActive: { backgroundColor: c.accent },
    segText: { fontSize: 14, fontWeight: '700', color: c.muted },
    guestBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.sm, backgroundColor: c.accentSoft, marginTop: 14 },
    guestText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: c.ink },
    links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 },
    link: { fontSize: 13, fontWeight: '700', color: c.accent },
  });
