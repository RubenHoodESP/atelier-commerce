// Pure evaluation of npm audit reports against docs/security/accepted-risks.json.
// Kept separate from the npm invocation so the policy itself is unit-tested.
const BLOCKING = new Set(['high', 'critical']);

// Advisory objects (with a GHSA URL) for one npm audit report, keyed by advisory id.
export function advisories(report) {
  const found = new Map();
  for (const [name, vulnerability] of Object.entries(report?.vulnerabilities ?? {})) {
    for (const via of vulnerability.via ?? []) {
      if (typeof via !== 'object' || !via.url) continue;
      const id = via.url.split('/').pop();
      found.set(id, { id, package: name, severity: via.severity ?? vulnerability.severity, title: via.title ?? '' });
    }
  }
  return [...found.values()];
}

export function evaluate({ production, full, policy, today }) {
  const errors = [];
  const notes = [];
  const accepted = new Map((policy.risks ?? []).map(risk => [risk.advisory, risk]));
  for (const advisory of advisories(production)) {
    if (BLOCKING.has(advisory.severity)) errors.push(`production ${advisory.severity}: ${advisory.id} in ${advisory.package} (${advisory.title})`);
    else notes.push(`production ${advisory.severity}: ${advisory.id} in ${advisory.package}`);
  }
  const productionIds = new Set(advisories(production).map(advisory => advisory.id));
  const present = new Set();
  for (const advisory of advisories(full)) {
    present.add(advisory.id);
    if (productionIds.has(advisory.id)) continue;
    if (!BLOCKING.has(advisory.severity)) { notes.push(`dev ${advisory.severity}: ${advisory.id} in ${advisory.package}`); continue; }
    const risk = accepted.get(advisory.id);
    if (!risk || risk.scope !== 'dev') errors.push(`dev ${advisory.severity} not accepted: ${advisory.id} in ${advisory.package} (${advisory.title})`);
    else if (risk.reviewBy < today) errors.push(`accepted risk expired on ${risk.reviewBy}: ${advisory.id} in ${advisory.package}; review it`);
    else notes.push(`dev ${advisory.severity} accepted until ${risk.reviewBy}: ${advisory.id} in ${advisory.package}`);
  }
  for (const risk of accepted.values()) {
    if (!present.has(risk.advisory)) notes.push(`accepted risk ${risk.advisory} no longer reported; remove it from accepted-risks.json`);
  }
  return { ok: errors.length === 0, errors, notes };
}
