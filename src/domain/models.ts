export const MAX_HABITS = 4; // strictly four a day, for visual harmony
export const SYNC_WINDOW_MIN = 15;
export const MIN = 60_000;

export type Member = { uid: string; name: string; colorIndex: 0 | 1 };

export type Habit = {
  id: string;
  title: string;
  /** Optional second line, e.g. "06:30 · 5 km". */
  detail: string;
  /** ISO date: the habit only counts for the streak from this day on. */
  createdOn: string;
  order: number;
};

/** `uid` completed `habitId` on `date` (ISO yyyy-MM-dd, device-local) at `at` (epoch ms). */
export type Completion = { habitId: string; uid: string; date: string; at: number };

export type Pulse = { id: string; fromUid: string; toUid: string; sentAt: number };

export type PairState = {
  pairId: string;
  me: Member;
  partner: Member;
  habits: Habit[];
  completions: Completion[];
  pulses: Pulse[];
};

export type Session =
  | { kind: 'loading' }
  | { kind: 'unpaired' }
  | { kind: 'waiting'; code: string; me: Member }
  | { kind: 'paired'; pair: PairState }
  | { kind: 'error'; message: string };

export interface Backend {
  subscribe(cb: (s: Session) => void): () => void;
  /** Creates a pair and returns the 6-digit invite code. */
  createPair(name: string): Promise<string>;
  /** Throws an Error with a human-readable message when the code is wrong or already used. */
  joinPair(code: string, name: string): Promise<void>;
  addHabit(title: string, detail: string): Promise<void>;
  removeHabit(habitId: string): Promise<void>;
  setCompleted(habitId: string, date: string, done: boolean): Promise<void>;
  sendPulse(): Promise<void>;
  leavePair(): Promise<void>;
}
