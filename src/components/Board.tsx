import { DIGITS, type Cell, type Value, type Digit } from '../domain/types';
import { isPeer } from '../domain/board';

interface Props {
  cells: readonly Cell[];
  selected: number;
  highlightedDigit: Value;
  solution: readonly Digit[];
  onSelect: (index: number) => void;
}

export function Board({ cells, selected, highlightedDigit, solution, onSelect }: Props) {
  return <div className="board" role="group" aria-label="数独棋盘">
    {cells.map((cell, index) => {
      const wrong = cell.value !== null && cell.value !== solution[index];
      const classes = ['cell', cell.given ? 'given' : 'entered', wrong ? 'wrong' : '',
        isPeer(index, selected) ? 'peer' : '',
        cell.value !== null && cell.value === highlightedDigit ? 'matching' : '',
        index === selected ? 'selected' : '',
        index % 9 === 2 || index % 9 === 5 ? 'box-right' : '',
        Math.floor(index / 9) === 2 || Math.floor(index / 9) === 5 ? 'box-bottom' : '',
      ].filter(Boolean).join(' ');
      return <button key={index} data-cell={index} tabIndex={selected === index ? 0 : -1} className={classes} onClick={() => onSelect(index)}
        aria-pressed={index === selected} aria-invalid={wrong}
        aria-label={`第 ${Math.floor(index / 9) + 1} 行第 ${index % 9 + 1} 列，${cell.value ?? `草稿 ${cell.notes.join('、') || '空'}`}${cell.given ? '，已知数' : ''}${wrong ? '，错误' : ''}`}>
        {cell.value ?? <span className="notes" aria-hidden="true">
          {DIGITS.map(digit => <span key={digit} className={cell.notes.includes(digit) && digit === highlightedDigit ? 'note highlighted' : 'note'}>
            {cell.notes.includes(digit) ? digit : ''}
          </span>)}
        </span>}
      </button>;
    })}
  </div>;
}
