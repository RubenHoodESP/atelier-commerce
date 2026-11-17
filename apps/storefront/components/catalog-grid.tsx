'use client';
import Link from 'next/link';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import type { Product } from '@atelier/contracts';
import { formatPrice } from '../lib/catalog';
import { MotionScope } from './motion-scope';
import { WatchIllustration } from './watch-illustration';

// Cards glide to their new position when filters or sorting change instead of jumping.
// initial={false}: the server-rendered grid is shown as-is (visible without JavaScript);
// only later changes animate.
export function CatalogGrid({ products, search }: { products: Product[]; search: string }) {
  return (
    <MotionScope>
      <ul aria-label="Watches" className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false} mode="popLayout">
          {products.map(product => (
            <m.li key={product.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Link href={`/products/${product.id}${search}`} className="group block" aria-label={`View ${product.name}`}>
                <div className="h-80 overflow-hidden bg-panel transition-colors duration-500 group-hover:bg-line">
                  <div className="watch-lift h-full"><WatchIllustration product={product} decorative sweep="hover" /></div>
                </div>
                <p className="eyebrow mt-5">{product.collection}</p><h2 className="mt-2 text-2xl">{product.name}</h2>
                <p className="mt-3">{formatPrice(product.price.amountMinor)}</p>
                <p className="mt-2 text-sm text-muted">{product.stock > 0 ? `${product.stock} available` : 'Currently unavailable'}</p>
              </Link>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
    </MotionScope>
  );
}
