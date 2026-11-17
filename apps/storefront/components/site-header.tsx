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
        {/* The visible number is part of the name ("Bag 2 items"), so the name contains the visible
            text (WCAG 2.5.3); axe flagged the earlier aria-label "Bag, 2 items" as a mismatch. */}
        <Link href="/cart" aria-current={onBag ? 'page' : undefined}
          className="inline-flex items-center gap-2 underline-offset-8 aria-[current=page]:underline">
          Bag
          {bagCount !== null && bagCount > 0 && (
            <>
              {/* key remounts the number when it changes, replaying a CSS lift (no Motion on every page). */}
              <span data-testid="bag-count"
                className="inline-grid min-w-6 place-items-center overflow-hidden rounded-full bg-ink px-1.5 text-xs leading-6 text-paper">
                <span key={bagCount} className="count-lift">{bagCount}</span>
              </span>
              <span className="sr-only">{bagCount === 1 ? 'item' : 'items'}</span>
            </>
          )}
        </Link>
      </nav>
      <ThemeSwitch theme={theme} />
    </header>
  );
}
