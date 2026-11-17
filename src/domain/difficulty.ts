import type { Puzzle } from './types';

export const DIFFICULTIES = {
  easy: { level: 'L8', maxTechniqueRank: 5 },
  medium: { level: 'L9', maxTechniqueRank: 7 },
} as const;
export type GameDifficulty = keyof typeof DIFFICULTIES;
export function isGameDifficulty(value: unknown): value is GameDifficulty {
  return value === 'easy' || value === 'medium';
}
export function puzzleDifficulty(puzzle?: Puzzle): GameDifficulty {
  return puzzle?.analysis?.version === 2 && puzzle.analysis.difficulty === 'L8' ? 'easy' : 'medium';
}
