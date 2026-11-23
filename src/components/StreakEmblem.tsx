import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Polygon, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  SharedValue,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Micro } from './primitives';
import { colors, fonts } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 200;
const ART = 172; // rendered size: the 200-unit artwork is scaled down to keep everything above the fold
const C = SIZE / 2;
const ARC_R = 76;
const ARC_LEN = 2 * Math.PI * ARC_R;
const TICKS = Array.from({ length: 72 }, (_, i) => i);

/** One full emblem in a single tone. Gold and silver are stacked and cross-faded. */
function EmblemArt({ tone, gid, frac }: { tone: string; gid: string; frac: SharedValue<number> }) {
  const pulse = useSharedValue(0);
  const rot = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }), -1, true);
    rot.value = withRepeat(withTiming(360, { duration: 140000, easing: Easing.linear }), -1, false);
  }, [pulse, rot]);

  const glow = useAnimatedStyle(() => ({
    opacity: 0.55 + 0.45 * pulse.value,
    transform: [{ scale: 0.94 + 0.08 * pulse.value }],
  }));
  const dial = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const arc = useAnimatedProps(() => ({ strokeDashoffset: ARC_LEN * (1 - frac.value) }));

  const starY = C - 52;
  const star = `${C},${starY - 7} ${C + 1.7},${starY - 1.7} ${C + 7},${starY} ${C + 1.7},${starY + 1.7} ${C},${starY + 7} ${C - 1.7},${starY + 1.7} ${C - 7},${starY} ${C - 1.7},${starY - 1.7}`;

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, glow]}>
        <Svg width={SIZE} height={SIZE}>
          <Defs>
            <RadialGradient id={gid} cx={C} cy={C} r={C} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={tone} stopOpacity={0.3} />
              <Stop offset="0.55" stopColor={tone} stopOpacity={0.09} />
              <Stop offset="1" stopColor={tone} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={C} cy={C} r={C} fill={`url(#${gid})`} />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, dial]}>
        <Svg width={SIZE} height={SIZE}>
          {TICKS.map((i) => {
            const a = (i * 5 * Math.PI) / 180;
            const long = i % 6 === 0;
            const r1 = long ? 86 : 90;
            const r2 = 95;
            return (
              <Line
                key={i}
                x1={C + r1 * Math.sin(a)}
                y1={C - r1 * Math.cos(a)}
                x2={C + r2 * Math.sin(a)}
                y2={C - r2 * Math.cos(a)}
                stroke={tone}
                strokeWidth={1}
                strokeOpacity={long ? 0.65 : 0.26}
              />
            );
          })}
        </Svg>
      </Animated.View>

      {/* today's progress arc, rotated so it starts at 12 o'clock */}
      <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={C} cy={C} r={ARC_R} stroke={tone} strokeOpacity={0.14} strokeWidth={1} fill="none" />
          <AnimatedCircle
            cx={C}
            cy={C}
            r={ARC_R}
            stroke={tone}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${ARC_LEN} ${ARC_LEN}`}
            animatedProps={arc}
          />
        </Svg>
      </View>

      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Polygon points={star} fill={tone} fillOpacity={0.9} />
      </Svg>
    </>
  );
}

type Props = {
  streak: number;
  dimmed: boolean;
  /** 0..1: how much of today's eight rings are closed. */
  fraction: number;
};

export function StreakEmblem({ streak, dimmed, fraction }: Props) {
  const silver = useSharedValue(dimmed ? 1 : 0);
  const frac = useSharedValue(fraction);
  const bump = useSharedValue(0);

  useEffect(() => {
    silver.value = withTiming(dimmed ? 1 : 0, { duration: 1600, easing: Easing.inOut(Easing.cubic) });
  }, [dimmed, silver]);

  useEffect(() => {
    frac.value = withTiming(fraction, { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [fraction, frac]);

  useEffect(() => {
    bump.value = 0;
    bump.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) });
  }, [streak, bump]);

  const goldLayer = useAnimatedStyle(() => ({ opacity: 1 - silver.value }));
  const silverLayer = useAnimatedStyle(() => ({ opacity: silver.value }));
  const numberStyle = useAnimatedStyle(() => ({
    color: interpolateColor(silver.value, [0, 1], [colors.gold, colors.silver]),
    transform: [{ scale: 1 + 0.07 * Math.sin(Math.PI * bump.value) }],
  }));

  const untilCard = 3 - (streak % 3);
  const caption = dimmed
    ? 'A day was missed. Close all eight rings today to restore the gold.'
    : `A sealed card arrives in ${untilCard} ${untilCard === 1 ? 'day' : 'days'}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.art}>
        <View style={styles.scaler}>
          <Animated.View style={[StyleSheet.absoluteFill, goldLayer]}>
            <EmblemArt tone={colors.gold} gid="emblemGold" frac={frac} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, silverLayer]}>
            <EmblemArt tone={colors.silver} gid="emblemSilver" frac={frac} />
          </Animated.View>

          <View style={styles.center} pointerEvents="none">
            <Animated.Text style={[styles.number, numberStyle]}>{streak}</Animated.Text>
            <Micro color={dimmed ? colors.silver : colors.gold} style={styles.days}>
              Days
            </Micro>
          </View>
        </View>
      </View>

      <Micro color={dimmed ? colors.silver : colors.textMuted} style={styles.label}>
        {dimmed ? 'Streak at rest' : 'In harmony'}
      </Micro>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  art: { width: ART, height: ART },
  scaler: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    left: (ART - SIZE) / 2,
    top: (ART - SIZE) / 2,
    transform: [{ scale: ART / SIZE }],
  },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  number: {
    fontFamily: fonts.displayLight,
    fontSize: 68,
    lineHeight: 72,
    includeFontPadding: false,
    fontVariant: ['lining-nums'],
  },
  days: { marginTop: -2, letterSpacing: 4 },
  label: { marginTop: 8, letterSpacing: 3.4 },
  caption: {
    marginTop: 6,
    maxWidth: 270,
    textAlign: 'center',
    fontFamily: fonts.displayItalic,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
