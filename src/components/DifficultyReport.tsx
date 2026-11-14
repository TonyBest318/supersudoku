import { TECHNIQUES, type LogicalReport, type Technique } from '../domain/logicalSolver';

const coord = (i: number) => `R${Math.floor(i / 9) + 1}C${i % 9 + 1}`;
export function DifficultyReport({ report, finished }: { report?: LogicalReport; finished: boolean }) {
  if (!report) return <section className="difficulty-report"><strong>旧题 · 尚未技巧评级</strong><p>当前进度已保留。开始新游戏后，会生成通过逻辑难度筛选的题目。</p></section>;
  return <section className="difficulty-report" aria-label="技巧评级" onKeyDown={event => event.stopPropagation()}>
    <strong>{report.status === 'solved' ? '逻辑可解 · 无需猜测' : '当前技巧库未能完整解出'}</strong>
    <p>本题解法使用的技巧（次数）：</p>
    <ul className="technique-list">{(Object.keys(TECHNIQUES) as Technique[]).filter(t => report.counts[t]).map(t =>
      <li key={t} className={TECHNIQUES[t].rank >= 4 ? 'advanced-technique' : ''}>{TECHNIQUES[t].label} <span>×{report.counts[t]}</span></li>)}</ul>
    <p>按固定的从易到难顺序评级；这是本应用的技巧标准，不等同于其他平台的 Extreme 评级。完整推理在本局结束后可查看。</p>
    {finished && <details><summary>查看完整推理 · {report.steps.length} 步</summary>
      <ol className="logical-steps">{report.steps.map((step, i) => <li key={i}>
        <strong>{TECHNIQUES[step.technique].label}</strong><p>{step.reason}</p>
        <p>{step.placements.map(c => `${coord(c.cell)} 填 ${c.digit}`).join('；')}
          {step.eliminations.length > 0 && `排除：${step.eliminations.map(c => `${coord(c.cell)} 的 ${c.digit}`).join('；')}`}</p>
      </li>)}</ol>
    </details>}
  </section>;
}
