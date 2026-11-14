import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env, VITE_BASE_PATH: '/supersudoku/' };
const run = (command, args, cwd = root) =>
  execFileSync(command, args, { cwd, env, stdio: 'inherit' });
const git = (args, cwd = root) =>
  execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();

if (git(['status', '--porcelain'])) {
  throw new Error('Commit or stash source changes before publishing.');
}
const remote = git(['remote', 'get-url', '--push', 'origin']);
const source = git(['rev-parse', 'HEAD']);
const name = git(['config', 'user.name']);
const email = git(['config', 'user.email']);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
run(npm, ['test']);
run(npm, ['run', 'build']);
run(process.execPath, ['scripts/test-pwa.mjs']);

// An isolated repository keeps the source branch and working tree untouched.
const staging = mkdtempSync(join(tmpdir(), 'super-sudoku-pages-'));
try {
  run('git', ['init', '--initial-branch=gh-pages', staging]);
  run('git', ['remote', 'add', 'origin', remote], staging);
  run('git', ['config', 'user.name', name], staging);
  run('git', ['config', 'user.email', email], staging);
  if (git(['ls-remote', '--heads', 'origin', 'refs/heads/gh-pages'], staging)) {
    run('git', ['fetch', '--depth=1', 'origin', 'gh-pages'], staging);
    run('git', ['checkout', '-B', 'gh-pages', 'FETCH_HEAD'], staging);
  }
  for (const entry of readdirSync(staging)) {
    if (entry !== '.git') rmSync(join(staging, entry), { recursive: true, force: true });
  }
  cpSync(join(root, 'dist'), staging, { recursive: true });
  writeFileSync(join(staging, '.nojekyll'), '');
  run('git', ['add', '--all'], staging);
  if (!git(['status', '--porcelain'], staging)) {
    console.log('GitHub Pages already contains this build.');
  } else {
    run('git', ['commit', '-m', `Deploy Sudoku from ${source}`], staging);
    // A concurrent deployment is rejected rather than overwritten.
    run('git', ['push', 'origin', 'HEAD:refs/heads/gh-pages'], staging);
  }
} finally {
  rmSync(staging, { recursive: true, force: true });
}
console.log('Pages source: gh-pages / (root). https://tonybest318.github.io/supersudoku/');
