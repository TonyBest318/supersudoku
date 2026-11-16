import { useCallback, useEffect, useRef, useState } from 'react';
import type { GenerationProgress } from '../domain/generator';
import type { GameAction, GameState } from '../domain/types';
import { parseSavedGame, SAVE_KEY } from '../storage/localStorage';
import { createGame, gameReducer } from './reducer';

export function useGame() {
  const [state, setState] = useState<GameState | null>(() => {
    try { const raw = localStorage.getItem(SAVE_KEY); return raw ? parseSavedGame(raw) : null; } catch { return null; }
  });
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState(false);
  const worker = useRef<Worker | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopWorker = useCallback(() => {
    clearTimeout(watchdog.current);
    worker.current?.terminate();
    worker.current = null;
  }, []);
  const newGame = useCallback(() => {
    stopWorker();
    setGenerating(true); setProgress(null); setError('');
    try {
      const task = new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' });
      worker.current = task;
      watchdog.current = setTimeout(() => {
        stopWorker(); setGenerating(false); setError('L9 生成超时，请重新生成。当前进度已保留。');
      }, 25000);
      task.onmessage = ({ data }) => {
        if (worker.current !== task) return;
        if (data.progress) { setProgress(data.progress); return; }
        if (data.puzzle) setState(createGame(data.puzzle)); else setError(data.error);
        setGenerating(false); stopWorker();
      };
      task.onerror = () => { setError('题目生成失败，请重试。'); setGenerating(false); stopWorker(); };
      task.postMessage(null);
    } catch { stopWorker(); setGenerating(false); setError('无法启动题目生成器，请刷新重试。'); }
  }, [stopWorker]);
  useEffect(() => {
    if (!state) newGame();
    return stopWorker;
    // Initial generation only; StrictMode cleanup cancels the first worker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopWorker]);
  useEffect(() => {
    if (!state) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 1, savedAt: new Date().toISOString(), state })); setStorageError(false); }
    catch { setStorageError(true); }
  }, [state]);
  const dispatch = useCallback((action: GameAction) => {
    if (!generating) setState(current => current ? gameReducer(current, action) : current);
  }, [generating]);
  return { state, dispatch, newGame, generating, progress, error, storageError };
}
