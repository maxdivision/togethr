import type { Prompt } from '../data/content';

export type Banner = { id: number; text: string; action: string };
export type Toast = { id: number; text: string };

export type ModalInput =
  | { kind: 'sync'; minutes: number; habit: string }
  | { kind: 'envelope'; day: number; prompt: Prompt };

export type Modal = ModalInput & { id: number };

export type PulseFx = { id: number; tone: 'send' | 'receive' };
