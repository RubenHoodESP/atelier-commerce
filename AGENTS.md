# Project working agreement

## Read selectively

Start with `docs/STATUS.md`; use `node scripts/context.mjs <area>` to identify the next files. Read only the relevant document sections and source files. Research versions again only when dependencies change or a compatibility question remains open. `docs/stack-research.json` records dated evidence, not proof of a successful build.

Project skills are in `.agents/skills/`. Load `atelier-efficient-workflow` for implementation planning; load `atelier-integration-review` for APIs/Alokai; load `atelier-frontend-review` for React/Next changes. Do not preload all skills. These repository-local skills are not installed in the personal ChatGPT skill directory.

## Product and boundaries

Build the smallest complete watch-shopping journey in `docs/PLAN.md`. Preserve the ownership boundaries in `docs/ARCHITECTURE.md`. Use fictional data. Keep credentials and provider-specific shapes on the server. Commerce owns prices, stock and order acceptance. Do not add a database, payment provider, auth platform or another state library without a demonstrated need.

## Changes and evidence

Implement one milestone or a small vertical slice at a time. Explain important decisions in Spanish to the learner; keep code identifiers and technical API docs in English. Distinguish implemented behavior, planned behavior and external integrations simulated locally. Do not claim professional mastery from this exercise.

For dependencies: use stable versions, check engines and peer dependencies, keep Express on the major supported by Alokai, commit the generated lockfile and use `npm ci` once it exists. Never use `--force` or `--legacy-peer-deps` to conceal conflicts.

Use focused searches (`rg` when available, otherwise platform-native search). Exclude dependencies, build output and generated clients from context. Batch independent reads; keep mutations and dependent steps sequential. Do not spawn agents unless the user requests them or applicable instructions require them.

Run checks appropriate to changed behavior; scope tests first, then run affected integration/build checks. Avoid repetitive full-suite runs without new evidence. Capture failures briefly and fix their cause. Do not weaken a test, scanner or type check to obtain a green result.

Before a commit, inspect the staged diff for secrets and unrelated files. Update `docs/STATUS.md` with the completed slice, exact checks, blockers and the next action. Skills must remain versioned in Git; do not report global installation. No performance or token-saving claims without measurements.
