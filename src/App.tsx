import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Board } from './components/Board';
import { DIGITS, type Digit } from './domain/types';
import { useGame } from './game/useGame';
import { SHORTCUTS } from './game/shortcuts';

function ToolIcon({ kind }: { kind: 'undo' | 'erase' | 'notes' }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'undo' ? <><path d="M12 6 6 12l6 6M6 12h11a9 9 0 1 1-8 13" /></> : kind === 'erase' ?
      <><path d="m12 25-7-7a3 3 0 0 1 0-4L17 3a3 3 0 0 1 4 0l7 7a3 3 0 0 1 0 4L17 25ZM12 8l12 12M12 25h17" /></> :
      <><path d="m5 22-1 7 7-2L28 10a3 3 0 0 0 0-4l-2-2a3 3 0 0 0-4 0ZM19 7l6 6M5 22l6 5M17 28h12" /></>}
  </svg>;
}

export function App() {
  const { state, dispatch, newGame, generating, error, storageError } = useGame();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => { mainRef.current?.focus({ preventScroll: true }); }, [state?.puzzle.id]);
  const playable = state?.status === 'playing' && !generating;
  const selectedCell = state?.cells[state.selected];
  const requestGame = () => {
    if (state?.status === 'playing' && !window.confirm('开始新游戏将替换当前进度，确定继续吗？')) return;
    newGame();
  };
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!state || generating || event.nativeEvent.isComposing || event.altKey ||
      (event.target instanceof HTMLElement && (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)))) return;
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
      event.preventDefault(); if (!event.repeat) dispatch({ type: 'undo' }); return;
    }
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    const moves: Record<string, number> = {
      arrowleft: state.selected % 9 > 0 ? -1 : 0,
      arrowright: state.selected % 9 < 8 ? 1 : 0,
      arrowup: state.selected >= 9 ? -9 : 0,
      arrowdown: state.selected < 72 ? 9 : 0,
    };
    if (key in moves) {
      event.preventDefault();
      const index = state.selected + moves[key];
      dispatch({ type: 'select', index });
      mainRef.current?.querySelector<HTMLButtonElement>(`[data-cell="${index}"]`)?.focus();
    } else if (/^[1-9]$/.test(key)) {
      event.preventDefault(); if (!event.repeat) dispatch({ type: 'input', digit: Number(key) as Digit });
    } else if (key === SHORTCUTS.notes.toLowerCase() && playable) {
      event.preventDefault(); if (!event.repeat) dispatch({ type: 'toggle-notes' });
    } else if (key === 'backspace' || key === 'delete') {
      event.preventDefault(); if (!event.repeat) dispatch({ type: 'erase' });
    }
  }
  return <main className="app" ref={mainRef} onKeyDown={onKeyDown} tabIndex={-1}>
    <header><a className="brand" href="./">Super Sudoku<span>专注每一步。</span></a><span className="local-label"><i /> 单机 · 本地保存</span></header>
    <div className="heading"><h1>Difficulty: <strong>Extreme</strong></h1><span>不计时，慢慢想。</span></div>
    {!state ? <section className="loading" aria-live="polite"><div className="loading-grid">▦</div><h2>{error || '正在生成你的数独…'}</h2><p>随机挖空，校验唯一解。</p>{error && <button className="new-game" onClick={newGame}>重新生成</button>}</section> :
      <div className="game-layout" aria-busy={generating}>
        <div className="board-wrap">
          <Board cells={state.cells} selected={state.selected} highlightedDigit={state.highlightedDigit}
            solution={state.puzzle.solution} onSelect={index => dispatch({ type: 'select', index })} />
          <div className="board-caption"><span>{state.notesMode ? '✎ 草稿模式' : '正式填数'} · 第 {Math.floor(state.selected / 9) + 1} 行，第 {state.selected % 9 + 1} 列</span><span>{state.cells.filter(c => c.value !== null).length} / 81</span></div>
        </div>
        <aside>
          <div className="stats"><div><span>Mistakes</span><strong className={state.mistakes ? 'mistake-count' : ''}>{state.mistakes}<small> / 3</small></strong></div><div><span>剩余机会</span><strong className="lives" aria-label={`剩余 ${3 - state.mistakes} 次机会`}>{[0, 1, 2].map(n => <span key={n} className={n < 3 - state.mistakes ? 'live' : ''}>◆</span>)}</strong></div></div>
          <div className="toolbar" aria-label="游戏操作">
            <button disabled={!playable || !state.history.length} onClick={() => dispatch({ type: 'undo' })} aria-label="回退" title={SHORTCUTS.undo}><span className="tool-icon"><ToolIcon kind="undo" /></span>回退<small>Ctrl / ⌘ Z</small></button>
            <button disabled={!playable || selectedCell?.given || (selectedCell?.value === null && !selectedCell.notes.length)} onClick={() => dispatch({ type: 'erase' })} aria-label="擦除" title={SHORTCUTS.erase}><span className="tool-icon"><ToolIcon kind="erase" /></span>擦除<small>⌫ / Delete</small></button>
            <button disabled={!playable} className={state.notesMode ? 'notes-active' : ''} aria-pressed={state.notesMode} onClick={() => dispatch({ type: 'toggle-notes' })} aria-label="草稿模式" title={SHORTCUTS.notes}><span className="tool-icon"><ToolIcon kind="notes" /><b className="mode-badge">{state.notesMode ? 'ON' : 'OFF'}</b></span>草稿<small>{SHORTCUTS.notes}</small></button>
          </div>
          <div className="keypad" aria-label="输入数字">
            {DIGITS.map(digit => <button key={digit} disabled={!playable} className={digit === state.highlightedDigit ? 'active' : ''}
              aria-label={`输入 ${digit}`} onClick={() => dispatch({ type: 'input', digit })}>{digit}</button>)}
          </div>
          <button className="new-game" disabled={generating} onClick={requestGame}>{generating ? '正在生成…' : 'New Game'}</button>
          <div aria-live="polite" aria-atomic="true">
            {state.status !== 'playing' ? <div className={`result ${state.status}`}><strong>{state.status === 'completed' ? '漂亮，解开了！' : '本局结束'}</strong><p>{state.status === 'completed' ? '每一步推理，都有答案。再来一局？' : '已累计三次错误。开始新的一局，再试一次。'}</p></div> :
              <p className="preview-help">{state.mistakes ? `已累计 ${state.mistakes} 次错误。` : ''}填错三次结束。选中数字时，全盘同数字及草稿一起高亮。</p>}
            {error && <p className="error" role="alert">{error}</p>}
            {storageError && <p className="error">浏览器无法保存进度；本局仍可继续，刷新后可能丢失。</p>}
          </div>
        </aside>
      </div>}
    <footer><span>1–9 填数 · ↑ ↓ ← → 移动 · {SHORTCUTS.notes} 草稿</span><span>Delete 擦除 · Ctrl / ⌘ Z 回退</span></footer>
  </main>;
}
