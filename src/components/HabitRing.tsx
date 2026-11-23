import React, { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as feel from '../lib/haptics';
import { alpha, colors, motion } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  color: string;
  done: boolean;
  /** Only your own ring can be held. */
  interactive?: boolean;
  onComplete?: () => void;
  /** Partner shared a photo moment that hasn't been viewed: gold ring until opened. */
  indicator?: boolean;
  /** Tap on a non-interactive ring (e.g. open the partner's photo moment). */
  onPress?: () => void;
  label: string;
  size?: number;
};

/**
 * The ritual ring. Press and hold for 1.2s: a luminous stroke fills while mechanical haptic ticks
 * escalate in weight and cadence; at 100% a success haptic confirms. Release early and it drains.
 */
function HabitRingBase({
  color,
  done,
  interactive = false,
  onComplete,
  indicator = false,
  onPress,
  label,
  size = 60,
}: Props) {
  const c = size / 2;
  const r = size / 2 - 9;
  const circ = 2 * Math.PI * r;

  const progress = useSharedValue(done ? 1 : 0);
  const press = useSharedValue(0);

  const holding = useRef(false);
  const startedAt = useRef(0);
  const tickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // External changes (partner completes, day reset) animate with a slow, liquid ease.
  useEffect(() => {
    if (holding.current) return;
    progress.value = withTiming(done ? 1 : 0, {
      duration: done ? 1100 : 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [done, progress]);

  useEffect(
    () => () => {
      if (tickTimer.current) clearTimeout(tickTimer.current);
      if (doneTimer.current) clearTimeout(doneTimer.current);
    },
    [],
  );

  const clearTimers = () => {
    if (tickTimer.current) clearTimeout(tickTimer.current);
    if (doneTimer.current) clearTimeout(doneTimer.current);
    tickTimer.current = null;
    doneTimer.current = null;
  };

  const scheduleTick = () => {
    const t = Math.min(1, (Date.now() - startedAt.current) / motion.holdMs);
    // cadence accelerates: 240ms -> 80ms
    tickTimer.current = setTimeout(() => {
      if (!holding.current) return;
      feel.tick(Math.min(1, (Date.now() - startedAt.current) / motion.holdMs));
      scheduleTick();
    }, 240 - 160 * t);
  };

  const startHold = () => {
    if (!interactive || done || holding.current) return;
    holding.current = true;
    startedAt.current = Date.now();
    press.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    progress.value = withTiming(1, { duration: motion.holdMs, easing: Easing.linear });
    feel.tick(0);
    scheduleTick();
    doneTimer.current = setTimeout(() => {
      holding.current = false;
      clearTimers();
      feel.success();
      onComplete?.();
    }, motion.holdMs);
  };

  const endHold = () => {
    press.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    if (!holding.current) return;
    holding.current = false;
    clearTimers();
    progress.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
  };

  const mainProps = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - progress.value) }));
  const glowProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - progress.value),
    strokeWidth: 7 + 4 * press.value,
    strokeOpacity: 0.16 + 0.14 * press.value,
  }));
  const discProps = useAnimatedProps(() => ({ fillOpacity: progress.value * 0.2 }));
  const checkProps = useAnimatedProps(() => ({
    strokeOpacity: interpolate(progress.value, [0.85, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.045 * press.value }] }));

  const track = interactive ? alpha(color, 0.3) : 'rgba(255,255,255,0.10)';

  return (
    <Pressable
      onPressIn={startHold}
      onPressOut={endHold}
      onPress={!interactive ? onPress : undefined}
      disabled={!interactive && !onPress}
      accessibilityRole="button"
      accessibilityLabel={interactive ? `${label}, press and hold to complete` : label}
    >
      <Animated.View style={[{ width: size, height: size }, scaleStyle]}>
        {/* rotated so the stroke starts at 12 o'clock */}
        <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
          <Svg width={size} height={size}>
            <AnimatedCircle cx={c} cy={c} r={r - 6} fill={color} animatedProps={discProps} />
            <Circle cx={c} cy={c} r={r} stroke={track} strokeWidth={1.5} fill="none" />
            <AnimatedCircle
              cx={c}
              cy={c}
              r={r}
              stroke={color}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circ} ${circ}`}
              animatedProps={glowProps}
            />
            <AnimatedCircle
              cx={c}
              cy={c}
              r={r}
              stroke={color}
              strokeWidth={2.6}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circ} ${circ}`}
              animatedProps={mainProps}
            />
          </Svg>
        </View>

        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          {indicator && (
            <Circle cx={c} cy={c} r={c - 1.5} stroke={colors.gold} strokeWidth={1} fill="none" strokeOpacity={0.9} />
          )}
          <AnimatedPath
            d={`M${size * 0.38} ${size * 0.51} L${size * 0.47} ${size * 0.6} L${size * 0.63} ${size * 0.4}`}
            stroke={color}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            animatedProps={checkProps}
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

export const HabitRing = memo(HabitRingBase);
