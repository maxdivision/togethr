import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { PulseFx } from '../state/types';
import { alpha, colors } from '../theme/tokens';

function RippleRing({
  id,
  delay,
  color,
  x,
  y,
}: {
  id: number;
  delay: number;
  color: string;
  x: number;
  y: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!id) return;
    t.value = 0;
    t.value = withDelay(delay, withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) }));
  }, [id, delay, t]);

  const a = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.08, 1], [0, 0.6, 0]),
    transform: [{ scale: 0.1 + t.value * 7.5 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: x - 70,
          top: y - 70,
          width: 140,
          height: 140,
          borderRadius: 70,
          borderWidth: 1.2,
          borderColor: color,
          backgroundColor: alpha(color, 0.05),
        },
        a,
      ]}
    />
  );
}

/** An expanding ripple across the whole UI. "send" rises from the pulse button, "receive" from above. */
export function PulseRipple({ fx, width, height }: { fx: PulseFx | null; width: number; height: number }) {
  const id = fx?.id ?? 0;
  const send = fx?.tone === 'send';
  const color = send ? colors.terracotta : colors.sage;
  const x = width / 2;
  const y = send ? height * 0.74 : height * 0.2;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 20 }]} pointerEvents="none">
      <RippleRing id={id} delay={0} color={color} x={x} y={y} />
      <RippleRing id={id} delay={260} color={color} x={x} y={y} />
      <RippleRing id={id} delay={520} color={colors.gold} x={x} y={y} />
    </View>
  );
}

/** Warm radial glow that washes across the screen when you "send warmth". */
export function WarmGlow({ pulse }: { pulse: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!pulse) return;
    t.value = withSequence(
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.cubic) }),
    );
  }, [pulse, t]);
  const a = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ scale: 0.9 + 0.2 * t.value }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 25 }, a]} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="warm" cx="50%" cy="48%" rx="85%" ry="60%" fx="50%" fy="48%">
            <Stop offset="0" stopColor={colors.gold} stopOpacity={0.3} />
            <Stop offset="0.5" stopColor={colors.terracotta} stopOpacity={0.16} />
            <Stop offset="1" stopColor={colors.terracotta} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#warm)" />
      </Svg>
    </Animated.View>
  );
}
