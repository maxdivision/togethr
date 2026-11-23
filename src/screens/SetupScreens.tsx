import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop, GlassCard, Micro } from '../components/primitives';
import type { Backend } from '../domain/models';
import { alpha, colors, fonts } from '../theme/tokens';

function Shell({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Backdrop />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
        >
          <Text style={styles.wordmark}>DUO</Text>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Button({ label, onPress, disabled, ghost }: { label: string; onPress: () => void; disabled?: boolean; ghost?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.btn, ghost && styles.btnGhost, pressed && { opacity: 0.7 }, disabled && { opacity: 0.4 }]}
    >
      <Text style={[styles.btnText, ghost && { color: colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

export function MessageScreen({ title, body, action }: { title: string; body: string; action?: { label: string; onPress: () => void } }) {
  return (
    <Shell>
      <GlassCard style={styles.card}>
        <Text style={styles.h}>{title}</Text>
        <Text style={styles.p}>{body}</Text>
        {action && <Button label={action.label} onPress={action.onPress} />}
      </GlassCard>
    </Shell>
  );
}

export function PairingScreen({ backend }: { backend: Backend }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'choose' | 'join'>('choose');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const go = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };
  const named = name.trim().length > 0;

  return (
    <Shell>
      <Text style={styles.tag}>Two people. One streak.</Text>
      <GlassCard style={styles.card}>
        <Micro>Your name</Micro>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Luka"
          placeholderTextColor={colors.textFaint}
          maxLength={16}
          autoCapitalize="words"
          style={styles.input}
          accessibilityLabel="Your name"
        />
        {mode === 'choose' ? (
          <>
            <Button label="Create a code" disabled={!named || busy} onPress={() => go(() => backend.createPair(name.trim()))} />
            <Button label="I have a code" ghost disabled={!named || busy} onPress={() => setMode('join')} />
          </>
        ) : (
          <>
            <Micro style={{ marginTop: 18 }}>Partner's 6-digit code</Micro>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, styles.code]}
              accessibilityLabel="Partner code"
            />
            <Button label="Connect" disabled={!named || code.length !== 6 || busy} onPress={() => go(() => backend.joinPair(code, name.trim()))} />
            <Button label="Back" ghost onPress={() => { setMode('choose'); setError(''); }} />
          </>
        )}
        {!!error && <Text style={styles.err}>{error}</Text>}
      </GlassCard>
    </Shell>
  );
}

export function WaitingScreen({ code, name, onCancel }: { code: string; name: string; onCancel: () => void }) {
  return (
    <Shell>
      <GlassCard style={styles.card}>
        <Micro>Hello, {name}</Micro>
        <Text style={styles.h}>Send this code to your partner</Text>
        <Text style={styles.bigCode} accessibilityLabel={`Code ${code.split('').join(' ')}`}>
          {code.slice(0, 3)} {code.slice(3)}
        </Text>
        <Text style={styles.p}>They open DUO, enter their name and this code. This screen continues on its own once they join.</Text>
        <Button label="Cancel" ghost onPress={onCancel} />
      </GlassCard>
    </Shell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: colors.bg, overflow: 'hidden' },
  wordmark: { fontFamily: fonts.display, fontSize: 34, letterSpacing: 12, color: colors.text, textAlign: 'center' },
  tag: { fontFamily: fonts.displayItalic, fontSize: 20, color: colors.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 28 },
  card: { padding: 22, marginTop: 24 },
  h: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginTop: 8, marginBottom: 12 },
  p: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: colors.textMuted, marginBottom: 18 },
  input: {
    marginTop: 8, marginBottom: 18, height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline,
    backgroundColor: colors.glass, paddingHorizontal: 16, color: colors.text, fontFamily: fonts.sans, fontSize: 16,
  },
  code: { textAlign: 'center', fontSize: 26, letterSpacing: 8 },
  bigCode: { fontFamily: fonts.displayLight, fontSize: 52, letterSpacing: 6, color: colors.gold, textAlign: 'center', marginVertical: 14, fontVariant: ['lining-nums'] },
  btn: {
    height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 8,
    borderWidth: 1, borderColor: alpha(colors.gold, 0.5), backgroundColor: alpha(colors.gold, 0.08),
  },
  btnGhost: { borderColor: colors.hairline, backgroundColor: 'transparent' },
  btnText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: colors.text },
  err: { marginTop: 14, fontFamily: fonts.sans, fontSize: 12.5, color: colors.terracotta, textAlign: 'center' },
});
