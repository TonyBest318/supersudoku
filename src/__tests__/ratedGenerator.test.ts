import { expect, it, vi } from 'vitest';
import { generatePuzzle, GENERATION_CONFIG } from '../domain/generator';
import { analyzePuzzle } from '../domain/logicalSolver';
import { createGame } from '../game/reducer';
import { parseSavedGame } from '../storage/localStorage';
import { solve } from '../domain/solver';
const seeded = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
it('only returns unique, fully logical puzzles that defeat the lower technique tier', () => {
  const ids = new Set<string>();
  for (let seed = 1; seed <= 10; seed++) {
    let attempts = 0;
    const start = performance.now();
    const puzzle = generatePuzzle(undefined, seeded(seed), p => { attempts = p.attempt; });
    console.log(`seed ${seed}: ${attempts} candidates, ${Math.round(performance.now() - start)}ms`);
    ids.add(puzzle.id);
    expect(solve(puzzle.givens, 2)).toEqual([puzzle.solution]);
    expect(puzzle.analysis?.status).toBe('solved');
    expect(puzzle.analysis?.board).toEqual(puzzle.solution);
    expect(puzzle.analysis?.hardestRank).toBe(4);
    expect(analyzePuzzle(puzzle.givens, 3).status).toBe('stalled');
  }
  expect(ids.size).toBe(10);
}, 30000);
it('never silently downgrades when its budget cannot find a hard puzzle', () => {
  expect(() => generatePuzzle({ ...GENERATION_CONFIG, targetClues: 80, attempts: 2 }, seeded(1))).toThrow('未找到');
  expect(() => generatePuzzle({ ...GENERATION_CONFIG, attempts: 0 })).toThrow('参数无效');
  expect(() => generatePuzzle({ ...GENERATION_CONFIG, minRank: 5 })).toThrow('参数无效');
});

it('stops at its time budget without returning an ungraded puzzle', () => {
  let time = 0;
  const clock = vi.spyOn(performance, 'now').mockImplementation(() => time += 10);
  try {
    expect(() => generatePuzzle({ ...GENERATION_CONFIG, maxMilliseconds: 5 })).toThrow('未找到');
  } finally { clock.mockRestore(); }
});
it('restores rated games and rebuilds untrusted saved reports', () => {
  const state = createGame(generatePuzzle(undefined, seeded(2)));
  const saved = JSON.stringify({ schemaVersion: 1, state });
  expect(parseSavedGame(saved)).toEqual(state);
  const tampered = JSON.parse(saved);
  tampered.state.puzzle.analysis = { status: 'solved', counts: { imaginary: 500 } };
  expect(parseSavedGame(JSON.stringify(tampered))).toEqual(state);
});
