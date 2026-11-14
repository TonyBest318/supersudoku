import { expect, it } from 'vitest';
import { analyzePuzzle, TECHNIQUES, UNITS } from '../domain/logicalSolver';
import { generateCandidate as generatePuzzle } from '../domain/generator';
import { isPeer } from '../domain/board';
import { DIGITS, type Value } from '../domain/types';
import { solve } from '../domain/solver';

const seeded = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
it('recognizes malformed, conflicting, complete and stalled boards', () => {
  expect(analyzePuzzle([]).status).toBe('invalid');
  expect(analyzePuzzle([1, 1, ...Array(79).fill(null)]).status).toBe('invalid');
  expect(analyzePuzzle(Array(81).fill(null)).status).toBe('stalled');
  const solution = solve(Array(81).fill(null), 1)[0];
  expect(analyzePuzzle(solution).status).toBe('solved');
  const single: Value[] = [...solution]; single[0] = null;
  expect(analyzePuzzle(single).steps[0].technique).toBe('nakedSingle');
});
it('every deduction preserves the independently solved answer and replays to the reported board', () => {
  const seen = new Set<string>();
  const fixtures = [
    '038600090000000650000287000070460200500000000001300007300000004000900300040700029',
    '000020100060000050000761900031900200045006000000200400000070000700000098093000510',
    '000004000075000000001000208000900400100703960027600010200000050000508700006000300',
  ].map(id => {
    const givens = [...id].map(n => n === '0' ? null : Number(n)) as Value[];
    return { givens, solution: solve(givens, 2)[0] };
  });
  const puzzles = [...fixtures, ...Array.from({ length: 40 }, (_, i) => generatePuzzle({ targetClues: 23, attempts: 1 }, seeded(i + 1)))];
  for (const puzzle of puzzles) {
    const result = analyzePuzzle(puzzle.givens);
    expect(result.status).not.toBe('invalid');
    const board = [...puzzle.givens];
    const candidates = board.map((v, i) => new Set(v ? [] : DIGITS.filter(d => !board.some((v, j) => isPeer(i, j) && v === d))));
    for (const step of result.steps) {
      seen.add(step.technique);
      expect(step.placements.length + step.eliminations.length).toBeGreaterThan(0);
      for (const { cell, digit } of step.eliminations) {
        expect(candidates[cell].has(digit)).toBe(true);
        expect(digit).not.toBe(puzzle.solution[cell]);
        candidates[cell].delete(digit);
      }
      for (const { cell, digit } of step.placements) {
        expect(board[cell]).toBeNull();
        expect(digit).toBe(puzzle.solution[cell]);
        board[cell] = digit; candidates[cell].clear();
        candidates.forEach((set, i) => { if (isPeer(cell, i)) set.delete(digit); });
      }
      for (const unit of UNITS) for (const d of DIGITS) {
        expect(unit.some(i => board[i] === d || candidates[i].has(d))).toBe(true);
      }
    }
    expect(board).toEqual(result.board);
    if (result.status === 'solved') expect(result.board).toEqual(puzzle.solution);
  }
  expect(seen.size).toBe(Object.keys(TECHNIQUES).length);
}, 30000);
