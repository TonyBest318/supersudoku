import { isPeer } from './board';
import { DIGITS, type Digit, type Value } from './types';

export const TECHNIQUES = {
  nakedSingle: { label: '显性单数', rank: 1 },
  hiddenSingle: { label: '隐性单数', rank: 1 },
  lockedCandidates: { label: '区块排除', rank: 2 },
  nakedPair: { label: '显性数对', rank: 3 },
  hiddenPair: { label: '隐性数对', rank: 3 },
  nakedTriple: { label: '显性三数组', rank: 3 },
  hiddenTriple: { label: '隐性三数组', rank: 3 },
  xWing: { label: 'X-Wing', rank: 4 },
  swordfish: { label: 'Swordfish', rank: 4 },
  xyWing: { label: 'XY-Wing', rank: 4 },
} as const;
export type Technique = keyof typeof TECHNIQUES;
export interface CandidateChange { cell: number; digit: Digit }
export interface LogicalStep {
  technique: Technique;
  cells: number[];
  digits: Digit[];
  placements: CandidateChange[];
  eliminations: CandidateChange[];
  reason: string;
}
export interface LogicalReport {
  version: 1;
  status: 'solved' | 'stalled' | 'invalid';
  board: Value[];
  steps: LogicalStep[];
  hardestRank: number;
  counts: Partial<Record<Technique, number>>;
}
export const UNITS = [
  ...Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => r * 9 + c)),
  ...Array.from({ length: 9 }, (_, c) => Array.from({ length: 9 }, (_, r) => r * 9 + c)),
  ...Array.from({ length: 9 }, (_, b) => Array.from({ length: 9 }, (_, k) =>
    Math.floor(b / 3) * 27 + (b % 3) * 3 + Math.floor(k / 3) * 9 + k % 3)),
];
const PEERS = Array.from({ length: 81 }, (_, i) =>
  Array.from({ length: 81 }, (_, j) => j).filter(j => i !== j && isPeer(i, j)));
const coord = (i: number) => `R${Math.floor(i / 9) + 1}C${i % 9 + 1}`;
function combinations<T>(items: readonly T[], size: number): T[][] {
  if (!size) return [[]];
  return items.flatMap((item, i) => combinations(items.slice(i + 1), size - 1).map(rest => [item, ...rest]));
}

/** Logical deduction only: no solution, search, guessing or uniqueness assumption. */
export function analyzePuzzle(values: readonly Value[], maxRank = 4): LogicalReport {
  const board = [...values];
  const steps: LogicalStep[] = [];
  const counts: LogicalReport['counts'] = {};
  const report = (status: LogicalReport['status']): LogicalReport => ({
    version: 1, status, board, steps, counts,
    hardestRank: Math.max(0, ...steps.map(s => TECHNIQUES[s.technique].rank)),
  });
  if (values.length !== 81 || values.some(v => v !== null && !DIGITS.includes(v)) ||
    UNITS.some(unit => { const digits = unit.map(i => board[i]).filter(Boolean); return new Set(digits).size !== digits.length; })) return report('invalid');
  const candidates = board.map((v, i) => new Set<Digit>(v ? [] : DIGITS.filter(d => !PEERS[i].some(j => board[j] === d))));
  const has = (i: number, d: Digit) => candidates[i].has(d);
  const locations = (unit: number[], d: Digit) => unit.filter(i => has(i, d));
  const elimination = (technique: Technique, cells: number[], digits: Digit[], targets: number[], reason: string): LogicalStep | undefined => {
    const eliminations = targets.flatMap(cell => digits.filter(d => has(cell, d)).map(digit => ({ cell, digit })));
    return eliminations.length ? { technique, cells, digits, placements: [], eliminations, reason } : undefined;
  };
  function next(): LogicalStep | undefined {
    for (let cell = 0; cell < 81; cell++) {
      if (candidates[cell].size === 1) {
        const digit = [...candidates[cell]][0];
        return { technique: 'nakedSingle', cells: [cell], digits: [digit], placements: [{ cell, digit }], eliminations: [], reason: `${coord(cell)} 只剩候选 ${digit}` };
      }
    }
    for (const unit of UNITS) for (const digit of DIGITS) {
      const cells = locations(unit, digit);
      if (cells.length === 1) return { technique: 'hiddenSingle', cells, digits: [digit], placements: [{ cell: cells[0], digit }], eliminations: [], reason: `所在行、列或宫只有 ${coord(cells[0])} 能放 ${digit}` };
    }
    if (maxRank < 2) return;
    // Intersecting units: pointing (box -> line) and claiming (line -> box).
    for (let a = 0; a < 27; a++) for (let b = 0; b < 27; b++) {
      if ((a < 18) === (b < 18)) continue;
      for (const d of DIGITS) {
        const cells = locations(UNITS[a], d);
        if (cells.length < 2 || !cells.every(i => UNITS[b].includes(i))) continue;
        const step = elimination('lockedCandidates', cells, [d], UNITS[b].filter(i => !UNITS[a].includes(i)), `数字 ${d} 被限制在两个区域的交集，排除另一区域其余位置`);
        if (step) return step;
      }
    }
    if (maxRank < 3) return;
    for (const size of [2, 3]) for (const unit of UNITS) {
      const empty = unit.filter(i => candidates[i].size > 0);
      for (const cells of combinations(empty.filter(i => candidates[i].size <= size), size)) {
        const digits = [...new Set(cells.flatMap(i => [...candidates[i]]))];
        if (digits.length !== size) continue;
        const step = elimination(size === 2 ? 'nakedPair' : 'nakedTriple', cells, digits, empty.filter(i => !cells.includes(i)), `${cells.map(coord).join('、')} 的 ${size} 个格子只含 ${size} 个数字，排除同区域其余格的这些数字`);
        if (step) return step;
      }
      for (const digits of combinations(DIGITS.filter(d => locations(unit, d).length > 0), size)) {
        const cells = empty.filter(i => digits.some(d => has(i, d)));
        if (cells.length !== size) continue;
        const step = elimination(size === 2 ? 'hiddenPair' : 'hiddenTriple', cells, DIGITS.filter(d => !digits.includes(d)), cells, `数字 ${digits.join('、')} 只出现在 ${cells.map(coord).join('、')}，排除这些格的其他候选`);
        if (step) { step.digits = digits; return step; }
      }
    }
    if (maxRank < 4) return;
    for (const size of [2, 3]) for (const transpose of [false, true]) for (const d of DIGITS) {
      const lines = UNITS.slice(transpose ? 9 : 0, transpose ? 18 : 9);
      const cover = (i: number) => transpose ? Math.floor(i / 9) : i % 9;
      const base = (i: number) => transpose ? i % 9 : Math.floor(i / 9);
      const eligible = Array.from({ length: 9 }, (_, i) => i).filter(i => {
        const n = locations(lines[i], d).length; return n >= 2 && n <= size;
      });
      for (const selected of combinations(eligible, size)) {
        const cells = selected.flatMap(i => locations(lines[i], d));
        const covers = new Set(cells.map(cover));
        if (covers.size !== size) continue;
        const targets = Array.from({ length: 81 }, (_, i) => i).filter(i => !selected.includes(base(i)) && covers.has(cover(i)));
        const step = elimination(size === 2 ? 'xWing' : 'swordfish', cells, [d], targets, `${size} 个${transpose ? '列' : '行'}的 ${d} 限制在相同 ${size} 个${transpose ? '行' : '列'}，排除覆盖区域其余的 ${d}`);
        if (step) return step;
      }
    }
    for (let pivot = 0; pivot < 81; pivot++) {
      if (candidates[pivot].size !== 2) continue;
      const [x, y] = [...candidates[pivot]];
      const wings = PEERS[pivot].filter(i => candidates[i].size === 2);
      for (const a of wings.filter(i => has(i, x) && !has(i, y))) {
        const z = [...candidates[a]].find(d => d !== x)!;
        for (const b of wings.filter(i => has(i, y) && has(i, z))) {
          const targets = PEERS[a].filter(i => i !== pivot && i !== b && PEERS[b].includes(i));
          const step = elimination('xyWing', [pivot, a, b], [z], targets, `${coord(pivot)} 为 ${x}/${y} 枢轴，两翼 ${coord(a)}、${coord(b)} 至少一个为 ${z}，排除共同可见格的 ${z}`);
          if (step) return step;
        }
      }
    }
  }
  // Every successful step fills a cell or removes a candidate; at most 729 changes.
  while (true) {
    if (board.some((v, i) => v === null && candidates[i].size === 0) ||
      UNITS.some(unit => DIGITS.some(d => !unit.some(i => board[i] === d) && !unit.some(i => has(i, d))))) return report('invalid');
    if (board.every(v => v !== null)) return report('solved');
    const step = next();
    if (!step) return report('stalled');
    for (const { cell, digit } of step.placements) {
      board[cell] = digit; candidates[cell].clear();
      for (const peer of PEERS[cell]) candidates[peer].delete(digit);
    }
    for (const { cell, digit } of step.eliminations) candidates[cell].delete(digit);
    steps.push(step); counts[step.technique] = (counts[step.technique] ?? 0) + 1;
  }
}
