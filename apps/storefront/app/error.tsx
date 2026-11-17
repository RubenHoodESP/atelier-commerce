'use client';
export default function ProductError({ reset }: { reset: () => void }) {
  return <main id="main" className="intro"><h1>Temporarily unavailable</h1><p>We could not reach the collection. Please try again.</p><button className="button" onClick={reset}>Try again</button></main>;
}
