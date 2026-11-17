// Resolve support-tool ranges against the actual npm-generated lockfile.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const areas = ['', ...['apps', 'packages'].flatMap(area => readdirSync(area).map(name => `${area}/${name}`))];
for (const area of areas) {
  const path = area ? `${area}/package.json` : 'package.json';
  let manifest;
  try { manifest = JSON.parse(readFileSync(path, 'utf8')); } catch { continue; }
  for (const kind of ['dependencies', 'devDependencies']) {
    for (const [name, value] of Object.entries(manifest[kind] ?? {})) {
      if (!/^[~^]/.test(value)) continue;
      let location = area;
      let installed;
      while (true) {
        installed = lock.packages[`${location ? location + '/' : ''}node_modules/${name}`];
        if (installed || !location) break;
        location = location.split('/').slice(0, -1).join('/');
      }
      if (!installed?.version) throw new Error(`No installed version for ${path}: ${name}`);
      manifest[kind][name] = installed.version;
    }
  }
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}
