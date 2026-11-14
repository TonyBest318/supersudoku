import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameAction, GameState } from '../domain/types';
import { parseSavedGame, SAVE_KEY } from '../storage/localStorage';
import { createGame, gameReducer } from './reducer';

export function useGame() {
  const [state, setState] = useState<GameState | null>(() => {
    try { const raw = localStorage.getItem(SAVE_KEY); return raw ? parseSavedGame(raw) : null; } catch { return null; }
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState(false);
  const worker = useRef<Worker | null>(null);
  const newGame = useCallback(() => {
    worker.current?.terminate();
    setGenerating(true); setError('');
    try {
      const task = new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' });
      worker.current = task;
      task.onmessage = ({ data }) => {
        if (data.puzzle) setState(createGame(data.puzzle)); else setError(data.error);
        setGenerating(false); task.terminate(); worker.current = null;
      };
      task.onerror = () => { setError('题目生成失败，请重试。'); setGenerating(false); task.terminate(); worker.current = null; };
      task.postMessage(null);
    } catch { setGenerating(false); setError('无法启动题目生成器，请刷新重试。'); }
  }, []);
  useEffect(() => {
    if (!state) newGame();
    return () => worker.current?.terminate();
    // Initial generation only; StrictMode cleanup cancels the first worker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!state) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 1, savedAt: new Date().toISOString(), state })); setStorageError(false); }
    catch { setStorageError(true); }
  }, [state]);
  const dispatch = useCallback((action: GameAction) => {
    if (!generating) setState(current => current ? gameReducer(current, action) : current);
  }, [generating]);
  return { state, dispatch, newGame, generating, error, storageError };
}
