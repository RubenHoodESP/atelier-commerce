import Link from 'next/link';
export default function OrderNotFound() {
  return <main id="main" className="intro"><p className="eyebrow">404</p><h1>Order not found.</h1><p>This order reference is unknown or no longer available in this demonstration.</p><Link className="button" href="/products">Return to the collection</Link></main>;
}
