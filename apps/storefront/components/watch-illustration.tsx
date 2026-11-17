import type { Product } from '@atelier/contracts';
// sweep: 'always' animates the seconds hand (detail page); 'hover' runs it only while a card is hovered or focused.
export function WatchIllustration({ product, decorative = false, sweep = 'always' }: { product: Product; decorative?: boolean; sweep?: 'always' | 'hover' }) {
  const dial = product.collection === 'Nocturne' ? '#303743' : product.collection === 'Meridian' ? '#c4c9c6' : '#eee9dd';
  const ink = product.collection === 'Nocturne' ? '#eee9dd' : '#524c3e';
  return (
    <svg viewBox="0 0 400 480" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Illustration of ${product.name}`} className="mx-auto h-full max-h-[480px] w-full">
      <rect x="158" y="10" width="84" height="460" rx="25" fill="#4e4438" />
      <rect x="165" y="10" width="70" height="460" rx="20" fill="#655848" />
      <circle cx="200" cy="240" r="110" fill="#a49375" />
      <circle cx="200" cy="240" r="101" fill="#e7e0cf" />
      <circle cx="200" cy="240" r="91" fill={dial} />
      <g stroke={ink} strokeWidth="2">
        <path d="M200 155v12m0 146v12m-85-85h12m146 0h12" />
        <path d="M200 240v-55m0 55l42 25" strokeWidth="4" />
      </g>
      <path className="watch-seconds" data-sweep={sweep} d="M200 255V160" stroke="#8a6926" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="200" cy="240" r="5" fill={ink} />
      <text x="200" y="206" textAnchor="middle" fontSize="11" letterSpacing="3" fill={ink}>ATELIER</text>
      <text x="200" y="288" textAnchor="middle" fontSize="8" letterSpacing="2" fill={ink}>{product.collection.toUpperCase()}</text>
    </svg>
  );
}
