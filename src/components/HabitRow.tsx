import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HabitRing } from './HabitRing';
import { ShimmerSweep } from './primitives';
import type { Habit } from '../domain/models';
import { colors, fonts } from '../theme/tokens';

type Props = {
  index: number;
  habit: Habit;
  mine: boolean;
  partner: boolean;
  myColor: string;
  partnerColor: string;
  partnerName: string;
  last: boolean;
  editing: boolean;
  onComplete: () => void;
  onRemove: () => void;
};

/** [your ring]  01 · MORNING RUN · 06:30  [partner ring] */
export function HabitRow({
  index, habit, mine, partner, myColor, partnerColor, partnerName, last, editing, onComplete, onRemove,
}: Props) {
  const bothDone = mine && partner;
  const shimmer = (mine ? 1 : 0) + (partner ? 1 : 0);

  return (
    <View style={[styles.row, !last && styles.divider]}>
      <ShimmerSweep trigger={shimmer} />
      <View style={styles.ringCol}>
        <HabitRing color={myColor} done={mine} interactive onComplete={onComplete} label={habit.title} />
      </View>

      <View style={styles.center}>
        <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
        <Text style={[styles.title, bothDone && { color: colors.gold }]} numberOfLines={1}>
          {habit.title}
        </Text>
        {editing ? (
          <Pressable onPress={onRemove} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${habit.title}`}>
            <Text style={[styles.detail, { color: colors.terracotta }]}>Remove</Text>
          </Pressable>
        ) : !!habit.detail ? (
          <Text style={styles.detail} numberOfLines={1}>{habit.detail}</Text>
        ) : null}
      </View>

      <View style={styles.ringCol}>
        <HabitRing color={partnerColor} done={partner} label={`${partnerName}: ${habit.title}`} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 74, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.hairlineSoft },
  ringCol: { width: 64, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  index: {
    fontFamily: fonts.displayItalic, fontSize: 15, lineHeight: 17, color: colors.textFaint,
    marginBottom: 2, fontVariant: ['lining-nums'],
  },
  title: { fontFamily: fonts.sansMedium, fontSize: 11.5, letterSpacing: 2.2, textTransform: 'uppercase', color: colors.text },
  detail: {
    marginTop: 4, fontFamily: fonts.sans, fontSize: 9.5, letterSpacing: 1.6,
    textTransform: 'uppercase', color: colors.textFaint,
  },
});
