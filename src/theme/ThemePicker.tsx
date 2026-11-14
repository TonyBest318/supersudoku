import { useEffect, useState } from 'react';
import './themes.css';

const THEMES = [
  { id: 'blue', name: '晴空蓝', description: '清爽经典' },
  { id: 'forest', name: '森林绿', description: '柔和自然' },
  { id: 'paper', name: '暖纸棕', description: '纸上解题' },
  { id: 'violet', name: '暮色紫', description: '安静柔紫' },
  { id: 'night', name: '午夜深色', description: '深底冷蓝' },
] as const;
const STORAGE_KEY = 'super-sudoku.theme.v1';

export function ThemePicker() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return THEMES.find(item => item.id === saved)?.id ?? 'blue';
    } catch { return 'blue'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* Selection still works in memory. */ }
  }, [theme]);
  return <section className="theme-picker" aria-label="配色方案" onKeyDown={event => event.stopPropagation()}>
    <span className="theme-label">配色</span>
    <div className="theme-options">
      {THEMES.map(item => <button key={item.id} type="button" className="theme-option" data-theme={item.id}
        aria-pressed={theme === item.id} title={item.description} onClick={() => setTheme(item.id)}>
        <span className="theme-swatch" aria-hidden="true"><i /><i /><i /></span>
        <span>{item.name}</span><span className="theme-tick" aria-hidden="true">{theme === item.id ? '✓' : ''}</span>
      </button>)}
    </div>
  </section>;
}
