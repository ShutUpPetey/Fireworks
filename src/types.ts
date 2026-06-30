export type FireworkType = 'cake_200g' | 'cake_500g' | 'fountain' | 'reload' | 'roman_candle' | 'misc';
export type ShowPhase = 'start' | 'body' | 'mid_finale' | 'finale' | 'other';

export interface Firework {
  id: string;
  name: string;
  type: FireworkType;
  cost: number;
  duration: number; // seconds
  phase: ShowPhase;
  notes: string;
  rating: number; // 1-10, 0 = unrated
  quantity: number;
}

export interface SimultaneousItem {
  id: string;
  fireworkId: string;
  cue: string;
  location: string;
  offset: number; // seconds after the parent item's start time (can be negative or beyond parent's duration)
}

export interface ShowItem {
  id: string;
  fireworkId: string;
  cue: string;       // e.g. "1.1", "3.7"
  location: string;  // FC, FL, FR, BL, BR, TRAIL, etc.
  showNotes: string;
  startTime: number; // absolute seconds from show start; freely positionable
  simultaneous: SimultaneousItem[]; // linked items with their own offset from this item's startTime
}

export const FIREWORK_TYPE_LABELS: Record<FireworkType, string> = {
  cake_200g: '200g Cake',
  cake_500g: '500g Cake',
  fountain: 'Fountain',
  reload: 'Reload/Mortar',
  roman_candle: 'Roman Candle',
  misc: 'Misc',
};

export const PHASE_LABELS: Record<ShowPhase, string> = {
  start: 'Opening',
  body: 'Main Show',
  mid_finale: 'Mid-Finale',
  finale: 'Finale',
  other: 'Other',
};

export const PHASE_COLORS: Record<ShowPhase, { bg: string; border: string; text: string; badge: string }> = {
  start:      { bg: 'bg-emerald-950', border: 'border-emerald-600', text: 'text-emerald-400', badge: 'bg-emerald-800 text-emerald-200' },
  body:       { bg: 'bg-blue-950',    border: 'border-blue-600',    text: 'text-blue-400',    badge: 'bg-blue-800 text-blue-200' },
  mid_finale: { bg: 'bg-amber-950',   border: 'border-amber-600',   text: 'text-amber-400',   badge: 'bg-amber-800 text-amber-200' },
  finale:     { bg: 'bg-red-950',     border: 'border-red-600',     text: 'text-red-400',     badge: 'bg-red-800 text-red-200' },
  other:      { bg: 'bg-slate-900',   border: 'border-slate-600',   text: 'text-slate-400',   badge: 'bg-slate-700 text-slate-200' },
};

export const TYPE_COLORS: Record<FireworkType, string> = {
  cake_200g:    'bg-violet-800 text-violet-200',
  cake_500g:    'bg-purple-800 text-purple-200',
  fountain:     'bg-teal-800 text-teal-200',
  reload:       'bg-indigo-800 text-indigo-200',
  roman_candle: 'bg-yellow-800 text-yellow-200',
  misc:         'bg-slate-700 text-slate-200',
};

export const LOCATIONS = ['FC', 'FL', 'FR', 'BL', 'BR', 'TRAIL', 'OTHER'];

export function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function parseCue(cue: string): { rack: number; pos: number } | null {
  const match = cue.trim().match(/^(\d{1,2})\.(\d{1,2})$/);
  if (!match) return null;
  const rack = parseInt(match[1]);
  const pos = parseInt(match[2]);
  if (rack < 1 || rack > 10 || pos < 1 || pos > 12) return null;
  return { rack, pos };
}
