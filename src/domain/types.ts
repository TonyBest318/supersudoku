export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type Digit = typeof DIGITS[number];
export type Value = Digit | null;
export interface Cell { given: boolean; value: Value; notes: readonly Digit[] }
export interface Puzzle { id: string; givens: readonly Value[]; solution: readonly Digit[] }
export interface BoardSnapshot { cells: readonly Cell[] }
export interface GameState extends BoardSnapshot {
  puzzle: Puzzle;
  selected: number;
  notesMode: boolean;
  highlightedDigit: Value;
  mistakes: number;
  status: 'playing' | 'lost' | 'completed';
  history: readonly BoardSnapshot[];
}
export type GameAction =
  | { type: 'select'; index: number }
  | { type: 'input'; digit: Digit }
  | { type: 'toggle-notes' }
  | { type: 'erase' }
  | { type: 'undo' };
