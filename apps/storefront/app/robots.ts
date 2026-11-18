import type { MetadataRoute } from 'next';

// Fictional demo store: no page should be crawled.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
