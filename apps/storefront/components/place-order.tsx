'use client';
import { useActionState } from 'react';
import { placeOrder } from '../app/cart/actions';

// The button stays enabled while pending: a repeated submission carries the same idempotency
// key and returns the same order, and disabling the focused button would drop focus.
export function PlaceOrder({ initialKey }: { initialKey: string }) {
  const [state, action, pending] = useActionState(placeOrder, null);
  return (
    <form action={action} className="mt-8 grid gap-3" aria-busy={pending}>
      <input type="hidden" name="idempotencyKey" value={state?.key || initialKey} />
      <button type="submit" className="button">{pending ? 'Placing order…' : 'Place order'}</button>
      <p role="alert" className="min-h-5 text-sm">{pending ? '' : state?.message ?? ''}</p>
    </form>
  );
}
