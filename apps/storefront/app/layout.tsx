import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
export const metadata: Metadata = { title: 'Atelier | Independent watchmaking', description: 'A fictional watch collection. Composable commerce learning project.' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <header>
          <a className="brand" href="/">ATELIER<span>INDEPENDENT WATCHMAKING</span></a>
          <nav aria-label="Main navigation" className="flex gap-6 text-sm"><a href="/">Home</a><a href="/products">Collection</a><a href="/cart">Bag</a></nav>
        </header>
        {children}
        <footer>Atelier is a fictional brand. Demonstration only.</footer>
      </body>
    </html>
  );
}
