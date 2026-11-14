import { shuffle, solve } from './solver';
import type { Puzzle, Value } from './types';

// Difficulty tuning lives here; clue count is not a formal technique rating.
export const GENERATION_CONFIG = { targetClues: 25, attempts: 5 } as const;
export function generatePuzzle(config: { targetClues: number; attempts: number } = GENERATION_CONFIG, random = Math.random): Puzzle {
  if (!Number.isInteger(config.targetClues) || config.targetClues < 17 || config.targetClues > 80 ||
      !Number.isInteger(config.attempts) || config.attempts < 1 || config.attempts > 100) throw new Error('生成参数无效');
  let best: Puzzle | undefined;
  for (let attempt = 0; attempt < config.attempts; attempt++) {
    const solution = solve(Array<Value>(81).fill(null), 1, random)[0];
    const givens: Value[] = [...solution];
    let clues = 81;
    for (const index of shuffle(Array.from({ length: 81 }, (_, i) => i), random)) {
      if (clues <= config.targetClues) break;
      const old = givens[index]; givens[index] = null;
      if (solve(givens, 2).length === 1) clues--; else givens[index] = old;
    }
    const puzzle = { id: givens.map(n => n ?? 0).join(''), givens, solution };
    if (!best || clues < best.givens.filter(Boolean).length) best = puzzle;
    if (clues <= config.targetClues) break;
  }
  return best!;
}
