/**
 * TEST-ONLY backend. Two browser tabs of the same browser behave like two phones: the "server" is one
 * JSON blob in localStorage and tabs notify each other through the `storage` event. It exists so the full
 * pairing -> habits -> completions -> pulse flow can be exercised without Firebase.
 * It is only used when EXPO_PUBLIC_DEV_BACKEND=1 at build time (never in a shipped build).
 */
import { isoDate } from '../domain/streak';
import type { Backend, Completion, Habit, Member, PairState, Pulse, Session } from '../domain/models';

type PairRow = {
  code: string;
  members: string[];
  names: Record<string, string>;
  colors: Record<string, 0 | 1>;
  habits: Habit[];
  completions: Completion[];
  pulses: Pulse[];
};
type World = { codes: Record<string, string>; pairs: Record<string, PairRow>; users: Record<string, string> };

const KEY = 'duo.dev.world';
const rid = () => Math.random().toString(36).slice(2, 10);

export class DevBackend implements Backend {
  private uid: string;
  private listeners = new Set<() => void>();

  constructor() {
    let id = sessionStorage.getItem('duo.dev.uid');
    if (!id) sessionStorage.setItem('duo.dev.uid', (id = 'u_' + rid()));
    this.uid = id;
    window.addEventListener('storage', (e) => e.key === KEY && this.notify());
  }

  private read(): World {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { codes: {}, pairs: {}, users: {} };
  }
  private mutate<T>(fn: (w: World) => T): T {
    const w = this.read();
    const out = fn(w);
    localStorage.setItem(KEY, JSON.stringify(w));
    this.notify();
    return out;
  }
  private notify() {
    this.listeners.forEach((l) => l());
  }

  private session(): Session {
    const w = this.read();
    const pairId = w.users[this.uid];
    if (!pairId || !w.pairs[pairId]) return { kind: 'unpaired' };
    const p = w.pairs[pairId];
    const member = (u: string): Member => ({ uid: u, name: p.names[u] ?? 'Partner', colorIndex: p.colors[u] ?? 0 });
    const me = member(this.uid);
    const other = p.members.find((m) => m !== this.uid);
    if (!other) return { kind: 'waiting', code: p.code, me };
    const pair: PairState = {
      pairId,
      me,
      partner: member(other),
      habits: [...p.habits].sort((a, b) => a.order - b.order),
      completions: p.completions,
      pulses: [...p.pulses].sort((a, b) => b.sentAt - a.sentAt).slice(0, 10),
    };
    return { kind: 'paired', pair };
  }

  subscribe(cb: (s: Session) => void) {
    const emit = () => cb(this.session());
    this.listeners.add(emit);
    setTimeout(emit, 0);
    return () => this.listeners.delete(emit);
  }

  async createPair(name: string) {
    return this.mutate((w) => {
      let code = '';
      do code = String(100000 + Math.floor(Math.random() * 900000));
      while (w.codes[code]);
      const pairId = 'p_' + rid();
      w.codes[code] = pairId;
      w.pairs[pairId] = {
        code,
        members: [this.uid],
        names: { [this.uid]: name },
        colors: { [this.uid]: 0 },
        habits: [],
        completions: [],
        pulses: [],
      };
      w.users[this.uid] = pairId;
      return code;
    });
  }

  async joinPair(code: string, name: string) {
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) throw new Error('Enter the 6-digit code');
    this.mutate((w) => {
      const pairId = w.codes[clean];
      if (!pairId || !w.pairs[pairId]) throw new Error('Code not found. Check it and try again.');
      const p = w.pairs[pairId];
      if (!p.members.includes(this.uid)) {
        if (p.members.length >= 2) throw new Error('This code is already in use');
        p.members.push(this.uid);
        p.names[this.uid] = name;
        p.colors[this.uid] = 1;
      }
      w.users[this.uid] = pairId;
    });
  }

  private pairOf(w: World): PairRow {
    const p = w.pairs[w.users[this.uid]];
    if (!p) throw new Error('You are not paired yet');
    return p;
  }

  async addHabit(title: string, detail: string) {
    this.mutate((w) =>
      this.pairOf(w).habits.push({
        id: 'h_' + rid(),
        title: title.trim(),
        detail: detail.trim(),
        createdOn: isoDate(),
        order: Date.now(),
      }),
    );
  }
  async removeHabit(habitId: string) {
    this.mutate((w) => {
      const p = this.pairOf(w);
      p.habits = p.habits.filter((h) => h.id !== habitId);
    });
  }
  async setCompleted(habitId: string, date: string, done: boolean) {
    this.mutate((w) => {
      const p = this.pairOf(w);
      p.completions = p.completions.filter((c) => !(c.habitId === habitId && c.uid === this.uid && c.date === date));
      if (done) p.completions.push({ habitId, uid: this.uid, date, at: Date.now() });
    });
  }
  async sendPulse() {
    this.mutate((w) => {
      const p = this.pairOf(w);
      const to = p.members.find((m) => m !== this.uid);
      if (!to) throw new Error('No partner yet');
      p.pulses.push({ id: 'pl_' + rid(), fromUid: this.uid, toUid: to, sentAt: Date.now() });
    });
  }
  async leavePair() {
    this.mutate((w) => {
      const p = this.pairOf(w);
      p.members = p.members.filter((m) => m !== this.uid);
      delete w.users[this.uid];
    });
  }
}
