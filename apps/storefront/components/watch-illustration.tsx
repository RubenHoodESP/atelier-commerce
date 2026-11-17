import type { Product } from '@atelier/contracts';

// Deterministic, brand-free product illustration. Collection sets the palette; the model number
// varies markers, date window and strap so each of the twelve references looks distinct.
// Rendering uses gradients only (no SVG filters) to stay cheap with twelve inline watches.
type Palette = { metal: [string, string, string]; dial: [string, string]; ink: string; straps: [string, string][] };
const PALETTES: Record<string, Palette> = {
  Horizon: { metal: ['#f1dfb4', '#c9a465', '#8c6a35'], dial: ['#fbf6ea', '#e9dfc9'], ink: '#4a4031',
    straps: [['#8a5d38', '#6b4528'], ['#5a3f2b', '#3f2b1d']] },
  Meridian: { metal: ['#f4f6f7', '#bcc2c6', '#7d858a'], dial: ['#e8ebea', '#c3c9c7'], ink: '#33393c',
    straps: [['#4b5054', '#33373a'], ['#6a6058', '#4c443d']] },
  Nocturne: { metal: ['#e6e8ec', '#9ba1a8', '#5a6068'], dial: ['#3a4456', '#1d2431'], ink: '#ece5d3',
    straps: [['#26262b', '#151518'], ['#1f2a3d', '#121a28']] },
};
const MINUTE_TICKS = Array.from({ length: 60 }, (_, i) => i).filter(i => i % 5 !== 0).map(i => {
  const a = (i * Math.PI) / 30;
  const [s, c] = [Math.sin(a), Math.cos(a)];
  return `M${(200 + 84 * s).toFixed(2)} ${(240 - 84 * c).toFixed(2)}L${(200 + 89 * s).toFixed(2)} ${(240 - 89 * c).toFixed(2)}`;
}).join('');
// The date window replaces the 3 o'clock marker.
const skip = (hour: number, hasDate: boolean) => hasDate && hour === 3;
const at = (hour: number, radius: number) => {
  const a = (hour * Math.PI) / 6;
  return [200 + radius * Math.sin(a), 240 - radius * Math.cos(a)] as const;
};

// sweep: 'always' animates the seconds hand (detail page); 'hover' runs it only while a card is hovered or focused.
export function WatchIllustration({ product, decorative = false, sweep = 'always' }: { product: Product; decorative?: boolean; sweep?: 'always' | 'hover' }) {
  const palette = PALETTES[product.collection] ?? PALETTES.Horizon!;
  const model = Number(product.id.slice(-3)) || 1;
  const markers = (['batons', 'numerals', 'dots'] as const)[model % 3];
  const hasDate = model % 4 === 0;
  const [strapLight, strapDark] = palette.straps[model % 2]!;
  const id = `w${product.id.replace(/[^a-z0-9]/gi, '')}`;
  const [metalLight, metal, metalDark] = palette.metal;
  return (
    <svg viewBox="0 0 400 480" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Illustration of ${product.name}`} className="mx-auto h-full max-h-[480px] w-full">
      <defs>
        <linearGradient id={`${id}-strap`} x1="0" x2="1"><stop offset="0" stopColor={strapDark} /><stop offset=".35" stopColor={strapLight} /><stop offset=".7" stopColor={strapLight} /><stop offset="1" stopColor={strapDark} /></linearGradient>
        <radialGradient id={`${id}-case`} cx=".35" cy=".3" r=".85"><stop offset="0" stopColor={metalLight} /><stop offset=".55" stopColor={metal} /><stop offset="1" stopColor={metalDark} /></radialGradient>
        <linearGradient id={`${id}-bezel`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={metalDark} /><stop offset=".5" stopColor={metalLight} /><stop offset="1" stopColor={metalDark} /></linearGradient>
        <radialGradient id={`${id}-dial`} cx=".5" cy=".45" r=".6"><stop offset="0" stopColor={palette.dial[0]} /><stop offset="1" stopColor={palette.dial[1]} /></radialGradient>
        <radialGradient id={`${id}-shadow`}><stop offset=".78" stopColor="#000" stopOpacity=".18" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".22" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>

      {/* Straps with stitching; holes on the lower strap */}
      <g fill={`url(#${id}-strap)`}>
        <path d="M160 0h80v118c0 8-4 14-10 18h-60c-6-4-10-10-10-18z" />
        <path d="M170 344h60c6 4 10 10 10 18v118h-80V362c0-8 4-14 10-18z" />
      </g>
      <g fill="none" stroke="#f3ead8" strokeOpacity=".28" strokeWidth="1" strokeDasharray="4 4">
        <path d="M168 0v116M232 0v116M168 364v116M232 364v116" />
      </g>
      <g fill="#000" fillOpacity=".35">
        {[404, 424, 444].map(y => <circle key={y} cx="200" cy={y} r="3" />)}
      </g>

      {/* Soft contact shadow, then lugs, crown and case */}
      <ellipse cx="206" cy="252" rx="130" ry="126" fill={`url(#${id}-shadow)`} />
      <g fill={`url(#${id}-case)`}>
        <rect x="150" y="122" width="22" height="40" rx="8" /><rect x="228" y="122" width="22" height="40" rx="8" />
        <rect x="150" y="318" width="22" height="40" rx="8" /><rect x="228" y="318" width="22" height="40" rx="8" />
        <rect x="306" y="226" width="16" height="28" rx="4" />
      </g>
      <path d="M310 230v20M314 230v20M318 230v20" stroke={metalDark} strokeWidth="1.2" />
      <circle cx="200" cy="240" r="113" fill={`url(#${id}-case)`} />
      <circle cx="200" cy="240" r="104" fill={`url(#${id}-bezel)`} />
      <circle cx="200" cy="240" r="97" fill={`url(#${id}-dial)`} />

      {/* Dial: minute track, hour markers, wordmark, optional date */}
      <g stroke={palette.ink}>
        <path d={MINUTE_TICKS} strokeWidth="1" strokeOpacity=".55" />
        {markers === 'batons' && Array.from({ length: 12 }, (_, h) => h).filter(h => !skip(h, hasDate)).map(h => {
          const [x1, y1] = at(h, h % 3 === 0 ? 66 : 72); const [x2, y2] = at(h, 88);
          return <line key={h} x1={x1} y1={y1} x2={x2} y2={y2} stroke={metal} strokeWidth={h % 3 === 0 ? 5 : 3} strokeLinecap="round" />;
        })}
        {markers === 'dots' && Array.from({ length: 12 }, (_, h) => h).filter(h => !skip(h, hasDate)).map(h => {
          const [x, y] = at(h, 78);
          return <circle key={h} cx={x} cy={y} r={h % 3 === 0 ? 5 : 3} fill={metal} stroke="none" />;
        })}
      </g>
      {markers === 'numerals' && (
        <g fill={palette.ink} fontFamily="Georgia, serif" fontSize="17" textAnchor="middle" dominantBaseline="central">
          {([['XII', 0], ['III', 3], ['VI', 6], ['IX', 9]] as const).filter(([, h]) => !skip(h, hasDate)).map(([label, h]) => {
            const [x, y] = at(h, 72);
            return <text key={label} x={x} y={y}>{label}</text>;
          })}
          {[1, 2, 4, 5, 7, 8, 10, 11].map(h => { const [x, y] = at(h, 78); return <circle key={h} cx={x} cy={y} r="2.2" />; })}
        </g>
      )}
      <text x="200" y="206" textAnchor="middle" fontSize="10" letterSpacing="3.5" fill={palette.ink}>ATELIER</text>
      <text x="200" y="290" textAnchor="middle" fontSize="7" letterSpacing="2.5" fill={palette.ink} fillOpacity=".75">{product.collection.toUpperCase()}</text>
      {hasDate && (
        <g>
          <rect x="258" y="231" width="22" height="18" rx="2" fill="#fbf7ee" stroke={metal} strokeWidth="1.5" />
          <text x="269" y="244" textAnchor="middle" fontSize="11" fill="#2b2620">17</text>
        </g>
      )}

      {/* Dauphine hands in the classic 10:10 product pose */}
      <g fill={metal} stroke={metalDark} strokeWidth=".6">
        <path d="M200 182l6 58h-12z" transform="rotate(-60 200 240)" />
        <path d="M200 160l4.5 80h-9z" transform="rotate(60 200 240)" />
      </g>
      {/* Starts near 8 o'clock so the static (reduced-motion) hand hides neither the hands nor the wordmarks. */}
      <g transform="rotate(232 200 240)">
        <path className="watch-seconds" data-sweep={sweep} d="M200 262V156" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <circle cx="200" cy="240" r="6" fill={metal} stroke={metalDark} strokeWidth=".8" />
      <circle cx="200" cy="240" r="2" fill={metalDark} />

      {/* Glass reflection */}
      <path d="M128 196a82 82 0 0 1 110-62a96 96 0 0 0-110 62z" fill={`url(#${id}-glass)`} />
    </svg>
  );
}
