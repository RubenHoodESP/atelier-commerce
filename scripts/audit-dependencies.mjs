// Dependency audit gate used by CI (npm run audit). Needs registry access: if npm audit
// cannot produce a report, the gate fails instead of reporting a pass.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { evaluate } from './audit-policy.mjs';

function audit(args) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, ['audit', '--json', ...args], { encoding: 'utf8', shell: process.platform === 'win32' });
  try {
    const report = JSON.parse(result.stdout);
    if (report.error) throw new Error(report.error.summary ?? 'npm audit error');
    return report;
  } catch (error) {
    const reason = error.message || result.stderr.trim().split('\n')[0] || `exit code ${result.status}`;
    console.error(`npm audit ${args.join(' ') || '(all dependencies)'} did not produce a report: ${reason}`);
    return null;
  }
}

const policy = JSON.parse(readFileSync(new URL('../docs/security/accepted-risks.json', import.meta.url), 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const production = audit(['--omit=dev']);
const full = audit([]);
if (!production || !full) {
  console.error('Dependency audit failed: no report, so nothing can be reported as passing.');
  process.exit(1);
}
const { ok, errors, notes } = evaluate({ production, full, policy, today });
for (const note of notes) console.log(`note: ${note}`);
for (const error of errors) console.error(`error: ${error}`);
console.log(ok ? `Dependency audit OK (${today}).` : 'Dependency audit failed.');
process.exitCode = ok ? 0 : 1;
