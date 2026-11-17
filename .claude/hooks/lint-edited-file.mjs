// Claude Code PostToolUse hook: lint the file Claude just edited.
// Exit 2 returns lint findings to Claude so it fixes them before continuing.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { relative, resolve } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const oxlint = resolve(root, 'node_modules/oxlint/bin/oxlint');

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const filePath = input.tool_input?.file_path ?? input.tool_response?.filePath;
if (typeof filePath !== 'string' || !/\.(?:[cm]?[jt]sx?)$/.test(filePath)) process.exit(0);

const target = resolve(root, filePath);
const path = relative(root, target);
if (path.startsWith('..') || !existsSync(target)) process.exit(0);
if (!existsSync(oxlint)) {
  console.error('oxlint is not installed; run `npm ci` to enable lint-on-edit.');
  process.exit(0);
}

const result = spawnSync(process.execPath, [oxlint, '--deny-warnings', path], { cwd: root, encoding: 'utf8' });
if (result.status === 0) process.exit(0);
console.error(`oxlint found problems in ${path}:\n${result.stdout}${result.stderr}`);
process.exit(2);
