'use client';
import Link from 'next/link';
import { useActionState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { MotionScope } from './motion-scope';
import { updateBagItem } from '../app/cart/actions';

export type BagLineView = { productId: string; name: string; quantity: number; unitPrice: string; lineTotal: string };

// Lines and totals are rendered from commerce data passed by the server page.
// One status region stays mounted so removals (even of the last line) keep focus somewhere meaningful.
// Controls are not disabled while pending: disabling the focused button would drop focus to <body>,
// and setting a quantity is idempotent, so a repeated submission is harmless.
export function BagEditor({ lines, summary, subtotal }: { lines: BagLineView[]; summary: string; subtotal: string }) {
  const [state, action, pending] = useActionState(updateBagItem, null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state?.focusStatus) statusRef.current?.focus();
  }, [state]);
  return (
    <MotionScope>
      <p ref={statusRef} tabIndex={-1} role="status" className="min-h-6 outline-none">
        {pending ? 'Updating your bag…' : state?.message ?? ''}
      </p>
      {lines.length === 0 ? (
        <>
          <p className="my-8">Your bag is empty.</p>
          <Link className="button" href="/products">Explore the collection</Link>
        </>
      ) : (
        <>
          <p>{summary}</p>
          <ul aria-label="Bag items" aria-busy={pending} className="my-8 border-t border-line">
            {/* Removed lines fold away; initial={false} keeps server HTML visible without JavaScript. */}
            <AnimatePresence initial={false}>
            {lines.map(line => (
              <m.li key={line.productId} layout="position" exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                className="grid gap-3 overflow-hidden border-b border-line py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="grid gap-2">
                  <Link className="underline underline-offset-4" href={`/products/${line.productId}`}>{line.name}</Link>
                  <p className="text-sm text-muted">{line.unitPrice} each</p>
                  <form action={action} className="flex flex-wrap items-center gap-3 text-sm">
                    <input type="hidden" name="productId" value={line.productId} />
                    <label htmlFor={`quantity-${line.productId}`}>Quantity<span className="sr-only"> for {line.name}</span></label>
                    <input key={line.quantity} id={`quantity-${line.productId}`} name="quantity" type="number" inputMode="numeric"
                      min={1} max={20} required defaultValue={line.quantity}
                      className="w-20 border border-line bg-paper p-2" />
                    <button type="submit" name="intent" value="update" className="border border-ink px-4 py-2">
                      Update<span className="sr-only"> {line.name}</span>
                    </button>
                    <button type="submit" name="intent" value="remove" formNoValidate className="px-2 py-2 underline underline-offset-4">
                      Remove<span className="sr-only"> {line.name}</span>
                    </button>
                  </form>
                </div>
                <p aria-label={`Line total for ${line.name}`}>{line.lineTotal}</p>
              </m.li>
            ))}
            </AnimatePresence>
          </ul>
          <dl className="flex justify-between gap-4 text-lg">
            <dt>Subtotal</dt>
            <AnimatePresence initial={false} mode="wait">
              <m.dd key={subtotal} data-testid="bag-subtotal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}>{subtotal}</m.dd>
            </AnimatePresence>
          </dl>
        </>
      )}
    </MotionScope>
  );
}
