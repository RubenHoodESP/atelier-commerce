import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname, resolve, relative } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const excluded = new Set(['.git', 'node_modules', '.next', 'dist', 'coverage', '.local']);
function walk(directory) {
  return readdirSync(directory).flatMap(name => {
    if (excluded.has(name)) return [];
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
const files = walk(root);
const read = path => readFileSync(join(root, path), 'utf8');
const json = path => JSON.parse(read(path));
const errors = [];
function check(label, operation) {
  try { operation(); } catch (error) { errors.push(`${label}: ${error.message}`); }
}

for (const path of files) {
  const short = relative(root, path);
  if (path.endsWith('.json')) check(short, () => JSON.parse(readFileSync(path, 'utf8')));
  if (!path.endsWith('.md')) continue;
  const text = readFileSync(path, 'utf8');
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    check(`${short} link ${target}`, () => {
      const destination = resolve(dirname(path), decodeURIComponent(target.split('#')[0]));
      assert.ok(destination.startsWith(root) || destination === root.slice(0, -1), 'link escapes repository');
      assert.ok(existsSync(destination), 'missing local link target');
    });
  }
}

check('runtime pins', () => {
  assert.equal(read('.nvmrc').trim(), '22.23.5');
  assert.equal(read('.node-version').trim(), read('.nvmrc').trim());
});
check('public integration dependencies', () => {
  const lock = json('package-lock.json');
  for (const [path, entry] of Object.entries(lock.packages)) {
    assert.ok(!/node_modules\/@(?:alokai|vue-storefront)\//.test(path), 'retired integration dependency remains');
    if (entry.resolved?.startsWith('https:')) assert.equal(new URL(entry.resolved).hostname, 'registry.npmjs.org');
  }
});
check('research provenance', () => {
  const record = json('docs/stack-research.json');
  assert.match(record.checkedOn, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(typeof record.compatibilityValidated, 'boolean');
  if (record.compatibilityValidated) {
    assert.ok(existsSync(join(root, 'package-lock.json')), 'validated stack needs its generated lockfile');
    assert.equal(new URL(record.validationRun).hostname, 'github.com');
    const lock = json('package-lock.json');
    for (const item of record.packages.filter(item => item.installed)) {
      assert.equal(lock.packages[`node_modules/${item.name}`]?.version, item.installed);
    }
  }
  for (const item of record.packages) {
    assert.match(item.candidate, /^\d+\.\d+\.\d+$/);
    assert.equal(new URL(item.source).protocol, 'https:');
    assert.ok(item.evidence);
  }
});
check('provider contract references and boundaries', () => {
  const spec = json('packages/contracts/openapi.json');
  assert.equal(spec.openapi, '3.1.0');
  function inspect(value) {
    if (!value || typeof value !== 'object') return;
    if ('$ref' in value) {
      assert.ok(value.$ref.startsWith('#/'), 'foundation uses only internal references');
      let target = spec;
      for (const part of value.$ref.slice(2).split('/')) target = target?.[part.replace(/~1/g, '/').replace(/~0/g, '~')];
      assert.ok(target, `unresolved reference ${value.$ref}`);
    }
    Object.values(value).forEach(inspect);
  }
  inspect(spec);
  assert.deepEqual(Object.keys(spec.components.schemas.OrderInput.properties), ['items']);
  assert.deepEqual(Object.keys(spec.components.schemas.OrderItemInput.properties).sort(), ['productId', 'quantity']);
  assert.equal(spec.components.schemas.OrderInput.additionalProperties, false);
  assert.equal(spec.components.schemas.OrderItemInput.additionalProperties, false);
  assert.equal(spec.components.schemas.Money.properties.amountMinor.type, 'integer');
  assert.ok(spec.paths['/orders'].post.parameters.some(p => p.name === 'Idempotency-Key' && p.required));
});
check('example business consistency', () => {
  const example = json('packages/contracts/examples.json');
  const amount = example.product.price.amountMinor;
  assert.ok(Number.isSafeInteger(amount) && amount >= 0);
  for (const item of example.orderInput.items) {
    assert.equal(item.productId, example.product.id);
    assert.ok(Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 20);
    assert.ok(item.quantity <= example.product.stock);
  }
  assert.equal(example.order.total.amountMinor, example.order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice.amountMinor, 0));
  assert.equal(example.order.total.currency, 'EUR');
});
check('project skills', () => {
  const skillRoot = join(root, '.agents/skills');
  const skills = readdirSync(skillRoot).filter(name => statSync(join(skillRoot, name)).isDirectory());
  assert.equal(skills.length, 3);
  for (const name of skills) {
    const text = readFileSync(join(skillRoot, name, 'SKILL.md'), 'utf8');
    const match = text.match(/^---\r?\nname: ([a-z0-9-]+)\r?\ndescription: ([^\r\n]+)\r?\n---\r?\n([\s\S]+)$/);
    assert.ok(match, `${name}: frontmatter/name/description`);
    assert.equal(match[1], name);
    assert.ok(match[3].trim().split(/\s+/).length <= 300, `${name}: keep body <=300 words`);
    assert.ok(!/\bTODO\b|\[INSERT|\[REPLACE/.test(text), `${name}: unfinished scaffold`);
    const ui = readFileSync(join(skillRoot, name, 'agents/openai.yaml'), 'utf8');
    assert.ok(ui.includes(`$${name}`), `${name}: invocation metadata`);
  }
});

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Foundation OK: ${files.length} files; JSON, local links, internal contract refs, example invariants and 3 project skills.`);
  console.log('Scope: structural checks only; no runtime build, full schema validation, application tests or security scans.');
}
