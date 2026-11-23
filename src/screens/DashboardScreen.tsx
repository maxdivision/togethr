import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { PulseRipple, WarmGlow } from '../components/Atmosphere';
import { PartnerBanner, Toast } from '../components/Banner';
import { HabitRow } from '../components/HabitRow';
import { MysteryEnvelope } from '../components/MysteryEnvelope';
import { GlassCard, Micro, Backdrop, Reveal } from '../components/primitives';
import { StreakEmblem } from '../components/StreakEmblem';
import { SyncModal } from '../components/SyncModal';
import { SUGGESTED_HABITS } from '../data/content';
import { MAX_HABITS, type Backend, type PairState } from '../domain/models';
import { useDuo } from '../state/useDuo';
import { alpha, colors, fonts } from '../theme/tokens';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const withCommas = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function HeartbeatGlyph({ color }: { color: string }) {
  return (
    <Svg width={22} height={14} viewBox="0 0 22 14">
      <Path
        d="M1 7h4l2-5 3 10 3-8 2 3h6"
        stroke={color}
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function DashboardScreen({ pair, backend }: { pair: PairState; backend: Backend }) {
  const insets = useSafeAreaInsets();
  const d = useDuo(pair, backend);
  const { habits, me, partner } = pair;
  const ME = { name: me.name, color: me.colorIndex === 0 ? colors.terracotta : colors.sage };
  const PARTNER = { name: partner.name, color: partner.colorIndex === 0 ? colors.terracotta : colors.sage };
  const state = { ...d.ui, harmony: d.harmony, streak: d.info.streak, dimmed: d.info.atRest };
  const actions = d.actions;
  const [size, setSize] = useState({ w: 390, h: 844 });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');

  const myDone = d.myCount;
  const partnerDone = d.partnerCount;
  const fraction = d.fraction;
  const partnerOpen = d.partnerOpen && habits.length > 0;
  const canAdd = habits.length < MAX_HABITS;
  const submit = () => {
    if (!title.trim()) return;
    actions.addHabit(title, detail);
    setTitle('');
    setDetail('');
  };

  const modal = state.modals[0];
  const today = new Date();
  const dateLabel = `${DAYS[today.getDay()]} · ${today.getDate()} ${MONTHS[today.getMonth()]}`;

  return (
    <View
      style={styles.root}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <Backdrop />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + 140,
          paddingHorizontal: 20,
        }}
      >
        {/* header */}
        <Reveal>
          <View style={styles.header}>
            <View>
              <Text style={styles.wordmark}>DUO</Text>
              <Micro style={{ marginTop: 6 }}>{dateLabel}</Micro>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Micro>Harmony</Micro>
              <Text style={styles.harmony}>{withCommas(state.harmony)}</Text>
            </View>
          </View>
        </Reveal>

        {/* streak emblem */}
        <Reveal delay={120} style={{ marginTop: 10 }}>
          <StreakEmblem streak={state.streak} dimmed={state.dimmed} fraction={fraction} />
        </Reveal>

        {/* dual dashboard */}
        <Reveal delay={260} style={{ marginTop: 20 }}>
          <GlassCard>
            <View style={styles.cols}>
              <View style={styles.colHead}>
                <View style={[styles.dot, { backgroundColor: ME.color }]} />
                <Micro color={colors.text}>{ME.name}</Micro>
                <Micro color={ME.color} style={styles.count}>
                  {myDone}/{habits.length}
                </Micro>
              </View>
              <Micro style={{ opacity: 0.7 }}>Today</Micro>
              <View style={[styles.colHead, { justifyContent: 'flex-end' }]}>
                <Micro color={PARTNER.color} style={styles.count}>
                  {partnerDone}/{habits.length}
                </Micro>
                <Micro color={colors.text}>{PARTNER.name}</Micro>
                <View style={[styles.dot, { backgroundColor: PARTNER.color }]} />
              </View>
            </View>
            <View style={styles.headRule} />

            {habits.map((h, i) => (
              <HabitRow
                key={h.id}
                index={i}
                habit={h}
                mine={d.doneToday.mine.has(h.id)}
                partner={d.doneToday.theirs.has(h.id)}
                myColor={ME.color}
                partnerColor={PARTNER.color}
                partnerName={PARTNER.name}
                last={i === habits.length - 1}
                editing={editing}
                onComplete={() => actions.complete(h)}
                onRemove={() => actions.removeHabit(h.id)}
              />
            ))}
            {habits.length === 0 && (
              <Text style={styles.empty}>Add your first shared habit below. Both of you will see it.</Text>
            )}
          </GlassCard>
        </Reveal>

        <Reveal delay={330} style={{ marginTop: 16 }}>
          <GlassCard style={{ padding: 18 }}>
            <View style={styles.formHead}>
              <Micro>{canAdd ? `Habits ${habits.length}/${MAX_HABITS}` : 'Four habits, fully set'}</Micro>
              {habits.length > 0 && (
                <Pressable onPress={() => setEditing((e) => !e)} hitSlop={10} accessibilityRole="button">
                  <Micro color={colors.gold}>{editing ? 'Done' : 'Edit'}</Micro>
                </Pressable>
              )}
            </View>
            {canAdd && (
              <>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="New habit, e.g. Morning Run"
                  placeholderTextColor={colors.textFaint}
                  maxLength={24}
                  style={styles.input}
                  accessibilityLabel="Habit name"
                />
                <TextInput
                  value={detail}
                  onChangeText={setDetail}
                  placeholder="Detail (optional), e.g. 06:30"
                  placeholderTextColor={colors.textFaint}
                  maxLength={24}
                  style={styles.input}
                  accessibilityLabel="Habit detail"
                />
                {habits.length === 0 && (
                  <View style={styles.chips}>
                    {SUGGESTED_HABITS.map((n) => (
                      <Pressable key={n} onPress={() => setTitle(n)} style={styles.chip}>
                        <Text style={styles.chipText}>{n}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                <Pressable onPress={submit} disabled={!title.trim()} style={[styles.add, !title.trim() && { opacity: 0.4 }]} accessibilityRole="button">
                  <Text style={styles.addText}>Add habit</Text>
                </Pressable>
              </>
            )}
            <Pressable onPress={actions.leave} hitSlop={8} style={{ marginTop: 18, alignSelf: 'center' }} accessibilityRole="button">
              <Micro>Disconnect from {PARTNER.name}</Micro>
            </Pressable>
          </GlassCard>
        </Reveal>

        {/* pulse */}
        <Reveal delay={400} style={{ marginTop: 16 }}>
          {partnerOpen ? (
            <Pressable
              onPress={() => actions.sendPulse()}
              disabled={state.pulseCooling}
              style={({ pressed }) => [
                styles.pulse,
                pressed && { backgroundColor: alpha(colors.terracotta, 0.12) },
                state.pulseCooling && { opacity: 0.5 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Send a pulse to ${PARTNER.name}`}
            >
              <HeartbeatGlyph color={colors.terracotta} />
              <Text style={styles.pulseText}>
                {state.pulseCooling ? 'Pulse sent' : 'Send a pulse'}
              </Text>
            </Pressable>
          ) : (
            <Micro color={colors.gold} style={{ textAlign: 'center' }}>
              Every ring is closed · the day is secured
            </Micro>
          )}
        </Reveal>
      </ScrollView>

      <PulseRipple fx={state.pulseFx} width={size.w} height={size.h} />
      <WarmGlow pulse={state.warmth} />
      <PartnerBanner banner={state.banner} top={insets.top + 8} color={PARTNER.color} onPress={actions.sendWarmth} />
      <Toast toast={state.toast} bottom={insets.bottom + 100} />

      <SyncModal
        data={modal?.kind === 'sync' ? { minutes: modal.minutes, habit: modal.habit } : null}
        onClose={actions.dismissModal}
      />
      <MysteryEnvelope
        data={modal?.kind === 'envelope' ? { id: modal.id, day: modal.day, prompt: modal.prompt } : null}
        onClose={actions.dismissModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 19, color: colors.textFaint, textAlign: 'center', padding: 24 },
  formHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  input: {
    height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.glass,
    paddingHorizontal: 14, color: colors.text, fontFamily: fonts.sans, fontSize: 14, marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: colors.hairline, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1, color: colors.textMuted },
  add: { height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: alpha(colors.gold, 0.5), backgroundColor: alpha(colors.gold, 0.08) },
  addText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: colors.text },
  root: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 27,
    lineHeight: 30,
    letterSpacing: 9,
    color: colors.text,
  },
  harmony: {
    marginTop: 4,
    fontFamily: fonts.displayLight,
    fontSize: 26,
    lineHeight: 28,
    color: colors.text,
    fontVariant: ['lining-nums'],
  },
  cols: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  colHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 96 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  count: { letterSpacing: 1.6 },
  headRule: { height: 1, backgroundColor: colors.hairlineSoft, marginHorizontal: 14 },
  pulse: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 54,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: alpha(colors.terracotta, 0.35),
    backgroundColor: alpha(colors.terracotta, 0.05),
  },
  pulseText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.text,
  },
});
