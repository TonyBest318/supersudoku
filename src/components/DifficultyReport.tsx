import { coreTechniqueLabel, type CoreReport } from '../domain/coreRating';
import { TECHNIQUES, type LogicalReport, type Technique } from '../domain/logicalSolver';

const coord = (i: number) => `R${Math.floor(i / 9) + 1}C${i % 9 + 1}`;
export function DifficultyReport({ report, finished }: { report?: LogicalReport | CoreReport; finished: boolean }) {
  if (!report) return <section className="difficulty-report"><strong>旧题 · 尚未技巧评级</strong><p>当前进度已保留。开始新游戏后，会生成通过逻辑难度筛选的题目。</p></section>;
  const label = (t: string) => report.version === 2 ? coreTechniqueLabel(t) : TECHNIQUES[t as Technique].label;
  const advanced = (t: string) => report.version === 2 ? t === report.hardestTechnique : TECHNIQUES[t as Technique].rank >= 4;
  return <section className="difficulty-report" aria-label="技巧评级" onKeyDown={event => event.stopPropagation()}>
    {report.version === 2 && <p><strong>{report.difficulty} · sudoku-core</strong></p>}
    <strong>{report.status === 'solved' ? '逻辑可解 · 无需猜测' : '当前技巧库未能完整解出'}</strong>
    <p>本题解法使用的技巧（次数）：</p>
    <ul className="technique-list">{Object.entries(report.counts).map(([t, count]) =>
      <li key={t} className={advanced(t) ? 'advanced-technique' : ''}>{label(t)} <span>×{count}</span></li>)}</ul>
    <p>{report.version === 2 ? '使用 sudoku-core 4.1.1 正式评级。等级综合最高技巧与解题工作量，不等同于 sudoku.com 的评级。' : '旧题沿用本应用原有技巧评级，未标为 L9；开始新游戏将应用新标准。'}完整推理在本局结束后可查看。</p>
    {finished && <details><summary>查看完整推理 · {report.steps.length} 步</summary>
      <ol className="logical-steps">{report.steps.map((step, i) => <li key={i}>
        <strong>{label(step.technique)}</strong><p>{step.reason}</p>
        <p>{step.placements.map(c => `${coord(c.cell)} 填 ${c.digit}`).join('；')}
          {step.eliminations.length > 0 && `排除：${step.eliminations.map(c => `${coord(c.cell)} 的 ${c.digit}`).join('；')}`}</p>
      </li>)}</ol>
    </details>}
  </section>;
}
