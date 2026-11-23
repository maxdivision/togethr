import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as feel from '../lib/haptics';
import { PROMPTS } from '../data/content';
import { MIN, SYNC_WINDOW_MIN, type Backend, type Completion, type Habit, type PairState } from '../domain/models';
import { computeStreak, isoDate } from '../domain/streak';
import type { Banner, Modal, ModalInput, PulseFx, Toast } from './types';

const SEEN_KEY = 'duo.seen.v1';
const PULSE_COOLDOWN_MS = 6000;

const ckey = (c: Completion) => `${c.date}|${c.habitId}|${c.uid}`;

/** Re-render when the device date changes (midnight) without any user action. */
function useToday(): string {
  const [today, setToday] = useState(isoDate());
  useEffect(() => {
    const id = setInterval(() => setToday(isoDate()), 30_000);
    return () => clearInterval(id);
  }, []);
  return today;
}

/** Habits where both finished the same day within the sync window. */
function syncedPairs(completions: Completion[]): number {
  const byKey = new Map<string, number[]>();
  for (const c of completions) {
    const k = `${c.date}|${c.habitId}`;
    byKey.set(k, [...(byKey.get(k) ?? []), c.at]);
  }
  let n = 0;
  byKey.forEach((ats) => {
    if (ats.length >= 2 && Math.abs(ats[0] - ats[1]) <= SYNC_WINDOW_MIN * MIN) n++;
  });
  return n;
}

/**
 * Everything the dashboard needs, derived from REAL data (no seed, no simulation), plus the moments
 * that real changes trigger: partner banner, "in sync", sealed card, incoming pulse.
 */
export function useDuo(pair: PairState, backend: Backend) {
  const today = useToday();
  const { me, partner, habits, completions } = pair;

  const info = useMemo(
    () => computeStreak(today, habits, [me.uid, partner.uid], completions),
    [today, habits, me.uid, partner.uid, completions],
  );

  const doneToday = useMemo(() => {
    const mine = new Set<string>();
    const theirs = new Set<string>();
    for (const c of completions) {
      if (c.date !== today) continue;
      (c.uid === me.uid ? mine : theirs).add(c.habitId);
    }
    return { mine, theirs };
  }, [completions, today, me.uid]);

  const harmony = completions.length * 10 + syncedPairs(completions) * 20;

  // ---- transient UI --------------------------------------------------------------------------------

  const [banner, setBanner] = useState<Banner | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [modals, setModals] = useState<Modal[]>([]);
  const [pulseFx, setPulseFx] = useState<PulseFx | null>(null);
  const [pulseCooling, setPulseCooling] = useState(false);
  const [warmth, setWarmth] = useState(0);

  const seq = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const flashToast = useCallback(
    (text: string) => {
      const id = ++seq.current;
      setToast({ id, text });
      later(() => setToast((t) => (t?.id === id ? null : t)), 2600);
    },
    [later],
  );

  const showBanner = useCallback(
    (text: string, action = 'Tap to send warmth') => {
      const id = ++seq.current;
      setBanner({ id, text, action });
      later(() => setBanner((b) => (b?.id === id ? null : b)), 5400);
    },
    [later],
  );

  const showModal = useCallback(
    (m: ModalInput, autoDismissMs?: number) => {
      const id = ++seq.current;
      setModals((q) => [...q, { ...m, id }]);
      if (autoDismissMs) later(() => setModals((q) => q.filter((x) => x.id !== id)), autoDismissMs);
    },
    [later],
  );

  const dismissModal = useCallback(() => setModals((q) => q.slice(1)), []);

  // ---- react to real changes ------------------------------------------------------------------------

  const seen = useRef<Set<string>>(new Set());
  const seenLoaded = useRef(false);
  const prev = useRef<PairState | null>(null);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then((raw) => {
        if (raw) (JSON.parse(raw) as string[]).forEach((k) => seen.current.add(k));
      })
      .catch(() => {})
      .finally(() => {
        seenLoaded.current = true;
      });
  }, []);

  const markSeen = useCallback((k: string) => {
    seen.current.add(k);
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seen.current].slice(-200))).catch(() => {});
  }, []);

  useEffect(() => {
    const before = prev.current;
    prev.current = pair;

    // Pulses from the partner: only ones that arrive while the app is open (or very recently).
    for (const p of pair.pulses) {
      const k = `pulse|${p.id}`;
      if (p.toUid !== me.uid || seen.current.has(k)) continue;
      markSeen(k);
      if (p.sentAt >= mountedAt.current - 60_000) {
        const id = ++seq.current;
        feel.heartbeat();
        setPulseFx({ id, tone: 'receive' });
        showBanner(`${partner.name} sent you a pulse`);
      }
    }

    if (!before) return; // first snapshot: nothing is "new"

    const beforeKeys = new Set(before.completions.map(ckey));
    const added = pair.completions.filter((c) => !beforeKeys.has(ckey(c)) && c.date === today);

    for (const c of added) {
      const habit = pair.habits.find((h) => h.id === c.habitId);
      if (!habit) continue;

      if (c.uid === partner.uid) {
        feel.soft();
        showBanner(`${partner.name} completed “${habit.title}”`);
      }

      const mine = pair.completions.find((x) => x.habitId === c.habitId && x.uid === me.uid && x.date === today);
      const theirs = pair.completions.find((x) => x.habitId === c.habitId && x.uid === partner.uid && x.date === today);
      if (mine && theirs) {
        const minutes = Math.max(1, Math.round(Math.abs(mine.at - theirs.at) / MIN));
        const k = `sync|${today}|${habit.id}`;
        if (minutes <= SYNC_WINDOW_MIN && !seen.current.has(k)) {
          markSeen(k);
          later(() => {
            feel.resonance();
            showModal({ kind: 'sync', minutes, habit: habit.title }, 6500);
          }, c.uid === me.uid ? 700 : 450);
        }
      }
    }

    // The whole day just closed: streak grew. Every third day a sealed card arrives.
    const beforeInfo = computeStreak(today, before.habits, [me.uid, partner.uid], before.completions);
    if (!beforeInfo.todayComplete && info.todayComplete) {
      later(() => flashToast(`Day secured · ${info.streak} ${info.streak === 1 ? 'day' : 'days'} in harmony`), 1100);
      const k = `env|${today}`;
      if (info.streak % 3 === 0 && !seen.current.has(k)) {
        markSeen(k);
        const prompt = PROMPTS[(info.streak / 3 - 1) % PROMPTS.length];
        later(() => showModal({ kind: 'envelope', day: info.streak, prompt }), 1700);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair]);

  // ---- actions -------------------------------------------------------------------------------------

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch (e) {
        flashToast(e instanceof Error ? e.message : 'Something went wrong');
      }
    },
    [flashToast],
  );

  const complete = useCallback(
    (habit: Habit) => {
      flashToast(`${habit.title} · complete`);
      return run(() => backend.setCompleted(habit.id, isoDate(), true));
    },
    [backend, flashToast, run],
  );

  const sendPulse = useCallback(() => {
    if (pulseCooling) return;
    feel.heartbeat();
    setPulseFx({ id: ++seq.current, tone: 'send' });
    setPulseCooling(true);
    later(() => setPulseCooling(false), PULSE_COOLDOWN_MS);
    return run(() => backend.sendPulse());
  }, [backend, later, pulseCooling, run]);

  const sendWarmth = useCallback(() => {
    feel.soft();
    setWarmth((w) => w + 1);
    setBanner(null);
    flashToast('Warmth sent');
  }, [flashToast]);

  const addHabit = useCallback((title: string, detail: string) => run(() => backend.addHabit(title, detail)), [backend, run]);
  const removeHabit = useCallback((id: string) => run(() => backend.removeHabit(id)), [backend, run]);
  const leave = useCallback(() => run(() => backend.leavePair()), [backend, run]);

  const total = habits.length;
  const closed = habits.filter((h) => doneToday.mine.has(h.id)).length + habits.filter((h) => doneToday.theirs.has(h.id)).length;

  return {
    info,
    harmony,
    doneToday,
    fraction: total ? closed / (total * 2) : 0,
    myCount: habits.filter((h) => doneToday.mine.has(h.id)).length,
    partnerCount: habits.filter((h) => doneToday.theirs.has(h.id)).length,
    partnerOpen: habits.some((h) => !doneToday.theirs.has(h.id)),
    ui: { banner, toast, modals, pulseFx, pulseCooling, warmth },
    actions: { complete, sendPulse, sendWarmth, addHabit, removeHabit, leave, dismissModal },
  };
}
