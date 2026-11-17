import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(resolve('.local/alokai-probe/package.json'));
for (const name of ['@vue-storefront/middleware', '@vue-storefront/sdk']) {
  const entry = require.resolve(name);
  const module = await import(pathToFileURL(entry));
  const pkgPath = require.resolve(`${name}/package.json`);
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  console.log('ALOKAI_MODULE', JSON.stringify({ name, version: pkg.version, keys: Object.keys(module), main: pkg.main, types: pkg.types, typings: pkg.typings }));
  const root = dirname(pkgPath);
  function inspect(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, e.name);
      if (e.isDirectory() && e.name !== 'node_modules') inspect(path);
      else if (e.name.endsWith('.d.ts')) {
        const text = readFileSync(path, 'utf8');
        if (/apiClientFactory|createServer|middlewareModule|initSDK|buildModule/.test(text)) {
          console.log('ALOKAI_TYPES', path.slice(root.length));
          console.log(text.slice(0, 24000));
        }
      }
    }
  }
  inspect(root);
}
