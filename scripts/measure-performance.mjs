// Lab performance measurement with a pinned Lighthouse, run on demand (not in CI).
// Usage: npm run build && npm start   (in another terminal)   then   npm run perf -- [runs]
// Lighthouse is fetched with npx at a fixed version instead of being a repository dependency.
// Defaults: Lighthouse mobile preset (simulated throttling: slow 4G, 4x CPU slowdown).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const LIGHTHOUSE = 'lighthouse@13.6.0';
const BASE_URL = process.env.PERF_BASE_URL ?? 'http://127.0.0.1:3000';
const ROUTES = ['/', '/products', '/products/watch-001', '/cart'];
const RUNS = Number(process.argv[2] ?? 3);
const METRICS = {
  score: report => Math.round(report.categories.performance.score * 100),
  fcp: report => report.audits['first-contentful-paint'].numericValue,
  lcp: report => report.audits['largest-contentful-paint'].numericValue,
  tbt: report => report.audits['total-blocking-time'].numericValue,
  cls: report => report.audits['cumulative-layout-shift'].numericValue,
  si: report => report.audits['speed-index'].numericValue,
};
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

if (!Number.isInteger(RUNS) || RUNS < 1 || RUNS > 15) throw new Error('runs must be an integer from 1 to 15');
const dir = mkdtempSync(join(tmpdir(), 'atelier-perf-'));
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const rows = [];
let environment = null;
try {
  for (const route of ROUTES) {
    const samples = [];
    for (let run = 0; run < RUNS; run += 1) {
      const output = join(dir, `run-${samples.length}.json`);
      const result = spawnSync(npx, ['--yes', LIGHTHOUSE, BASE_URL + route, '--only-categories=performance',
        '--output=json', `--output-path=${output}`, '--quiet', '--chrome-flags=--headless=new --no-sandbox'],
      { encoding: 'utf8', shell: process.platform === 'win32' });
      if (result.status !== 0) throw new Error(`Lighthouse failed for ${route}: ${result.stderr.trim().split('\n').pop()}`);
      const report = JSON.parse(readFileSync(output, 'utf8'));
      environment ??= { lighthouse: report.lighthouseVersion, userAgent: report.environment.hostUserAgent,
        formFactor: report.configSettings.formFactor, throttling: report.configSettings.throttling,
        method: report.configSettings.throttlingMethod, benchmarkIndex: report.environment.benchmarkIndex };
      samples.push(Object.fromEntries(Object.entries(METRICS).map(([name, read]) => [name, read(report)])));
    }
    rows.push({ route, ...Object.fromEntries(Object.keys(METRICS).map(name => [name, median(samples.map(sample => sample[name]))])) });
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`Lighthouse ${environment.lighthouse}, ${environment.formFactor}, ${environment.method} throttling `
  + `(RTT ${environment.throttling.rttMs} ms, ${environment.throttling.throughputKbps} kbps, CPU x${environment.throttling.cpuSlowdownMultiplier}), `
  + `benchmarkIndex ${environment.benchmarkIndex}, median of ${RUNS} runs, ${new Date().toISOString().slice(0, 10)}`);
console.log(`Browser: ${environment.userAgent}\n`);
console.log('| Route | Score | FCP | LCP | TBT | CLS | Speed Index |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const row of rows) {
  console.log(`| \`${row.route}\` | ${row.score} | ${(row.fcp / 1000).toFixed(2)} s | ${(row.lcp / 1000).toFixed(2)} s | `
    + `${Math.round(row.tbt)} ms | ${row.cls.toFixed(3)} | ${(row.si / 1000).toFixed(2)} s |`);
}
