'use client';
import { useActionState } from 'react';
import { addToBag } from '../app/cart/actions';

// Progressive enhancement: without JavaScript the form posts natively and the
// server renders the returned message; with JavaScript the button is disabled while pending.
export function AddToBag({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(addToBag, null);
  return (
    <form action={action} className="mt-6 grid gap-3" aria-busy={pending}>
      <input type="hidden" name="productId" value={productId} />
      <button type="submit" className="button disabled:opacity-60" disabled={pending}>
        {pending ? 'Adding…' : 'Add to bag'}
      </button>
      <p role="status" className="min-h-5 text-sm text-muted">{pending ? 'Adding to your bag…' : state?.message ?? ''}</p>
    </form>
  );
}
