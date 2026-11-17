import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { display } from './fonts';
import { SiteHeader } from '../components/site-header';
import { getBagCount } from '../lib/cart';
export const metadata: Metadata = { title: 'Atelier | Independent watchmaking', description: 'A fictional watch collection. Composable commerce learning project.' };
export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={display.variable}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <SiteHeader bagCount={await getBagCount()} />
        {children}
        <footer>Atelier is a fictional brand. Demonstration only.</footer>
      </body>
    </html>
  );
}
