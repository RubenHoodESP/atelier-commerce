import type { CSSProperties } from 'react';
// Stagger order for the CSS `.reveal` entrance (see globals.css).
export function reveal(order: number): CSSProperties {
  return { '--reveal-order': order } as CSSProperties;
}
