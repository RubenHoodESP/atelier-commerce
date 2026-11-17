'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeSwitch } from './theme-switch';

const LINKS = [
  { href: '/', label: 'Home', current: (path: string) => path === '/' },
  { href: '/products', label: 'Collection', current: (path: string) => path.startsWith('/products') },
] as const;

// bagCount comes from the server layout (commerce cart units). null means "unknown": the link
// is still shown, without a number, rather than displaying a possibly wrong count.
export function SiteHeader({ bagCount, theme }: { bagCount: number | null; theme: 'system' | 'light' | 'dark' }) {
  const path = usePathname();
  const onBag = path === '/cart';
  return (
    <header>
      <Link className="brand" href="/">ATELIER<span>INDEPENDENT WATCHMAKING</span></Link>
      <nav aria-label="Main navigation" className="flex items-center gap-6 text-sm">
        {LINKS.map(link => (
          <Link key={link.href} href={link.href} aria-current={link.current(path) ? 'page' : undefined}
            className="underline-offset-8 aria-[current=page]:underline">{link.label}</Link>
        ))}
        {/* Explicit name: separate (flex or visually hidden) children would add stray spaces.
            It starts with the visible label "Bag" (WCAG 2.5.3 label in name). */}
        <Link href="/cart" aria-current={onBag ? 'page' : undefined}
          aria-label={bagCount ? `Bag, ${bagCount === 1 ? '1 item' : `${bagCount} items`}` : undefined}
          className="inline-flex items-center gap-2 underline-offset-8 aria-[current=page]:underline">
          Bag
          {bagCount !== null && bagCount > 0 && (
            // key remounts the number when it changes, replaying a CSS lift (no Motion on every page).
            <span aria-hidden="true" data-testid="bag-count"
              className="inline-grid min-w-6 place-items-center overflow-hidden rounded-full bg-ink px-1.5 text-xs leading-6 text-paper">
              <span key={bagCount} className="count-lift">{bagCount}</span>
            </span>
          )}
        </Link>
      </nav>
      <ThemeSwitch theme={theme} />
    </header>
  );
}
