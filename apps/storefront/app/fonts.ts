import localFont from 'next/font/local';

// Self-hosted display face (see app/fonts/README.md for provenance and license).
// Only two files: 500 for headings and 400 italic for occasional emphasis. Next preloads them
// and generates a metric-adjusted fallback so text does not shift when the font arrives.
export const display = localFont({
  src: [
    { path: './fonts/cormorant-garamond-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/cormorant-garamond-latin-400-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-display',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});
