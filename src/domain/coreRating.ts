import { DIFFICULTIES, type GameDifficulty } from './difficulty';
import { solve as coreSolve, TACTICS, STRATEGY, type Difficulty } from 'sudoku-core';
import type { LogicalReport, LogicalStep } from './logicalSolver';
import type { Digit, Value } from './types';

export const CORE_ENGINE = 'sudoku-core@4.1.1' as const;
// Applied to both modes. Reject the whole puzzle, never hide a required step.
export const BANNED_TECHNIQUES: ReadonlySet<string> = new Set([STRATEGY.WXYZ_WING]);
export const CORE_TACTICS = new Map(TACTICS.map(t => [t.title as string, t]));
export interface CoreReport extends Omit<LogicalReport, 'version' | 'steps' | 'counts'> {
  version: 2;
  engine: typeof CORE_ENGINE;
  difficulty: Difficulty;
  hardestTechnique: string;
  counts: Record<string, number>;
  steps: (Omit<LogicalStep, 'technique'> & { technique: string })[];
}
const explanations: Record<string, string> = {
  'Jellyfish Strategy': '四个基行（列）的候选被限制在四个覆盖列（行），消除覆盖区域其余位置。',
  'Finned Swordfish Strategy': '带鳍三阶鱼：利用鱼形与鳍的互斥可能，排除共同限制位置。',
  'Finned Jellyfish Strategy': '带鳍四阶鱼：利用鱼形与鳍的互斥可能，排除共同限制位置。',
  'BUG+1 Strategy': '基于题目唯一解和 BUG+1 候选分布，额外候选必须成立。',
  'X-Chain Strategy': '同一数字的强弱关系交替成链，至少一个端点成立，排除同时看见两端的候选。',
  'XY-Chain Strategy': '双值格串联传递推理，至少一个端点为目标数字，排除同时看见两端的候选。',
};
const labels: Record<string, string> = {
  'Open Singles Strategy': '区域最后一格',
  'Single Candidate Strategy': '隐性单数',
  'Visual Elimination Strategy': '显性单数',
  'Pointing Elimination Strategy': '区块排除',
  'Naked Pair Strategy': '显性数对',
  'Hidden Pair Strategy': '隐性数对',
  'Hidden Groups Strategy': '隐性数组',
  'Naked Triplet Strategy': '显性三数组',
  'Hidden Triple Strategy': '隐性三数组',
  'Naked Quadruple Strategy': '显性四数组',
  'Hidden Quad Strategy': '隐性四数组',
};
export const coreTechniqueLabel = (title: string) => labels[title] ?? title.replace(/ Strategy$/, '');
const coord = (i: number) => `R${Math.floor(i / 9) + 1}C${i % 9 + 1}`;

export function analyzeCorePuzzle(givens: readonly Value[]): CoreReport {
  const result = coreSolve([...givens]);
  if (!result.solved || result.errorCode || !result.board || !result.steps || !result.analysis?.difficulty) {
    throw new Error('题目未通过 sudoku-core 逻辑评级');
  }
  const counts: Record<string, number> = {};
  const steps = result.steps.map(step => {
    counts[step.strategy] = (counts[step.strategy] ?? 0) + 1;
    const cells = step.patternCells ?? [];
    return {
      technique: step.strategy, cells, digits: (step.patternDigits ?? []) as Digit[],
      placements: step.updates.filter(u => u.filledValue !== undefined).map(u => ({ cell: u.index, digit: u.filledValue as Digit })),
      eliminations: step.updates.filter(u => u.eliminatedCandidate !== undefined).map(u => ({ cell: u.index, digit: u.eliminatedCandidate as Digit })),
      reason: [explanations[step.strategy] ?? coreTechniqueLabel(step.strategy), cells.length ? `模式位置：${cells.map(coord).join('、')}` : ''].filter(Boolean).join(' '),
    };
  });
  return {
    version: 2, engine: CORE_ENGINE, difficulty: result.analysis.difficulty, status: 'solved',
    board: result.board as Value[], steps, counts,
    hardestRank: result.analysis.hardestRank ?? 0, hardestTechnique: result.analysis.hardestTechnique ?? '',
  };
}

/** Require the selected level and reject techniques above its ceiling. */
export function isDifficultyReport(report: CoreReport, difficulty: GameDifficulty): boolean {
  const { level, maxTechniqueRank } = DIFFICULTIES[difficulty];
  return report.status === 'solved' && report.difficulty === level && report.steps.length > 0 &&
    report.steps.every(step => { const tactic = CORE_TACTICS.get(step.technique); return tactic !== undefined && tactic.rank < maxTechniqueRank && !BANNED_TECHNIQUES.has(step.technique); });
}
