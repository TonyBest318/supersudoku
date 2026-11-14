import { analyzePuzzle } from '../domain/logicalSolver';
import { solve } from '../domain/solver';
import { DIGITS, type Cell, type GameState } from '../domain/types';
export const SAVE_KEY = 'super-sudoku.game.v1';
const valueValid = (n: unknown) => n === null || DIGITS.some(d => d === n);
function validCells(cells: unknown, givens: GameState['puzzle']['givens']): cells is Cell[] {
  return Array.isArray(cells) && cells.length === 81 && cells.every((c, i) => c &&
    typeof c.given === 'boolean' && c.given === (givens[i] !== null) && valueValid(c.value) &&
    (!c.given || c.value === givens[i]) && Array.isArray(c.notes) && c.notes.length <= 9 &&
    new Set(c.notes).size === c.notes.length && c.notes.every((n: unknown) => n !== null && valueValid(n)) &&
    (c.value === null || c.notes.length === 0));
}
export function parseSavedGame(raw: string): GameState | null {
  try {
    const saved = JSON.parse(raw);
    if (saved.schemaVersion !== 1) return null;
    const s = saved.state as GameState;
    if (!s || !s.puzzle || typeof s.puzzle.id !== 'string' || !Array.isArray(s.puzzle.givens) ||
      s.puzzle.givens.length !== 81 || !s.puzzle.givens.every(valueValid) ||
      s.puzzle.givens.filter(Boolean).length < 17 || !Array.isArray(s.puzzle.solution)) return null;
    const solutions = solve(s.puzzle.givens, 2);
    if (solutions.length !== 1 || JSON.stringify(solutions[0]) !== JSON.stringify(s.puzzle.solution)) return null;
    if (!validCells(s.cells, s.puzzle.givens) || !Number.isInteger(s.selected) || s.selected < 0 || s.selected > 80 ||
      typeof s.notesMode !== 'boolean' || !valueValid(s.highlightedDigit) || !Number.isInteger(s.mistakes) ||
      s.mistakes < 0 || s.mistakes > 3 || !Array.isArray(s.history) || s.history.length > 200 ||
      !s.history.every(h => h && validCells(h.cells, s.puzzle.givens))) return null;
    const expected = s.mistakes === 3 ? 'lost' : s.cells.every((c, i) => c.value === s.puzzle.solution[i]) ? 'completed' : 'playing';
    if (s.status !== expected) return null;
    // Saved reports are untrusted; regenerate from the validated givens.
    if (s.puzzle.analysis) s.puzzle.analysis = analyzePuzzle(s.puzzle.givens);
    return s;
  } catch { return null; }
}
