import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Polygon, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Overlay } from './Overlay';
import { GlassCard, Micro } from './primitives';
import { alpha, colors, fonts } from '../theme/tokens';

export type SyncData = { minutes: number; habit: string };

function Aura() {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [p]);
  const s = useAnimatedStyle(() => ({
    opacity: 0.6 + 0.4 * p.value,
    transform: [{ scale: 0.95 + 0.1 * p.value }],
  }));
  return (
    <Animated.View style={[styles.aura, s]} pointerEvents="none">
      <Svg width={460} height={460}>
        <Defs>
          <RadialGradient id="syncAura" cx={230} cy={230} r={230} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.gold} stopOpacity={0.34} />
            <Stop offset="0.5" stopColor={colors.gold} stopOpacity={0.1} />
            <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={230} cy={230} r={230} fill="url(#syncAura)" />
      </Svg>
    </Animated.View>
  );
}

function Star({ size = 26 }: { size?: number }) {
  const c = size / 2;
  const k = size / 2;
  const pts = `${c},0 ${c + k * 0.22},${c - k * 0.22} ${size},${c} ${c + k * 0.22},${c + k * 0.22} ${c},${size} ${c - k * 0.22},${c + k * 0.22} 0,${c} ${c - k * 0.22},${c - k * 0.22}`;
  return (
    <Svg width={size} height={size}>
      <Polygon points={pts} fill={colors.gold} />
    </Svg>
  );
}

/** "IN SYNC: completed within 12 minutes. +2x Harmony Score." */
export function SyncModal({ data, onClose }: { data: SyncData | null; onClose: () => void }) {
  const last = useRef<SyncData | null>(data);
  if (data) last.current = data;
  const d = data ?? last.current;

  return (
    <Overlay visible={!!data} onClose={onClose}>
      <View style={styles.wrap} pointerEvents="box-none">
        <Aura />
        <Pressable onPress={onClose}>
          <GlassCard strong style={styles.card} radius={30}>
            <View style={styles.starRow}>
              <Star />
            </View>
            <Text style={styles.title}>In Sync</Text>
            <Micro color={colors.textMuted} style={styles.habit}>
              {d?.habit}
            </Micro>
            <View style={styles.rule} />
            <Text style={styles.body}>
              Completed within {d?.minutes} {d?.minutes === 1 ? 'minute' : 'minutes'}
            </Text>
            <View style={styles.pill}>
              <Micro color={colors.gold} style={{ letterSpacing: 2.8 }}>
                +2× Harmony Score
              </Micro>
            </View>
          </GlassCard>
        </Pressable>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  aura: { position: 'absolute', width: 460, height: 460 },
  card: {
    width: 296,
    paddingVertical: 34,
    paddingHorizontal: 26,
    alignItems: 'center',
    borderColor: alpha(colors.gold, 0.28),
    backgroundColor: 'rgba(24,24,27,0.95)',
  },
  starRow: { height: 30, justifyContent: 'center' },
  title: {
    marginTop: 8,
    fontFamily: fonts.display,
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: 5,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  habit: { marginTop: 8 },
  rule: { width: 28, height: 1, backgroundColor: alpha(colors.gold, 0.4), marginVertical: 20 },
  body: {
    fontFamily: fonts.displayItalic,
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
    color: colors.text,
    fontVariant: ['lining-nums'],
  },
  pill: {
    marginTop: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: alpha(colors.gold, 0.4),
    backgroundColor: alpha(colors.gold, 0.08),
  },
});
