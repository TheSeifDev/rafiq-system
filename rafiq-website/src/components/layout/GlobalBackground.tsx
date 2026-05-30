'use client';

import { motion, useReducedMotion } from 'framer-motion';

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

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`;

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
      {/* Grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(
              to right,
              rgba(255,255,255,0.055) 1px,
              transparent 1px
            ),
            linear-gradient(
              to bottom,
              rgba(255,255,255,0.055) 1px,
              transparent 1px
            )
          `,
          backgroundSize: '64px 64px',
          opacity: 0.85,
        }}
      />

      {/* RIGHT SHADOW MASK — hides grid gradually */}
      <div
        className="absolute inset-y-0 right-0"
        style={{
          width: '48%',
          background: `
            linear-gradient(
              to left,
              rgba(0,1,9,0.96) 0%,
              rgba(0,1,9,0.88) 28%,
              rgba(0,1,9,0.55) 58%,
              transparent 100%
            )
          `,
        }}
      />

      {/* Global cinematic darkness */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 85% 65% at 50% 50%,
              transparent 28%,
              rgba(0,1,9,0.84) 100%
            ),

            radial-gradient(
              circle at 0% 50%,
              rgba(0,0,0,0.72) 0%,
              rgba(0,0,0,0.42) 32%,
              transparent 70%
            )
          `,
        }}
      />

      {/* Top Left Glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 760,
          height: 760,
          top: -330,
          left: -330,
          background: `
            radial-gradient(
              circle at center,
              rgba(255,59,59,0.055) 0%,
              rgba(255,59,59,0.025) 38%,
              rgba(255,59,59,0.010) 58%,
              transparent 78%
            )
          `,
          filter: 'blur(90px)',
          willChange: 'transform',
        }}
        animate={prefersReducedMotion ? undefined : glowTopLeft.animate}
        transition={prefersReducedMotion ? undefined : glowTopLeft.transition}
      />

      {/* Top Right Glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 660,
          height: 660,
          top: -240,
          right: -240,
          background: `
            radial-gradient(
              circle at center,
              rgba(255,59,59,0.03) 0%,
              rgba(255,59,59,0.012) 40%,
              transparent 72%
            )
          `,
          filter: 'blur(100px)',
          willChange: 'transform',
        }}
        animate={prefersReducedMotion ? undefined : glowTopRight.animate}
        transition={prefersReducedMotion ? undefined : glowTopRight.transition}
      />

      {/* Center Glow */}
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
              rgba(255,59,59,0.018) 0%,
              rgba(255,59,59,0.008) 45%,
              transparent 72%
            )
          `,
          filter: 'blur(120px)',
          willChange: 'transform',
        }}
        animate={prefersReducedMotion ? undefined : glowCenter.animate}
        transition={prefersReducedMotion ? undefined : glowCenter.transition}
      />

      {/* Bottom Glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 820,
          height: 820,
          bottom: -330,
          right: -220,
          background: `
            radial-gradient(
              circle at center,
              rgba(255,59,59,0.04) 0%,
              rgba(255,59,59,0.015) 42%,
              transparent 74%
            )
          `,
          filter: 'blur(110px)',
          willChange: 'transform',
        }}
        animate={prefersReducedMotion ? undefined : glowBottom.animate}
        transition={prefersReducedMotion ? undefined : glowBottom.transition}
      />

      {/* Noise */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE_SVG,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
          opacity: 0.02,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Top Fade */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: '16%',
          background:
            'linear-gradient(to bottom, rgba(0,1,9,0.95) 0%, transparent 100%)',
        }}
      />

      {/* Bottom Fade */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: '36%',
          background:
            'linear-gradient(to top, rgba(0,1,9,0.88) 0%, transparent 100%)',
        }}
      />

      {/* Left Shadow */}
      <div
        className="absolute top-0 left-0 h-full"
        style={{
          width: '32%',
          background:
            'linear-gradient(to right, rgba(0,0,0,0.78) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}