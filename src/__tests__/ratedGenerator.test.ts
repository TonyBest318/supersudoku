import { DIFFICULTIES, puzzleDifficulty, type GameDifficulty } from '../domain/difficulty';
import { expect, it, vi } from 'vitest';
import { analyze, STRATEGY } from 'sudoku-core';
import { generatePuzzle, GENERATION_CONFIG } from '../domain/generator';
import { analyzeCorePuzzle, isDifficultyReport } from '../domain/coreRating';
import { analyzePuzzle } from '../domain/logicalSolver';
import { createGame } from '../game/reducer';
import { parseSavedGame } from '../storage/localStorage';
import { solve } from '../domain/solver';
import { DIGITS, type Value } from '../domain/types';
import { isPeer } from '../domain/board';
const seeded = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const fixture = [...'007650031100070006080000000050090300200300090009207500600010700072000009500000004'].map(n => n === '0' ? null : Number(n)) as Value[];
it.each<GameDifficulty>(['easy', 'medium'])('generates %s at its exact rating with replayable deductions and a technique ceiling', difficulty => {
  const ids = new Set<string>();
  for (let seed = 1; seed <= 5; seed++) {
    let attempts = 0;
    const start = performance.now();
    const puzzle = generatePuzzle({ ...GENERATION_CONFIG, difficulty }, seeded(seed), p => { attempts = p.attempt; });
    console.log(`seed ${seed}: ${attempts} candidates, ${Math.round(performance.now() - start)}ms`);
    ids.add(puzzle.id);
    expect(solve(puzzle.givens, 2)).toEqual([puzzle.solution]);
    expect(analyze([...puzzle.givens]).difficulty).toBe(DIFFICULTIES[difficulty].level);
    expect(puzzleDifficulty(puzzle)).toBe(difficulty);
    const report = puzzle.analysis!;
    expect(report.version).toBe(2);
    if (report.version !== 2) throw new Error('Wrong engine');
    expect(isDifficultyReport(report, difficulty)).toBe(true);
    expect(report.board).toEqual(puzzle.solution);
    const board = [...puzzle.givens];
    const candidates = board.map((v, i) => new Set(v ? [] : DIGITS.filter(d => !board.some((v, j) => isPeer(i, j) && v === d))));
    for (const step of report.steps) {
      expect(step.placements.length + step.eliminations.length).toBeGreaterThan(0);
      for (const { cell, digit } of step.eliminations) {
        expect(candidates[cell].has(digit)).toBe(true);
        expect(digit).not.toBe(puzzle.solution[cell]);
        candidates[cell].delete(digit);
      }
      for (const { cell, digit } of step.placements) {
        expect(board[cell]).toBeNull();
        expect(candidates[cell].has(digit)).toBe(true);
        expect(digit).toBe(puzzle.solution[cell]);
        board[cell] = digit; candidates[cell].clear();
        candidates.forEach((set, i) => { if (isPeer(cell, i)) set.delete(digit); });
      }
    }
    expect(board).toEqual(puzzle.solution);
    const state = createGame(puzzle);
    const restored = parseSavedGame(JSON.stringify({ schemaVersion: 1, state }));
    expect(restored).toEqual(state);
    expect(puzzleDifficulty(restored!.puzzle)).toBe(difficulty);
  }
  expect(ids.size).toBe(5);
}, 30000);
it('rejects lower ratings, L10 techniques and unknown techniques rather than silently accepting them', () => {
  const report = analyzeCorePuzzle(fixture);
  expect(isDifficultyReport(report, 'medium')).toBe(true);
  expect(isDifficultyReport({ ...report, difficulty: 'L8' }, 'medium')).toBe(false);
  expect(isDifficultyReport({ ...report, difficulty: 'L10' }, 'medium')).toBe(false);
  for (const technique of [STRATEGY.MEDUSA_3D, STRATEGY.AIC, STRATEGY.NISHIO, 'unknown']) {
    expect(isDifficultyReport({ ...report, steps: [{ ...report.steps[0], technique }] }, 'medium')).toBe(false);
  }
});
it('rejects L9 techniques from easy, even if a report claims L8', () => {
  const report = analyzeCorePuzzle(fixture);
  for (const technique of [STRATEGY.JELLYFISH, STRATEGY.FINNED_SWORDFISH, STRATEGY.FINNED_JELLYFISH, STRATEGY.BUG_PLUS_ONE, STRATEGY.X_CHAIN, STRATEGY.XY_CHAIN]) {
    expect(isDifficultyReport({ ...report, difficulty: 'L8', steps: [{ ...report.steps[0], technique }] }, 'easy')).toBe(false);
  }
});
it('validates settings and stops at its time budget without downgrading', () => {
  expect(() => generatePuzzle({ ...GENERATION_CONFIG, attempts: 1 }, seeded(1))).toThrow('未找到');
  expect(() => generatePuzzle({ ...GENERATION_CONFIG, attempts: 0 })).toThrow('参数无效');
  expect(() => generatePuzzle({ ...GENERATION_CONFIG, maxMilliseconds: Infinity })).toThrow('参数无效');
  let time = 0;
  const clock = vi.spyOn(performance, 'now').mockImplementation(() => time += 10);
  try {
    expect(() => generatePuzzle({ ...GENERATION_CONFIG, maxMilliseconds: 5 })).toThrow('未找到');
  } finally { clock.mockRestore(); }
});
it('rebuilds core reports on restore while preserving old ratings and ungraded saves', () => {
  const puzzle = { id: 'fixture', givens: fixture, solution: solve(fixture, 1)[0] };
  for (const analysis of [undefined, analyzePuzzle(fixture), analyzeCorePuzzle(fixture)]) {
    const state = createGame({ ...puzzle, analysis });
    const saved = JSON.stringify({ schemaVersion: 1, state });
    expect(parseSavedGame(saved)).toEqual(state);
    if (analysis) {
      const tampered = JSON.parse(saved);
      tampered.state.puzzle.analysis = { version: analysis.version, counts: { imaginary: 500 } };
      expect(parseSavedGame(JSON.stringify(tampered))).toEqual(state);
    }
  }
});
