import Link from 'next/link';
import { getBrandContent } from '../lib/content';
import { reveal } from '../lib/reveal';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const content = await getBrandContent();
  return <main id="main" className="intro"><p className="eyebrow reveal">FORM. FUNCTION. TIME.</p><h1 className="reveal" style={reveal(1)}>{content.headline}</h1>
    <p className="reveal" style={reveal(2)}>{content.intro}</p><div className="reveal flex flex-wrap items-center gap-6" style={reveal(3)}>
      <Link className="button mt-6" href="/products">Explore the collection <span aria-hidden="true">→</span></Link>
      <Link className="mt-6 underline underline-offset-4" href="/products/watch-001">Explore Horizon</Link></div>
    <section aria-labelledby="brand-story" className="reveal mt-20 border-t border-line pt-10" style={reveal(4)}><h2 id="brand-story">Considered by design.</h2>
      <p className="mt-5 max-w-xl leading-8 text-muted">{content.story}</p></section></main>;
}
