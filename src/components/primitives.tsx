import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { alpha, colors, fonts, radii } from '../theme/tokens';

/** Wide-tracked geometric micro-label. */
export function Micro({
  children,
  color = colors.textFaint,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.micro, { color }, style]}>{children}</Text>;
}

/** Frosted-glass surface: 4% white fill, 1px hairline, soft top sheen. */
export function GlassCard({
  children,
  style,
  strong,
  radius = radii.card,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  strong?: boolean;
  radius?: number;
}) {
  return (
    <View
      style={[
        {
          borderRadius: radius,
          borderWidth: 1,
          borderColor: colors.hairline,
          backgroundColor: strong ? colors.glassStrong : colors.glass,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.055)', 'rgba(255,255,255,0)']}
        style={[StyleSheet.absoluteFill, { height: 90 }]}
      />
      {children}
    </View>
  );
}

/** Ambient light: a breath of gold above, terracotta and sage at the lower corners. */
export function Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="bgGold" cx="50%" cy="9%" rx="75%" ry="30%" fx="50%" fy="9%">
            <Stop offset="0" stopColor={colors.gold} stopOpacity={0.13} />
            <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="bgTerra" cx="0%" cy="78%" rx="70%" ry="30%" fx="0%" fy="78%">
            <Stop offset="0" stopColor={colors.terracotta} stopOpacity={0.09} />
            <Stop offset="1" stopColor={colors.terracotta} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="bgSage" cx="100%" cy="82%" rx="70%" ry="30%" fx="100%" fy="82%">
            <Stop offset="0" stopColor={colors.sage} stopOpacity={0.09} />
            <Stop offset="1" stopColor={colors.sage} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bgGold)" />
        <Rect width="100%" height="100%" fill="url(#bgTerra)" />
        <Rect width="100%" height="100%" fill="url(#bgSage)" />
      </Svg>
    </View>
  );
}

/** Slow fade + 14px rise on mount. */
export function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }));
  }, [delay, t]);
  const a = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 14 }],
  }));
  return <Animated.View style={[a, style]}>{children}</Animated.View>;
}

/** A single golden light-sweep, fired whenever `trigger` increases. */
export function ShimmerSweep({ trigger }: { trigger: number }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(-1);
  const prev = useRef(trigger);

  useEffect(() => {
    if (trigger > prev.current && w > 0) {
      x.value = -0.5;
      x.value = withTiming(1.5, { duration: 1600, easing: Easing.inOut(Easing.cubic) });
    }
    prev.current = trigger;
  }, [trigger, w, x]);

  const a = useAnimatedStyle(() => ({
    opacity: x.value <= -0.49 ? 0 : 1,
    transform: [{ translateX: x.value * w }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: w * 0.5 }, a]}>
        <LinearGradient
          colors={[alpha(colors.gold, 0), alpha(colors.gold, 0.2), alpha(colors.gold, 0)]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  micro: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
  },
});
