import { describe, expect, it } from 'vitest';
import { generatePuzzle } from '../domain/generator';
import { solve } from '../domain/solver';
import { DIGITS, type Digit, type Value } from '../domain/types';
import { createGame, gameReducer } from '../game/reducer';
import { parseSavedGame } from '../storage/localStorage';

function seeded(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
const puzzle = generatePuzzle({ targetClues: 28, attempts: 2 }, seeded(42));
const blank = puzzle.givens.findIndex(v => v === null);
const correct = puzzle.solution[blank];
const wrong = DIGITS.find(d => d !== correct)!;
const save = (state: unknown) => JSON.stringify({ schemaVersion: 1, state });

describe('random generator and independent board invariants', () => {
  it('produces unique puzzles across ten reproducible seeds', () => {
    const ids = new Set<string>();
    for (let seed = 1; seed <= 10; seed++) {
      const p = generatePuzzle(undefined, seeded(seed));
      ids.add(p.id);
      expect(solve(p.givens, 2)).toEqual([p.solution]);
      expect(p.givens.filter(Boolean).length).toBeGreaterThanOrEqual(25);
      expect(p.givens.filter(Boolean).length).toBeLessThanOrEqual(32);
      for (let i = 0; i < 9; i++) {
        const row = p.solution.slice(i * 9, i * 9 + 9);
        const col = p.solution.filter((_, n) => n % 9 === i);
        const box = p.solution.filter((_, n) => Math.floor(n / 27) * 3 + Math.floor(n % 9 / 3) === i);
        for (const unit of [row, col, box]) expect([...unit].sort()).toEqual([...DIGITS]);
      }
    }
    expect(ids.size).toBe(10);
  });
  it('rejects invalid generation settings', () => {
    expect(() => generatePuzzle({ targetClues: 16, attempts: 1 })).toThrow();
    expect(() => generatePuzzle({ targetClues: 25, attempts: 0 })).toThrow();
  });
  it('rejects malformed or conflicting boards and caps ambiguous results', () => {
    expect(solve([])).toEqual([]);
    const invalid: Value[] = Array(81).fill(null); invalid[0] = 1; invalid[1] = 1;
    expect(solve(invalid)).toEqual([]);
    expect(solve(Array<Value>(81).fill(null), 2)).toHaveLength(2);
    expect(solve(puzzle.solution)).toEqual([puzzle.solution]);
  });
});

describe('game rules', () => {
  it('protects givens from typing and erasure', () => {
    const state = { ...createGame(puzzle), selected: puzzle.givens.findIndex(Boolean) };
    expect(gameReducer(state, { type: 'erase' })).toBe(state);
    expect(gameReducer(state, { type: 'input', digit: wrong }).cells).toEqual(state.cells);
  });
  it('toggles notes without mistakes and preserves numeric ordering', () => {
    let state = gameReducer(createGame(puzzle), { type: 'toggle-notes' });
    for (const digit of [9, 1, 5] as Digit[]) state = gameReducer(state, { type: 'input', digit });
    expect(state.cells[blank].notes).toEqual([1, 5, 9]);
    state = gameReducer(state, { type: 'input', digit: 5 });
    expect(state.cells[blank].notes).toEqual([1, 9]);
    expect(state.mistakes).toBe(0);
  });
  it('undo restores peer notes removed by a correct entry', () => {
    const state = createGame(puzzle);
    const peer = state.cells.findIndex((c, i) => i !== blank && !c.given && Math.floor(i / 9) === Math.floor(blank / 9));
    expect(peer).toBeGreaterThanOrEqual(0);
    state.cells = state.cells.map((c, i) => i === peer ? { ...c, notes: [correct] } : c);
    const filled = gameReducer(state, { type: 'input', digit: correct });
    expect(filled.cells[peer].notes).toEqual([]);
    expect(gameReducer(filled, { type: 'undo' }).cells).toEqual(state.cells);
  });
  it('wrong entry does not remove peer notes; repeat same entry does not charge twice', () => {
    const state = createGame(puzzle);
    const filled = gameReducer(state, { type: 'input', digit: wrong });
    expect(filled.mistakes).toBe(1);
    expect(gameReducer(filled, { type: 'input', digit: wrong }).mistakes).toBe(1);
    expect(filled.cells.filter((_, i) => i !== blank)).toEqual(state.cells.filter((_, i) => i !== blank));
  });
  it('undo never refunds mistakes; third error ends and locks play', () => {
    let state = createGame(puzzle);
    for (let i = 1; i <= 3; i++) {
      state = gameReducer(state, { type: 'input', digit: wrong });
      expect(state.mistakes).toBe(i);
      if (i < 3) state = gameReducer(state, { type: 'undo' });
    }
    expect(state.status).toBe('lost');
    for (const type of ['erase', 'undo', 'toggle-notes'] as const) expect(gameReducer(state, { type })).toBe(state);
    expect(gameReducer(state, { type: 'input', digit: correct })).toBe(state);
  });
  it('erase can be undone without restoring a mistake budget', () => {
    const wrongState = gameReducer(createGame(puzzle), { type: 'input', digit: wrong });
    const erased = gameReducer(wrongState, { type: 'erase' });
    expect(erased.cells[blank].value).toBeNull();
    expect(erased.mistakes).toBe(1);
    expect(gameReducer(erased, { type: 'undo' }).cells).toEqual(wrongState.cells);
  });
  it('only a correct completed board wins', () => {
    let state = createGame(puzzle);
    for (let i = 0; i < 81; i++) {
      if (puzzle.givens[i]) continue;
      state = gameReducer(state, { type: 'select', index: i });
      state = gameReducer(state, { type: 'input', digit: puzzle.solution[i] });
    }
    expect(state.status).toBe('completed');
    expect(state.mistakes).toBe(0);
  });
});

describe('saved game validation', () => {
  it('round trips notes, mistakes and undo history', () => {
    const state = gameReducer(createGame(puzzle), { type: 'input', digit: wrong });
    expect(parseSavedGame(save(state))).toEqual(state);
  });
  it('rejects corrupt, inconsistent or incompatible saves', () => {
    expect(parseSavedGame('{')).toBeNull();
    expect(parseSavedGame('{"schemaVersion":2}')).toBeNull();
    const state = createGame(puzzle);
    expect(parseSavedGame(save({ ...state, mistakes: -1 }))).toBeNull();
    expect(parseSavedGame(save({ ...state, status: 'completed' }))).toBeNull();
    expect(parseSavedGame(save({ ...state, selected: 81 }))).toBeNull();
    expect(parseSavedGame(save({ ...state, puzzle: { ...puzzle, solution: [] } }))).toBeNull();
  });
});
