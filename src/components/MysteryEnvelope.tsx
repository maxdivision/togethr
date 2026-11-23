import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as feel from '../lib/haptics';
import { Overlay } from './Overlay';
import { Micro } from './primitives';
import type { Prompt } from '../data/content';
import { alpha, colors, fonts } from '../theme/tokens';

export type EnvelopeData = { id: number; day: number; prompt: Prompt };

const W = 288;
const H = 388;

function WaxSeal() {
  return (
    <View style={styles.seal}>
      <Svg width={92} height={92}>
        <Defs>
          <RadialGradient id="wax" cx={36} cy={32} r={60} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#F1D9A8" />
            <Stop offset="0.55" stopColor={colors.gold} />
            <Stop offset="1" stopColor="#A98648" />
          </RadialGradient>
        </Defs>
        <Circle cx={46} cy={46} r={42} fill="url(#wax)" />
        <Circle cx={46} cy={46} r={33} fill="none" stroke="rgba(14,14,16,0.35)" strokeWidth={1} />
        <Circle cx={46} cy={46} r={29} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={0.8} />
      </Svg>
      <Text style={styles.sealLetter}>D</Text>
    </View>
  );
}

/** A digital wax-sealed card that flips open in 3D to reveal an intimate prompt. */
export function MysteryEnvelope({ data, onClose }: { data: EnvelopeData | null; onClose: () => void }) {
  const last = useRef<EnvelopeData | null>(data);
  if (data) last.current = data;
  const d = data ?? last.current;

  const [flipped, setFlipped] = useState(false);
  const flip = useSharedValue(0);
  const lift = useSharedValue(0);

  // Every new envelope starts sealed. Keyed on the modal id, NOT the data object (a new object every render).
  const id = data?.id;
  useEffect(() => {
    if (id != null) {
      setFlipped(false);
      flip.value = 0;
      lift.value = 0;
    }
  }, [id, flip, lift]);

  const open = () => {
    if (flipped) return;
    setFlipped(true);
    feel.heartbeat();
    lift.value = withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) });
    flip.value = withTiming(1, { duration: 1500, easing: Easing.bezier(0.45, 0, 0.2, 1) });
    setTimeout(() => feel.success(), 1100);
  };

  const front = useAnimatedStyle(() => ({
    transform: [{ perspective: 1400 }, { rotateY: `${flip.value * 180}deg` }, { scale: 1 + 0.04 * Math.sin(Math.PI * lift.value) }],
  }));
  const back = useAnimatedStyle(() => ({
    transform: [{ perspective: 1400 }, { rotateY: `${180 + flip.value * 180}deg` }, { scale: 1 + 0.04 * Math.sin(Math.PI * lift.value) }],
  }));

  return (
    <Overlay visible={!!data} onClose={flipped ? onClose : () => {}}>
      <View style={{ alignItems: 'center' }} pointerEvents="box-none">
        <Pressable onPress={open} style={{ width: W, height: H }} accessibilityLabel="Open sealed card">
          {/* front: sealed */}
          <Animated.View style={[styles.face, { zIndex: flipped ? 0 : 2 }, front]} pointerEvents={flipped ? 'none' : 'auto'}>
            <View style={styles.inner}>
              <Micro color={colors.gold} style={{ letterSpacing: 3.4 }}>
                A sealed card
              </Micro>
              <Text style={styles.dayLine}>Day {d?.day}</Text>
              <WaxSeal />
              <Text style={styles.hint}>Touch to open</Text>
            </View>
          </Animated.View>

          {/* back: the prompt */}
          <Animated.View style={[styles.face, { zIndex: flipped ? 2 : 0 }, back]} pointerEvents={flipped ? 'auto' : 'none'}>
            <View style={styles.inner}>
              <Micro color={colors.gold} style={{ letterSpacing: 3.4 }}>
                {d?.prompt.kind}
              </Micro>
              <View style={styles.rule} />
              <Text style={styles.prompt}>{d?.prompt.text}</Text>
              <View style={styles.rule} />
              <Pressable onPress={onClose} hitSlop={12}>
                <Micro color={colors.textMuted} style={{ letterSpacing: 3 }}>
                  Keep for tonight
                </Micro>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: 28,
    backgroundColor: '#17171A',
    borderWidth: 1,
    borderColor: alpha(colors.gold, 0.32),
    backfaceVisibility: 'hidden',
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    margin: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: alpha(colors.gold, 0.14),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  dayLine: {
    marginTop: 12,
    fontFamily: fonts.displayItalic,
    fontSize: 22,
    color: colors.text,
    fontVariant: ['lining-nums'],
  },
  seal: { marginTop: 38, width: 92, height: 92, alignItems: 'center', justifyContent: 'center' },
  sealLetter: {
    position: 'absolute',
    fontFamily: fonts.display,
    fontSize: 38,
    lineHeight: 42,
    color: 'rgba(14,14,16,0.62)',
  },
  hint: {
    marginTop: 34,
    fontFamily: fonts.sansLight,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  rule: { width: 28, height: 1, backgroundColor: alpha(colors.gold, 0.4), marginVertical: 26 },
  prompt: {
    fontFamily: fonts.display,
    fontSize: 27,
    lineHeight: 34,
    textAlign: 'center',
    color: colors.text,
  },
});
