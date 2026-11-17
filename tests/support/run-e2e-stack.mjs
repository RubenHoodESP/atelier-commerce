// Isolated test harness: production Next + real BFF + controllable HTTP provider.
// Fault controls exist only in this test process, never in the application.
import express from 'express';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createMiddlewareServer } from '../../apps/middleware/dist/server.js';
import { createProviderApp } from '../../apps/mock-services/dist/app.js';
const require = createRequire(new URL('../../apps/storefront/package.json', import.meta.url));
let state = {};
const provider = express();
provider.use(async (req, res, next) => {
  if (req.path === '/content/brand' && state.contentFail) { res.status(503).end(); return; }
  if (req.path === '/products') {
    if (state.catalogDelay) await new Promise(resolve => setTimeout(resolve, state.catalogDelay));
    if (state.catalogFail) { res.status(503).end(); return; }
    if (state.empty) { res.json({ items: [], count: 0 }); return; }
  }
  next();
});
provider.use(createProviderApp());
const control = express(); control.use(express.json());
control.post('/state', (req, res) => { state = req.body; res.json({ ok: true }); });
const services = [createServer(provider), createMiddlewareServer({ providerUrl: 'http://127.0.0.1:4100', timeoutMs: 1500 }), createServer(control)];
for (const [index, server] of services.entries()) await new Promise(resolve => server.listen([4100, 4000, 4199][index], '127.0.0.1', resolve));
const next = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3000'], {
  cwd: new URL('../../apps/storefront/', import.meta.url), stdio: 'inherit', env: process.env,
});
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true; next.kill('SIGTERM');
  for (const server of services) { server.closeAllConnections(); server.close(); }
  process.exitCode = code;
}
next.on('exit', code => stop(code ?? 1));
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
