import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Reads the colour tokens of both themes straight from the stylesheet and enforces WCAG 2.2
// contrast: 4.5:1 for text, 3:1 for focus indicators and form-control borders (1.4.11).
const css = readFileSync(new URL('../apps/storefront/app/globals.css', import.meta.url), 'utf8');
type Palette = Record<string, string>;
function tokens(block: string): Palette {
  return Object.fromEntries([...block.matchAll(/--color-([a-z]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, value]) => [name, value.toLowerCase()]));
}
const light = tokens(css.match(/@theme \{([\s\S]*?)\n\}/)![1]);
const darkExplicit = tokens(css.match(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/)![1]);
const darkSystem = tokens(css.match(/:root:not\(\[data-theme="light"\]\) \{([\s\S]*?)\n {2}\}/)![1]);

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}
const PAIRS: [foreground: string, background: string, minimum: number, purpose: string][] = [
  ['ink', 'paper', 4.5, 'body text'],
  ['muted', 'paper', 4.5, 'secondary text'],
  ['muted', 'panel', 4.5, 'secondary text on panels'],
  ['paper', 'ink', 4.5, 'text on ink buttons and badges'],
  ['ink', 'line', 4.5, 'text on hovered cards'],
  ['accent', 'paper', 3, 'focus ring'],
  ['accent', 'panel', 3, 'focus ring on panels'],
  ['control', 'paper', 3, 'form control borders'],
  ['control', 'panel', 3, 'form control borders on panels'],
];

describe('theme palettes', () => {
  it('defines the same tokens in light and dark, and both dark blocks are identical', () => {
    expect(Object.keys(darkExplicit).sort()).toEqual(Object.keys(light).sort());
    expect(darkSystem).toEqual(darkExplicit);
  });
  for (const [name, palette] of [['light', light], ['dark', darkExplicit]] as const) {
    it.each(PAIRS)(`${name}: %s on %s meets %s:1 (%s)`, (foreground, background, minimum) => {
      expect(contrast(palette[foreground], palette[background])).toBeGreaterThanOrEqual(minimum);
    });
  }
});
