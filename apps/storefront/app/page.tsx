import Link from 'next/link';
import { getBrandContent } from '../lib/content';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const content = await getBrandContent();
  return <main id="main" className="intro"><p className="eyebrow">FORM. FUNCTION. TIME.</p><h1>{content.headline}</h1>
    <p>{content.intro}</p><div className="flex flex-wrap items-center gap-6">
      <Link className="button mt-6" href="/products">Explore the collection <span aria-hidden="true">→</span></Link>
      <Link className="mt-6 underline underline-offset-4" href="/products/watch-001">Explore Horizon</Link></div>
    <section aria-labelledby="brand-story" className="mt-20 border-t border-line pt-10"><h2 id="brand-story">Considered by design.</h2>
      <p className="mt-5 max-w-xl leading-8 text-muted">{content.story}</p></section></main>;
}
