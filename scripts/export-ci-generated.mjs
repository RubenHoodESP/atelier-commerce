// Transfer only generated lockfile + package manifests, never environment/config secrets.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const paths = ['package-lock.json', 'package.json', ...['apps', 'packages'].flatMap(area => readdirSync(area).map(name => `${area}/${name}/package.json`))];
const files = paths.map(path => ({ path, content: readFileSync(path, 'utf8') }));
const raw = Buffer.from(JSON.stringify(files));
const encoded = gzipSync(raw).toString('base64');
console.log('M1_GENERATED_SHA256 ' + createHash('sha256').update(raw).digest('hex'));
for (let i = 0; i < encoded.length; i += 3000) console.log('M1_GENERATED_CHUNK ' + encoded.slice(i, i + 3000));
console.log('M1_GENERATED_END');
