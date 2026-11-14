import { generatePuzzle } from '../domain/generator';
self.onmessage = () => {
  try { self.postMessage({ puzzle: generatePuzzle() }); }
  catch { self.postMessage({ error: '题目生成失败，请重试。' }); }
};
