# ADR 0002: Stable versions and generated lockfiles

Status: accepted; Express migration supersedes the former integration package constraints.

Retain the tested runtime baseline Node 22.23.5 and exact direct package versions. Express remains 4.22.3 with matching 4.x type definitions; upgrading majors is not part of replacing the integration transport. Next 16.4.6, React/DOM 19.3.1 and TypeScript 7.0.2 have passed local compilation together.

Commit the npm-generated lockfile; use npm ci in CI. Never conceal peer conflicts with force or legacy-peer-deps. Validate the actual affected build, public HTTP behavior and browser journey. Update [stack evidence](../stack-research.json) when dependencies change. No commercial registry is configured.
