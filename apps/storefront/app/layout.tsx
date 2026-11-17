import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { display } from './fonts';
import { SiteHeader } from '../components/site-header';
import { getBagCount } from '../lib/cart';
import { readTheme } from '../lib/theme';
export const metadata: Metadata = { title: 'Atelier | Independent watchmaking', description: 'A fictional watch collection. Composable commerce learning project.' };
export default async function RootLayout({ children }: { children: ReactNode }) {
  const [theme, bagCount] = await Promise.all([readTheme(), getBagCount()]);
  return (
    <html lang="en" className={display.variable} data-theme={theme ?? undefined}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <SiteHeader bagCount={bagCount} theme={theme ?? 'system'} />
        {children}
        <footer>Atelier is a fictional brand. Demonstration only.</footer>
      </body>
    </html>
  );
}
