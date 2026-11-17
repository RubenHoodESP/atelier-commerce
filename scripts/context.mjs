import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const areas = {
  planning: ['docs/PLAN.md', 'docs/STACK.md', 'docs/adr/0002-version-selection.md'],
  integration: ['docs/adr/0003-express-bff.md', 'apps/middleware/src/product.ts', 'packages/contracts/src/index.ts', 'tests/product-integration.test.ts', '.agents/skills/atelier-integration-review/SKILL.md'],
  frontend: ['docs/PLAN.md', 'apps/storefront/README.md', '.agents/skills/atelier-frontend-review/SKILL.md'],
  quality: ['docs/QUALITY.md', 'tests/product-integration.test.ts', 'tests/e2e/product.spec.ts', '.github/workflows/m1.yml'],
};
const area = process.argv[2] ?? 'planning';
if (!Object.hasOwn(areas, area)) {
  console.error(`Unknown area. Choose: ${Object.keys(areas).join(', ')}`);
  process.exitCode = 1;
} else {
  const status = readFileSync(join(root, 'docs/STATUS.md'), 'utf8');
  console.log(status);
  console.log(`\nRelevant paths for ${area} (read only what this task needs):`);
  for (const path of areas[area]) {
    if (!existsSync(join(root, path))) throw new Error(`Missing context path: ${path}`);
    console.log(`- ${path}`);
  }
  console.log('\nStart with AGENTS.md. Reuse dated evidence; do not load all documents or skills.');
}
