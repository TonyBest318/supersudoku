import { generate as coreGenerate } from 'sudoku-core';
import { analyzeCorePuzzle, isL9Report } from './coreRating';
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

// Use the pinned engine's actual L9 rating, never a local approximation.
export const GENERATION_CONFIG = { attempts: 500, maxMilliseconds: 20000 } as const;
export interface GenerationProgress { attempt: number; limit: number }
export function generatePuzzle(
  config: { attempts: number; maxMilliseconds: number } = GENERATION_CONFIG,
  random = Math.random,
  onProgress?: (progress: GenerationProgress) => void,
): Puzzle {
  if (!Number.isInteger(config.attempts) || config.attempts < 1 || config.attempts > 5000 ||
      !Number.isFinite(config.maxMilliseconds) || config.maxMilliseconds <= 0) throw new Error('生成参数无效');
  const start = performance.now();
  for (let attempt = 1; attempt <= config.attempts; attempt++) {
    const remaining = config.maxMilliseconds - (performance.now() - start);
    if (remaining <= 0) break;
    onProgress?.({ attempt, limit: config.attempts });
    let givens: Value[];
    try {
      givens = coreGenerate('L9', { seed: Math.floor(random() * 0x100000000), maxAttempts: 1, timeoutMs: remaining }) as Value[];
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Could not generate a "L9" puzzle within budget')) continue;
      throw error;
    }
    const analysis = analyzeCorePuzzle(givens);
    if (!isL9Report(analysis)) continue;
    const solutions = solve(givens, 2);
    if (solutions.length !== 1 || !analysis.board.every((v, i) => v === solutions[0][i])) continue;
    // Independently check all reported placements and eliminations against the unique answer.
    if (!analysis.steps.every(step => step.placements.every(c => c.digit === solutions[0][c.cell]) &&
        step.eliminations.every(c => c.digit !== solutions[0][c.cell]))) continue;
    return { id: givens.map(n => n ?? 0).join(''), givens, solution: solutions[0], analysis };
  }
  throw new Error('本次未找到通过 L9 评级的题目，请重新生成。');
}
