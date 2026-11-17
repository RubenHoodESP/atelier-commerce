import Link from 'next/link';
export default function Home() {
  return <main id="main" className="intro"><p className="eyebrow">FORM. FUNCTION. TIME.</p><h1>A quieter<br />kind of statement.</h1><p>Discover Horizon, our first expression of considered watchmaking.</p><Link className="button" href="/products/watch-001">Explore Horizon <span aria-hidden="true">&#8594;</span></Link></main>;
}
