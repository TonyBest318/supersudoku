import { isGameDifficulty } from '../domain/difficulty';
import { generatePuzzle, GENERATION_CONFIG } from '../domain/generator';
self.onmessage = ({ data }) => {
  try {
    if (!isGameDifficulty(data?.difficulty)) throw new Error('难度参数无效');
    const puzzle = generatePuzzle({ ...GENERATION_CONFIG, difficulty: data.difficulty }, Math.random, progress => self.postMessage({ progress }));
    self.postMessage({ puzzle });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : '题目生成失败，请重试。' });
  }
};
