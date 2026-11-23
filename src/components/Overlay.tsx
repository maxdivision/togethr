import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Full-screen frosted layer with a slow in / slower out. Rendered in-tree (not RN <Modal>) so the same
 * motion works on iOS, Android and web.
 */
export function Overlay({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(visible);
  const t = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      t.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
      return;
    }
    t.value = withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) });
    const id = setTimeout(() => setMounted(false), 540);
    return () => clearTimeout(id);
  }, [visible, t]);

  const backdrop = useAnimatedStyle(() => ({ opacity: t.value }));
  const content = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 22 }, { scale: 0.95 + 0.05 * t.value }],
  }));

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, backdrop]}>
        <BlurView intensity={26} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,8,10,0.66)' }]} />
      </Animated.View>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
      <Animated.View style={[styles.center, content]} pointerEvents="box-none">
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 50 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
