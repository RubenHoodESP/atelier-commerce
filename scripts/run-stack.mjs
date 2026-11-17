import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
const mode = process.argv[2];
if (!['dev', 'start'].includes(mode)) throw new Error('Choose dev or start.');
const require = createRequire(resolve(root, 'apps/storefront/package.json'));
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  process.exitCode = code;
}
function launch(args, cwd = root) {
  const child = spawn(process.execPath, args, { cwd, stdio: 'inherit', env: process.env });
  children.push(child);
  child.once('error', error => { console.error(error.message); stop(1); });
  child.once('exit', code => { if (!stopping) stop(code ?? 1); });
}
async function waitFor(url) {
  const deadline = Date.now() + 20000;
  // `stopping` changes in the signal/exit handlers while this loop awaits.
  // oxlint-disable-next-line no-unmodified-loop-condition
  while (Date.now() < deadline && !stopping) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; } catch {}
    await new Promise(done => setTimeout(done, 200));
  }
  throw new Error(`Service did not become ready: ${url}`);
}
process.once('SIGTERM', () => stop());
process.once('SIGINT', () => stop());
try {
  launch(['apps/mock-services/dist/index.js']);
  await waitFor(`http://127.0.0.1:${process.env.PROVIDER_PORT ?? 4100}/health`);
  launch(['apps/middleware/dist/index.js']);
  await waitFor(`http://127.0.0.1:${process.env.MIDDLEWARE_PORT ?? 4000}/healthz`);
  launch([require.resolve('next/dist/bin/next'), mode === 'dev' ? 'dev' : 'start', '--hostname', '127.0.0.1', '--port', process.env.PORT ?? '3000'], resolve(root, 'apps/storefront'));
} catch (error) { console.error(error.message); stop(1); }
