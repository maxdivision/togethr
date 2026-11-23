/** DUO design tokens: "Quiet Luxury". Keep every colour / font / timing decision here. */

export const colors = {
  bg: '#0E0E10',
  glass: 'rgba(255,255,255,0.04)',
  glassStrong: 'rgba(255,255,255,0.07)',
  hairline: 'rgba(255,255,255,0.08)',
  hairlineSoft: 'rgba(255,255,255,0.05)',

  gold: '#E5C185', // shared streak + milestones
  silver: '#B7C1CC', // cool frosted silver (streak at rest)
  terracotta: '#D98A7C', // Partner A (you)
  sage: '#8FA89B', // Partner B

  text: '#F3EEE6',
  textMuted: 'rgba(243,238,230,0.58)',
  textFaint: 'rgba(243,238,230,0.34)',
} as const;

export const fonts = {
  display: 'CormorantGaramond_500Medium',
  displayLight: 'CormorantGaramond_300Light',
  displayItalic: 'CormorantGaramond_400Regular_Italic',
  sans: 'Jost_400Regular',
  sansLight: 'Jost_300Light',
  sansMedium: 'Jost_500Medium',
} as const;

export const radii = { card: 26, pill: 999 } as const;

export const motion = {
  /** Hold-to-complete duration. */
  holdMs: 1200,
  slow: 900,
  medium: 600,
} as const;

/** "#RRGGBB" + alpha -> "rgba(r,g,b,a)". */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
