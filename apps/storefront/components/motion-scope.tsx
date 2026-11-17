'use client';
import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

const loadFeatures = () => import('./motion-features').then(module => module.default);

// Scope for Motion-animated client components only; server pages are not wrapped.
// reducedMotion="user" follows the OS setting: layout/transform animations are skipped.
// `strict` forbids the heavy `motion.*` components so only lazy `m.*` components are used.
export function MotionScope({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
