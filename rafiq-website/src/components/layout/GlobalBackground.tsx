'use client';

import { motion, useReducedMotion } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────
   SOFT CINEMATIC MOTION
───────────────────────────────────────────────────────────── */

const glowTopLeft = {
  animate: {
    x: [0, 40, 10, 0],
    y: [0, 25, -15, 0],
  },
  transition: {
    duration: 24,
    repeat: Infinity,
    ease: 'easeInOut' as const,
    repeatType: 'mirror' as const,
  },
};

const glowTopRight = {
  animate: {
    x: [0, -35, -10, 0],
    y: [0, 30, 15, 0],
  },
  transition: {
    duration: 28,
    repeat: Infinity,
    ease: 'easeInOut' as const,
    repeatType: 'mirror' as const,
    delay: 2,
  },
};

const glowCenter = {
  animate: {
    scale: [1, 1.05, 0.98, 1],
    x: [0, 20, -10, 0],
  },
  transition: {
    duration: 32,
    repeat: Infinity,
    ease: 'easeInOut' as const,
    repeatType: 'mirror' as const,
    delay: 4,
  },
};

const glowBottom = {
  animate: {
    x: [0, 35, 0],
    y: [0, -20, 0],
  },
  transition: {
    duration: 30,
    repeat: Infinity,
    ease: 'easeInOut' as const,
    repeatType: 'mirror' as const,
    delay: 3,
  },
};

/* ─────────────────────────────────────────────────────────────
   NOISE TEXTURE
───────────────────────────────────────────────────────────── */

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`;

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */

export default function GlobalBackground() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{
        zIndex: -10,
        background: '#000109',
      }}
    >
      {/* ───────────────── GRID ───────────────── */}

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.018) 1px, transparent 1px)
          `,
          backgroundSize: '72px 72px',
          opacity: 0.35,
        }}
      />

      {/* ───────────────── DARK DEPTH ───────────────── */}

      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 80% 60% at 50% 50%,
              transparent 35%,
              rgba(0,1,9,0.72) 100%
            )
          `,
        }}
      />

      {/* ───────────────── RED GLOW — TOP LEFT ───────────────── */}

      <motion.div
        className="absolute rounded-full"
        style={{
          width: 800,
          height: 800,
          top: -340,
          left: -340,

          background: `
            radial-gradient(
              circle at center,
              rgba(255,59,59,0.10) 0%,
              rgba(255,59,59,0.04) 38%,
              rgba(255,59,59,0.015) 58%,
              transparent 78%
            )
          `,

          filter: 'blur(80px)',
          willChange: 'transform',
        }}
        animate={prefersReducedMotion ? undefined : glowTopLeft.animate}
        transition={prefersReducedMotion ? undefined : glowTopLeft.transition}
      />

      {/* ───────────────── RED GLOW — TOP RIGHT ───────────────── */}

      <motion.div
        className="absolute rounded-full"
        style={{
          width: 700,
          height: 700,
          top: -260,
          right: -260,

          background: `
            radial-gradient(
              circle at center,
              rgba(255,59,59,0.06) 0%,
              rgba(255,59,59,0.025) 40%,
              transparent 72%
            )
          `,

          filter: 'blur(90px)',
          willChange: 'transform',
        }}
        animate={prefersReducedMotion ? undefined : glowTopRight.animate}
        transition={prefersReducedMotion ? undefined : glowTopRight.transition}
      />

      {/* ───────────────── CENTER ATMOSPHERE ───────────────── */}

      <motion.div
        className="absolute rounded-full"
        style={{
          width: 1000,
          height: 1000,

          top: '50%',
          left: '50%',

          marginTop: -500,
          marginLeft: -500,

          background: `
            radial-gradient(
              circle at center,
              rgba(255,59,59,0.035) 0%,
              rgba(255,59,59,0.015) 42%,
              transparent 70%
            )
          `,

          filter: 'blur(100px)',
          willChange: 'transform',
        }}
        animate={prefersReducedMotion ? undefined : glowCenter.animate}
        transition={prefersReducedMotion ? undefined : glowCenter.transition}
      />

      {/* ───────────────── BOTTOM RED ───────────────── */}

      <motion.div
        className="absolute rounded-full"
        style={{
          width: 850,
          height: 850,

          bottom: -350,
          right: -250,

          background: `
            radial-gradient(
              circle at center,
              rgba(255,59,59,0.08) 0%,
              rgba(255,59,59,0.03) 42%,
              transparent 74%
            )
          `,

          filter: 'blur(95px)',
          willChange: 'transform',
        }}
        animate={prefersReducedMotion ? undefined : glowBottom.animate}
        transition={prefersReducedMotion ? undefined : glowBottom.transition}
      />

      {/* ───────────────── NOISE ───────────────── */}

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE_SVG,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
          opacity: 0.018,
          mixBlendMode: 'overlay',
        }}
      />

      {/* ───────────────── TOP VIGNETTE ───────────────── */}

      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: '14%',
          background:
            'linear-gradient(to bottom, rgba(0,1,9,0.88) 0%, transparent 100%)',
        }}
      />

      {/* ───────────────── BOTTOM VIGNETTE ───────────────── */}

      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: '30%',
          background:
            'linear-gradient(to top, rgba(0,1,9,0.75) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}