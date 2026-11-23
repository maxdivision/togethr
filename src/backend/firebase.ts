import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, signInAnonymously, type Auth } from 'firebase/auth';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { firebaseConfig } from './config';
import { addDays, isoDate } from '../domain/streak';
import type { Backend, Completion, Habit, Member, PairState, Pulse, Session } from '../domain/models';

/** Firestore layout (see firestore.rules):
 *  users/{uid}                              { pairId }
 *  codes/{code}                             { pairId, createdBy, createdAt }
 *  pairs/{pairId}                           { code, members[], names{}, colors{}, createdAt }
 *  pairs/{pairId}/habits/{id}               { title, detail, createdOn, order }
 *  pairs/{pairId}/completions/{date_habit_uid}  { habitId, uid, date, at }
 *  pairs/{pairId}/pulses/{id}               { fromUid, toUid, sentAt }
 */

const HISTORY_DAYS = 400;

function makeAuth(): Auth {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  if (Platform.OS === 'web') return getAuth(app);
  // The RN persistence helper is only in the react-native build of firebase/auth, so it is not in the
  // default type declarations.
  const getRNPersistence = (FirebaseAuth as any).getReactNativePersistence;
  try {
    return initializeAuth(app, { persistence: getRNPersistence(AsyncStorage) });
  } catch {
    return getAuth(app); // already initialised (fast refresh)
  }
}

export class FirebaseBackend implements Backend {
  private auth: Auth;
  private db: Firestore;

  constructor() {
    this.auth = makeAuth();
    this.db = getFirestore(getApps().length ? getApp() : initializeApp(firebaseConfig));
  }

  private async uid(): Promise<string> {
    if (this.auth.currentUser) return this.auth.currentUser.uid;
    return (await signInAnonymously(this.auth)).user.uid;
  }

  private userRef = (uid: string) => doc(this.db, 'users', uid);
  private pairRef = (pairId: string) => doc(this.db, 'pairs', pairId);

  private async pairIdOf(uid: string): Promise<string> {
    const snap = await getDoc(this.userRef(uid));
    const id = snap.exists() ? (snap.data().pairId as string | undefined) : undefined;
    if (!id) throw new Error('You are not paired yet');
    return id;
  }

  // ---- state ----------------------------------------------------------------------------------

  subscribe(cb: (s: Session) => void): () => void {
    let cancelled = false;
    let userUnsub: (() => void) | null = null;
    let pairUnsubs: (() => void)[] = [];
    const clearPair = () => {
      pairUnsubs.forEach((f) => f());
      pairUnsubs = [];
    };
    const fail = (e: unknown) => cb({ kind: 'error', message: e instanceof Error ? e.message : String(e) });

    (async () => {
      try {
        const uid = await this.uid();
        if (cancelled) return;
        userUnsub = onSnapshot(
          this.userRef(uid),
          (snap) => {
            const pairId = snap.exists() ? (snap.data().pairId as string | undefined) : undefined;
            clearPair();
            if (!pairId) return cb({ kind: 'unpaired' });
            pairUnsubs = this.listenPair(uid, pairId, cb, fail);
          },
          fail,
        );
      } catch (e) {
        fail(e);
      }
    })();

    return () => {
      cancelled = true;
      clearPair();
      userUnsub?.();
    };
  }

  private listenPair(uid: string, pairId: string, cb: (s: Session) => void, fail: (e: unknown) => void) {
    const pair = this.pairRef(pairId);
    let pairDoc: DocumentData | null | undefined;
    let habits: QueryDocumentSnapshot[] | undefined;
    let completions: QueryDocumentSnapshot[] | undefined;
    let pulses: QueryDocumentSnapshot[] | undefined;

    const emit = () => {
      if (pairDoc === undefined || !habits || !completions || !pulses) return;
      cb(pairDoc === null ? { kind: 'loading' } : build(uid, pairId, pairDoc, habits, completions, pulses));
    };

    const cutoff = addDays(isoDate(), -HISTORY_DAYS);
    return [
      onSnapshot(pair, (s) => ((pairDoc = s.exists() ? s.data() : null), emit()), fail),
      onSnapshot(collection(pair, 'habits'), (s) => ((habits = s.docs), emit()), fail),
      onSnapshot(
        query(collection(pair, 'completions'), where('date', '>=', cutoff)),
        (s) => ((completions = s.docs), emit()),
        fail,
      ),
      onSnapshot(
        query(collection(pair, 'pulses'), orderBy('sentAt', 'desc'), limit(10)),
        (s) => ((pulses = s.docs), emit()),
        fail,
      ),
    ];
  }

  // ---- pairing --------------------------------------------------------------------------------

  async createPair(name: string): Promise<string> {
    const uid = await this.uid();
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = String(100000 + Math.floor(Math.random() * 900000));
      const pairRef = doc(collection(this.db, 'pairs'));
      const codeRef = doc(this.db, 'codes', code);
      const created = await runTransaction(this.db, async (tx) => {
        if ((await tx.get(codeRef)).exists()) return false;
        tx.set(codeRef, { pairId: pairRef.id, createdBy: uid, createdAt: Date.now() });
        tx.set(pairRef, {
          code,
          members: [uid],
          names: { [uid]: name },
          colors: { [uid]: 0 },
          createdAt: Date.now(),
        });
        tx.set(this.userRef(uid), { pairId: pairRef.id });
        return true;
      });
      if (created) return code;
    }
    throw new Error('Could not create a code, please try again');
  }

  async joinPair(code: string, name: string): Promise<void> {
    const uid = await this.uid();
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) throw new Error('Enter the 6-digit code');

    const codeSnap = await getDoc(doc(this.db, 'codes', clean));
    const pairId = codeSnap.exists() ? (codeSnap.data().pairId as string | undefined) : undefined;
    if (!pairId) throw new Error('Code not found. Check it and try again.');
    const pair = this.pairRef(pairId);

    await runTransaction(this.db, async (tx) => {
      const members = ((await tx.get(pair)).data()?.members ?? []) as string[];
      if (!members.includes(uid)) {
        if (members.length >= 2) throw new Error('This code is already in use');
        tx.update(pair, {
          members: arrayUnion(uid),
          [`names.${uid}`]: name,
          [`colors.${uid}`]: 1,
        });
      }
      tx.set(this.userRef(uid), { pairId });
    });
  }

  async leavePair(): Promise<void> {
    const uid = await this.uid();
    const pairId = await this.pairIdOf(uid);
    const batch = writeBatch(this.db);
    batch.update(this.pairRef(pairId), { members: arrayRemove(uid) });
    batch.delete(this.userRef(uid));
    await batch.commit();
  }

  // ---- habits, completions, pulses -----------------------------------------------------------------

  async addHabit(title: string, detail: string): Promise<void> {
    const uid = await this.uid();
    const pairId = await this.pairIdOf(uid);
    await addDoc(collection(this.pairRef(pairId), 'habits'), {
      title: title.trim(),
      detail: detail.trim(),
      createdOn: isoDate(),
      order: Date.now(),
    });
  }

  async removeHabit(habitId: string): Promise<void> {
    const uid = await this.uid();
    const pairId = await this.pairIdOf(uid);
    await deleteDoc(doc(this.pairRef(pairId), 'habits', habitId));
  }

  async setCompleted(habitId: string, date: string, done: boolean): Promise<void> {
    const uid = await this.uid();
    const pairId = await this.pairIdOf(uid);
    const ref = doc(this.pairRef(pairId), 'completions', `${date}_${habitId}_${uid}`);
    if (done) await setDoc(ref, { habitId, uid, date, at: Date.now() });
    else await deleteDoc(ref);
  }

  async sendPulse(): Promise<void> {
    const uid = await this.uid();
    const pairId = await this.pairIdOf(uid);
    const pair = this.pairRef(pairId);
    const members = ((await getDoc(pair)).data()?.members ?? []) as string[];
    const toUid = members.find((m) => m !== uid);
    if (!toUid) throw new Error('No partner yet');
    await addDoc(collection(pair, 'pulses'), { fromUid: uid, toUid, sentAt: Date.now() });
  }
}

function build(
  uid: string,
  pairId: string,
  pair: DocumentData,
  habitDocs: QueryDocumentSnapshot[],
  completionDocs: QueryDocumentSnapshot[],
  pulseDocs: QueryDocumentSnapshot[],
): Session {
  const members: string[] = pair.members ?? [];
  const names: Record<string, string> = pair.names ?? {};
  const colors: Record<string, number> = pair.colors ?? {};
  const member = (u: string): Member => ({
    uid: u,
    name: names[u] ?? 'Partner',
    colorIndex: colors[u] === 1 ? 1 : 0,
  });

  const me = member(uid);
  const partnerUid = members.find((m) => m !== uid);
  if (!partnerUid) return { kind: 'waiting', code: pair.code ?? '', me };

  const habits: Habit[] = habitDocs
    .map((d) => {
      const x = d.data();
      return {
        id: d.id,
        title: String(x.title ?? ''),
        detail: String(x.detail ?? ''),
        createdOn: String(x.createdOn ?? '1970-01-01'),
        order: Number(x.order ?? 0),
      };
    })
    .sort((a, b) => a.order - b.order);

  const completions: Completion[] = completionDocs.map((d) => {
    const x = d.data();
    return { habitId: String(x.habitId), uid: String(x.uid), date: String(x.date), at: Number(x.at ?? 0) };
  });

  const pulses: Pulse[] = pulseDocs.map((d) => {
    const x = d.data();
    return { id: d.id, fromUid: String(x.fromUid), toUid: String(x.toUid), sentAt: Number(x.sentAt ?? 0) };
  });

  const state: PairState = { pairId, me, partner: member(partnerUid), habits, completions, pulses };
  return { kind: 'paired', pair: state };
}
