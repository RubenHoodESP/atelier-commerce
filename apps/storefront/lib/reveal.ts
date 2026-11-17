import type { CSSProperties } from 'react';
// Stagger order for the CSS `.reveal` entrance (see globals.css).
// CSSProperties has no custom properties; the intersection types the variable without a cast.
export function reveal(order: number): CSSProperties {
  const style: CSSProperties & Record<`--${string}`, number> = { '--reveal-order': order };
  return style;
}
