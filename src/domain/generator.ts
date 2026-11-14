import { analyzePuzzle } from './logicalSolver';
import { shuffle, solve } from './solver';
import type { Puzzle, Value } from './types';

// Difficulty tuning lives here; clue count is not a formal technique rating.
const CARVING_CONFIG = { targetClues: 25, attempts: 5 } as const;
export function generateCandidate(config: { targetClues: number; attempts: number } = CARVING_CONFIG, random = Math.random): Puzzle {
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

// Rank 4 requires fish/wing logic; rank <= 3 includes all supported subsets.
export const GENERATION_CONFIG = { targetClues: 25, attempts: 400, minRank: 4, maxMilliseconds: 20000 } as const;
export interface GenerationProgress { attempt: number; limit: number }
export function generatePuzzle(
  config: { targetClues: number; attempts: number; minRank: number; maxMilliseconds: number } = GENERATION_CONFIG,
  random = Math.random,
  onProgress?: (progress: GenerationProgress) => void,
): Puzzle {
  if (!Number.isInteger(config.attempts) || config.attempts < 1 || config.attempts > 5000 ||
      !Number.isInteger(config.minRank) || config.minRank < 2 || config.minRank > 4 ||
      !Number.isFinite(config.maxMilliseconds) || config.maxMilliseconds <= 0) throw new Error('生成参数无效');
  const start = performance.now();
  for (let attempt = 1; attempt <= config.attempts; attempt++) {
    if (performance.now() - start >= config.maxMilliseconds) break;
    onProgress?.({ attempt, limit: config.attempts });
    const puzzle = generateCandidate({ targetClues: config.targetClues, attempts: 1 }, random);
    // Reject easy candidates cheaply before running the full technique set.
    if (analyzePuzzle(puzzle.givens, config.minRank - 1).status !== 'stalled') continue;
    const analysis = analyzePuzzle(puzzle.givens);
    if (analysis.status === 'solved' && analysis.hardestRank >= config.minRank &&
        analysis.board.every((v, i) => v === puzzle.solution[i])) return { ...puzzle, analysis };
  }
  throw new Error('本次未找到满足技巧难度且无需猜测的题目，请重新生成。');
}
