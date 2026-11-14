import { isPeer } from '../domain/board';
import type { Cell, GameAction, GameState, Puzzle } from '../domain/types';

export function createGame(puzzle: Puzzle): GameState {
  return { puzzle, cells: puzzle.givens.map(value => ({ value, given: value !== null, notes: [] })),
    selected: Math.max(0, puzzle.givens.findIndex(v => v === null)), notesMode: false,
    highlightedDigit: null, mistakes: 0, status: 'playing', history: [] };
}
export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'select') {
    if (!Number.isInteger(action.index) || action.index < 0 || action.index > 80) return state;
    return { ...state, selected: action.index, highlightedDigit: state.cells[action.index].value };
  }
  if (state.status !== 'playing') return state;
  if (action.type === 'toggle-notes') return { ...state, notesMode: !state.notesMode };
  if (action.type === 'undo') {
    const previous = state.history.at(-1);
    // Mistakes never roll back; three mistakes irrevocably ends this game.
    return previous ? { ...state, cells: previous.cells, history: state.history.slice(0, -1), highlightedDigit: previous.cells[state.selected].value } : state;
  }
  const cell = state.cells[state.selected];
  if (cell.given) return action.type === 'input' ? { ...state, highlightedDigit: action.digit } : state;
  let cells: readonly Cell[];
  let mistakes = state.mistakes;
  let highlightedDigit = state.highlightedDigit;
  if (action.type === 'erase') {
    if (cell.value === null && !cell.notes.length) return state;
    cells = state.cells.map((c, i) => i === state.selected ? { ...c, value: null, notes: [] } : c);
    highlightedDigit = null;
  } else {
    highlightedDigit = action.digit;
    if (state.notesMode) {
      if (cell.value !== null) return { ...state, highlightedDigit };
      const notes = cell.notes.includes(action.digit) ? cell.notes.filter(n => n !== action.digit) : [...cell.notes, action.digit].sort();
      cells = state.cells.map((c, i) => i === state.selected ? { ...c, notes } : c);
    } else {
      if (cell.value === action.digit) return { ...state, highlightedDigit };
      const correct = action.digit === state.puzzle.solution[state.selected];
      if (!correct) mistakes++;
      cells = state.cells.map((c, i) => i === state.selected ? { ...c, value: action.digit, notes: [] } :
        correct && isPeer(i, state.selected) ? { ...c, notes: c.notes.filter(n => n !== action.digit) } : c);
    }
  }
  const status = mistakes >= 3 ? 'lost' : cells.every((c, i) => c.value === state.puzzle.solution[i]) ? 'completed' : 'playing';
  return { ...state, cells, mistakes, highlightedDigit, status, history: [...state.history.slice(-199), { cells: state.cells }] };
}
