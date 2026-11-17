---
name: atelier-efficient-workflow
description: Implement or plan a bounded change in Atelier Commerce using selective context, dated stack evidence and concise handoffs. Use for this repository's development tasks.
---

# Efficient project work

Read `docs/STATUS.md` and run `node scripts/context.mjs <area>` from the repository root. Open only the relevant files and document sections. Use the root `AGENTS.md` as the working agreement.

Reuse `docs/stack-research.json` for version evidence. Browse again only for a dependency change, stale/security-sensitive evidence, missing APIs or an unresolved compatibility gate. Do not copy whole vendor guides into the prompt.

Choose one small vertical slice with an observable acceptance condition. Locate symbols before reading entire directories. Exclude lockfiles, generated code and output from normal context unless investigating dependencies or generation.

Batch independent reads. Keep dependency-changing steps sequential. Run the smallest relevant checks, then affected build/integration checks. Broaden checks only for new failures or unresolved risk. Do not hide errors by truncating them before inspecting the cause.

Update the current handoff instead of appending a long work log: changed behavior, exact checks, limitations and next action. Keep claims tied to observed evidence. No unmeasured token-saving promises; fewer irrelevant reads is the mechanism, not proof of a percentage.
