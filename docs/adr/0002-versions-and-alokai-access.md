# ADR 0002: Stable versions with compatibility gates

Status: researched proposal, not runtime-validated.

Pin the current stable candidates recorded in `docs/stack-research.json`; use Node 22.23.5 as the Alokai-oriented baseline. The ecosystem label and Connect package version differ. Preserve Alokai's supported Express major and inspect its patched transitives before attempting an upgrade.

Use TypeScript 7.0.2 only after checking the Next/test/lint toolchain. If an actual incompatibility is found, record the error, choose the newest stable compatible release and update the matrix. A newer release is not sufficient evidence of interoperability.

Create our own Next application and custom integration. Alokai starter/cloud/commercial integration access is not assumed. If the current Connect package requires access unavailable to the learner, record that explicitly and agree a fallback; do not silently call an Express facade an Alokai integration.

No untested runtime dependencies or manually authored lockfile in the foundation commit. M1 installs packages, commits exact manifests plus a generated npm lockfile and proves the vertical slice. Use npm workspaces before adding a task runner.
