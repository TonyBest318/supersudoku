import { generatePuzzle } from '../domain/generator';
self.onmessage = () => {
  try {
    const puzzle = generatePuzzle(undefined, Math.random, progress => self.postMessage({ progress }));
    self.postMessage({ puzzle });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : '题目生成失败，请重试。' });
  }
};
