export type Prompt = { kind: string; text: string };

/** Revealed by the sealed card every third day of a shared streak. */
export const PROMPTS: Prompt[] = [
  { kind: 'Curated Evening', text: "Winner chooses tonight's wine & movie." },
  { kind: 'Ask Me Anything', text: 'What is one small thing I did this week that you quietly loved?' },
  { kind: 'Ritual', text: 'Ten unhurried minutes tonight. No phones, one song each.' },
  { kind: 'Memory', text: 'Describe the first moment you knew this would last.' },
  { kind: 'Little Adventure', text: 'Choose a street neither of us has walked. Go before sunset.' },
];

export const SUGGESTED_HABITS = [
  'Morning Run',
  'Hydration',
  'Read',
  'Lights Out',
  'Meditate',
  'Stretch',
  'Walk',
  'No Sugar',
];
