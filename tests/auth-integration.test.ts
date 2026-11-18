import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { spawn } from 'node:child_process';
import { createCommerceClient } from '@atelier/contracts/client';
import { createProviderApp } from '../apps/mock-services/dist/app.js';
import { createMiddlewareServer } from '../apps/middleware/dist/server.js';

const TOKEN = 'test-token-0123456789-abcdefghijklmnop';
const servers: Server[] = [];
async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP listener.');
  return `http://127.0.0.1:${address.port}`;
}
async function bff(apiToken?: string) {
  const providerUrl = await listen(createServer(createProviderApp()));
  return listen(createMiddlewareServer({ providerUrl, timeoutMs: 500, apiToken }));
}
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); })));
});

describe('BFF shared-token authentication', () => {
  it('rejects /api requests without a token or with a wrong one, with a safe 401 envelope', async () => {
    const base = await bff(TOKEN);
    for (const headers of [{}, { Authorization: 'Bearer wrong' }, { Authorization: TOKEN }, { Authorization: `Basic ${TOKEN}` }]) {
      const response = await fetch(`${base}/api/products`, { headers });
      expect(response.status).toBe(401);
      const body: unknown = await response.json();
      expect(body).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      expect(JSON.stringify(body)).not.toContain(TOKEN);
      expect(response.headers.get('x-request-id')).toBeTruthy();
    }
  });

  it('accepts the typed client configured with the token and keeps the health check open', async () => {
    const base = await bff(TOKEN);
    expect(await createCommerceClient({ baseUrl: `${base}/api`, apiToken: TOKEN }).getProduct({ id: 'watch-001' }))
      .toMatchObject({ ok: true, product: { id: 'watch-001' } });
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
  });

  it('maps a missing token to a typed UNAUTHORIZED failure in the client', async () => {
    const base = await bff(TOKEN);
    expect(await createCommerceClient({ baseUrl: `${base}/api` }).getProducts())
      .toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('requires no token when none is configured (local development and tests)', async () => {
    const base = await bff();
    expect((await fetch(`${base}/api/products/watch-001`)).status).toBe(200);
  });

  it('refuses tokens shorter than 32 characters', () => {
    expect(() => createMiddlewareServer({ providerUrl: 'http://127.0.0.1:1', timeoutMs: 500, apiToken: 'short' })).toThrow(/32 characters/);
  });
});

describe('production backend entry (scripts/serve-backend.mjs)', () => {
  function run(env: Record<string, string>) {
    return spawn(process.execPath, ['scripts/serve-backend.mjs'], { env: { ...process.env, BFF_API_TOKEN: '', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  }

  it('refuses to start in production without a token', async () => {
    const child = run({ NODE_ENV: 'production' });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += String(chunk); });
    const code = await new Promise<number | null>(resolve => child.once('exit', resolve));
    expect(code).toBe(1);
    expect(stderr).toContain('BFF_API_TOKEN is required');
  });

  it('serves the authenticated BFF and keeps the provider on loopback only', async () => {
    const port = 46000 + Math.floor(Math.random() * 1000);
    const child = run({ NODE_ENV: 'production', BFF_API_TOKEN: TOKEN, PORT: String(port), HOST: '127.0.0.1', PROVIDER_PORT: String(port + 1) });
    try {
      await new Promise<void>((resolve, reject) => {
        child.stdout.on('data', chunk => { if (String(chunk).includes('Backend ready')) resolve(); });
        child.once('exit', code => reject(new Error(`exited with ${code}`)));
      });
      expect((await fetch(`http://127.0.0.1:${port}/healthz`)).status).toBe(200);
      expect((await fetch(`http://127.0.0.1:${port}/api/products`)).status).toBe(401);
      const client = createCommerceClient({ baseUrl: `http://127.0.0.1:${port}/api`, apiToken: TOKEN });
      expect(await client.getProducts()).toMatchObject({ ok: true, total: 12 });
    } finally {
      child.kill('SIGTERM');
    }
  });
});
