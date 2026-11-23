import assert from 'node:assert/strict';
import { addDays, computeStreak, isoDate } from '../src/domain/streak';
import type { Completion, Habit } from '../src/domain/models';

const today = '2026-11-18';
const A = 'a';
const B = 'b';
const habit = (id: string, createdOn = '2026-11-01'): Habit => ({ id, title: id, detail: '', createdOn, order: 0 });
const both = (date: string, habitId = 'h1'): Completion[] => [
  { habitId, uid: A, date, at: 0 },
  { habitId, uid: B, date, at: 0 },
];
const run = (habits: Habit[], c: Completion[]) => computeStreak(today, habits, [A, B], c);

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log('ok  ', name);
};

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('isoDate is zero padded and local', () => {
  assert.equal(isoDate(new Date(2026, 0, 5)), '2026-01-05');
});

test('no completions: streak 0, at rest because days could have been missed', () => {
  const r = run([habit('h1')], []);
  assert.deepEqual(r, { streak: 0, todayComplete: false, atRest: true });
});

test('brand new pair (habit created today): streak 0 but NOT at rest', () => {
  const r = run([habit('h1', today)], []);
  assert.equal(r.streak, 0);
  assert.equal(r.atRest, false);
});

test('counts consecutive days up to yesterday when today is open', () => {
  const c = [1, 2, 3].flatMap((n) => both(addDays(today, -n)));
  assert.deepEqual(run([habit('h1')], c), { streak: 3, todayComplete: false, atRest: false });
});

test('today counts once both finished', () => {
  const c = [0, 1, 2].flatMap((n) => both(addDays(today, -n)));
  assert.deepEqual(run([habit('h1')], c), { streak: 3, todayComplete: true, atRest: false });
});

test('a gap breaks the streak', () => {
  const c = [...both(addDays(today, -1)), ...both(addDays(today, -3))];
  assert.equal(run([habit('h1')], c).streak, 1);
});

test('one person missing breaks the day and puts the streak at rest', () => {
  const c = [...both(addDays(today, -2)), { habitId: 'h1', uid: A, date: addDays(today, -1), at: 0 }];
  const r = run([habit('h1')], c);
  assert.equal(r.streak, 0);
  assert.equal(r.atRest, true);
});

test('missed yesterday but done today is a streak of 1, not at rest', () => {
  const r = run([habit('h1')], both(today));
  assert.deepEqual(r, { streak: 1, todayComplete: true, atRest: false });
});

test('a habit added today does not break existing history', () => {
  const c = [1, 2, 3, 4].flatMap((n) => both(addDays(today, -n)));
  assert.equal(run([habit('h1'), habit('h2', today)], c).streak, 4);
});

test('all habits must be done by both', () => {
  const c = [...both(addDays(today, -1)), ...both(addDays(today, -1), 'h2'), ...both(addDays(today, -2))];
  assert.equal(run([habit('h1'), habit('h2')], c).streak, 1);
});

console.log(`\n${passed} passed`);
