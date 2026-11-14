import { defineConfig } from 'vite';

// GitHub project Pages uses /supersudoku/; other hosts stay at the origin root.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
});
