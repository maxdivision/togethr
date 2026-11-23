import * as Haptics from 'expo-haptics';

/** Never let a missing haptic engine (web, simulators, old devices) break the UI. */
function safe(fn: () => Promise<void> | void) {
  try {
    const r = fn();
    if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => {});
  } catch {
    /* no haptics available */
  }
}

/** Mechanical tick whose weight escalates with hold progress (0..1). */
export function tick(progress: number) {
  const style =
    progress < 0.34
      ? Haptics.ImpactFeedbackStyle.Light
      : progress < 0.7
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Rigid;
  safe(() => Haptics.impactAsync(style));
}

export function success() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function soft() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
}

/** Lub-dub, lub-dub. */
export function heartbeat() {
  const beat = (at: number, style: Haptics.ImpactFeedbackStyle) =>
    setTimeout(() => safe(() => Haptics.impactAsync(style)), at);
  beat(0, Haptics.ImpactFeedbackStyle.Medium);
  beat(150, Haptics.ImpactFeedbackStyle.Heavy);
  beat(620, Haptics.ImpactFeedbackStyle.Medium);
  beat(770, Haptics.ImpactFeedbackStyle.Heavy);
}

/** Heavy resonant pulse: used for "Synchronized". */
export function resonance() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  setTimeout(() => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)), 180);
}
