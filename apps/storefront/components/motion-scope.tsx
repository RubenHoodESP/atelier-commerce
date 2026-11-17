'use client';
import { LazyMotion, MotionConfig, domMax } from 'motion/react';
import type { ReactNode } from 'react';

// Scope for Motion-animated client components only; server pages are not wrapped.
// Features load synchronously: with lazily loaded features, an exit that starts before they
// arrive never completes, leaving removed cards on screen (observed in a stress run).
// reducedMotion="user" follows the OS setting: layout/transform animations are skipped.
// `strict` forbids the heavy `motion.*` components so only `m.*` components are used.
export function MotionScope({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
