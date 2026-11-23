import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import type { Banner as BannerData, Toast as ToastData } from '../state/types';
import { alpha, colors, fonts } from '../theme/tokens';

const SPRING = { damping: 26, stiffness: 70, mass: 1.2 };

/** Frosted glass pill that floats down from the top: "Ana completed 'Morning Run' · Tap to send warmth". */
export function PartnerBanner({
  banner,
  top,
  color,
  onPress,
}: {
  banner: BannerData | null;
  top: number;
  color: string;
  onPress: () => void;
}) {
  const [shown, setShown] = useState(banner);
  const t = useSharedValue(0);

  useEffect(() => {
    if (banner) {
      setShown(banner);
      t.value = withSpring(1, SPRING);
      return;
    }
    t.value = withTiming(0, { duration: 600, easing: Easing.in(Easing.cubic) });
    const id = setTimeout(() => setShown(null), 650);
    return () => clearTimeout(id);
  }, [banner, t]);

  const a = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * -90 }],
  }));

  if (!shown) return null;
  return (
    <Animated.View style={[styles.bannerWrap, { top }, a]} pointerEvents="box-none">
      <Pressable onPress={onPress} style={styles.banner} accessibilityLabel={`${shown.text}. ${shown.action}`}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(30,30,34,0.55)' }]} />
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.text} numberOfLines={1}>
            {shown.text}
          </Text>
          <Text style={styles.action}>{shown.action}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Understated confirmation toast. */
export function Toast({ toast, bottom }: { toast: ToastData | null; bottom: number }) {
  const [shown, setShown] = useState(toast);
  const t = useSharedValue(0);
  const first = useRef(true);

  useEffect(() => {
    if (toast) {
      setShown(toast);
      t.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
      return;
    }
    if (first.current) {
      first.current = false;
      return;
    }
    t.value = withTiming(0, { duration: 600, easing: Easing.in(Easing.cubic) });
    const id = setTimeout(() => setShown(null), 650);
    return () => clearTimeout(id);
  }, [toast, t]);

  const a = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 14 }],
  }));

  if (!shown) return null;
  return (
    <Animated.View style={[styles.toastWrap, { bottom }, a]} pointerEvents="none">
      <View style={styles.toast}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(30,30,34,0.5)' }]} />
        <Text style={styles.toastStar}>✦</Text>
        <Text style={styles.toastText}>{shown.text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerWrap: { position: 'absolute', left: 16, right: 16, zIndex: 40 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontFamily: fonts.sansMedium, fontSize: 13, letterSpacing: 0.4, color: colors.text },
  action: {
    marginTop: 3,
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: alpha(colors.gold, 0.9),
  },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 30 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: alpha(colors.gold, 0.22),
    overflow: 'hidden',
  },
  toastStar: { color: colors.gold, fontSize: 11 },
  toastText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.text,
  },
});
