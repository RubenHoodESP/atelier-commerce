import { describe, expect, it } from 'vitest';
import { evaluate } from '../scripts/audit-policy.mjs';

// Minimal npm audit report shapes (npm audit --json, lockfile v3).
const report = (...entries: [pkg: string, id: string, severity: string][]) => ({
  vulnerabilities: Object.fromEntries(entries.map(([pkg, id, severity]) => [pkg, {
    severity, via: [{ url: `https://github.com/advisories/${id}`, severity, title: `${pkg} issue` }, 'some-parent'],
  }])),
});
const EMPTY = { vulnerabilities: {} };
const policy = (reviewBy = '2026-12-18', scope = 'dev') => ({ risks: [{ advisory: 'GHSA-dev', package: 'picomatch', scope, reviewBy }] });
const today = '2026-11-18';

describe('dependency audit policy', () => {
  it('passes with no advisories', () => {
    expect(evaluate({ production: EMPTY, full: EMPTY, policy: { risks: [] }, today })).toEqual({ ok: true, errors: [], notes: [] });
  });

  it('always fails on high or critical production advisories, even if listed as accepted', () => {
    const production = report(['express', 'GHSA-dev', 'critical']);
    const result = evaluate({ production, full: production, policy: policy(), today });
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining('production critical: GHSA-dev')]);
  });

  it('accepts a listed dev advisory until its review date', () => {
    const result = evaluate({ production: EMPTY, full: report(['picomatch', 'GHSA-dev', 'high']), policy: policy(), today });
    expect(result.ok).toBe(true);
    expect(result.notes).toEqual([expect.stringContaining('accepted until 2026-12-18')]);
  });

  it('fails once the acceptance has expired', () => {
    const result = evaluate({ production: EMPTY, full: report(['picomatch', 'GHSA-dev', 'high']), policy: policy('2026-11-17'), today });
    expect(result.errors).toEqual([expect.stringContaining('expired on 2026-11-17')]);
  });

  it('fails on an unlisted dev advisory and on an acceptance with the wrong scope', () => {
    expect(evaluate({ production: EMPTY, full: report(['vite', 'GHSA-new', 'high']), policy: policy(), today }).errors)
      .toEqual([expect.stringContaining('dev high not accepted: GHSA-new')]);
    expect(evaluate({ production: EMPTY, full: report(['picomatch', 'GHSA-dev', 'high']), policy: policy('2026-12-18', 'production'), today }).ok).toBe(false);
  });

  it('reports moderate advisories and stale acceptances without failing', () => {
    const result = evaluate({ production: report(['next', 'GHSA-mod', 'moderate']), full: report(['next', 'GHSA-mod', 'moderate']), policy: policy(), today });
    expect(result.ok).toBe(true);
    expect(result.notes).toEqual([
      expect.stringContaining('production moderate: GHSA-mod'),
      expect.stringContaining('GHSA-dev no longer reported'),
    ]);
  });
});
