import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const areas = {
  planning: ['docs/PLAN.md', 'docs/STACK.md', 'docs/adr/0002-versions-and-alokai-access.md'],
  integration: ['docs/ARCHITECTURE.md', 'packages/contracts/openapi.json', 'apps/middleware/README.md', '.agents/skills/atelier-integration-review/SKILL.md'],
  frontend: ['docs/PLAN.md', 'apps/storefront/README.md', '.agents/skills/atelier-frontend-review/SKILL.md'],
  quality: ['docs/QUALITY.md', 'packages/contracts/examples.json', '.github/workflows/foundation.yml'],
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
