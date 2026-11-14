import { DIGITS, type Digit, type Value } from './types';

/** MRV backtracking. Stops at limit; invalid boards have no solutions. */
export function solve(values: readonly Value[], limit = 2, random?: () => number): Digit[][] {
  if (values.length !== 81 || !Number.isInteger(limit) || limit < 1) return [];
  const board = [...values];
  const rows = Array<number>(9).fill(0), cols = [...rows], boxes = [...rows];
  for (let i = 0; i < 81; i++) {
    const value = board[i];
    if (value === null) continue;
    if (!DIGITS.includes(value)) return [];
    const r = Math.floor(i / 9), c = i % 9, b = Math.floor(r / 3) * 3 + Math.floor(c / 3), bit = 1 << value;
    if ((rows[r] | cols[c] | boxes[b]) & bit) return [];
    rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
  }
  const solutions: Digit[][] = [];
  function search(): void {
    if (solutions.length >= limit) return;
    let index = -1, candidates: Digit[] = [];
    for (let i = 0; i < 81; i++) {
      if (board[i] !== null) continue;
      const r = Math.floor(i / 9), c = i % 9, b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      const options = DIGITS.filter(n => !((rows[r] | cols[c] | boxes[b]) & (1 << n)));
      if (!options.length) return;
      if (index === -1 || options.length < candidates.length) { index = i; candidates = options; }
      if (options.length === 1) break;
    }
    if (index === -1) { solutions.push([...board] as Digit[]); return; }
    if (random) candidates = shuffle(candidates, random);
    const r = Math.floor(index / 9), c = index % 9, b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    for (const n of candidates) {
      const bit = 1 << n;
      board[index] = n; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      search();
      board[index] = null; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      if (solutions.length >= limit) return;
    }
  }
  search();
  return solutions;
}
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
