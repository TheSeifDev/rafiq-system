'use client';

/**
 * Navbar — Production-grade animation architecture
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ARCHITECTURE CONTRACT (never violate these rules)              ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                  ║
 * ║  1. OUTER WRAPPER: style={{ y: springY }} ONLY.                 ║
 * ║     NO animate, NO variants, NO initial.                         ║
 * ║     Scroll behavior is 100% decoupled from mount animations.     ║
 * ║                                                                  ║
 * ║  2. GPU ACCELERATION via transformTemplate.                      ║
 * ║     We CANNOT use style={{ transform: 'translateZ(0)' }}         ║
 * ║     because Framer Motion overrides the raw `transform` CSS      ║
 * ║     property with its own generated string (from motion values). ║
 * ║     Raw `transform` in style would be silently discarded,        ║
 * ║     losing the GPU promotion entirely.                           ║
 * ║                                                                  ║
 * ║     SOLUTION: `transformTemplate` lets us append `translateZ(0)` ║
 * ║     to Framer Motion's generated transform string. Final CSS:    ║
 * ║       transform: translateY(-100px) translateZ(0)                ║
 * ║     This forces 3D compositing path = GPU layer. ✅              ║
 * ║                                                                  ║
 * ║  3. SCROLL DETECTION: useRef for lastY (zero re-renders).        ║
 * ║     useMotionValue + useSpring for Y position (zero re-renders). ║
 * ║     Native window scroll listener with passive:true for          ║
 * ║     maximum reliability across all browser environments.         ║
 * ║                                                                  ║
 * ║  4. bfcache RECOVERY: pageshow listener resets motion values     ║
 * ║     when browser restores page from back/forward cache.          ║
 * ║                                                                  ║
 * ║  5. CHILD ANIMATIONS: logo, pills, CTA use initial/animate       ║
 * ║     independently. They are NOT affected by parent springY.      ║
 * ║                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import Image from 'next/image';
import Link from 'next/link';
import {
  motion,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useRef, useEffect } from 'react';

import { menuItems } from '@/src/types/menuItems';

export default function Navbar() {

  // ── Motion values for scroll-driven Y position ────────────────────
  // These NEVER trigger React re-renders. Zero layout thrashing.
  const navY = useMotionValue(0);
  const springY = useSpring(navY, {
    stiffness: 260,
    damping: 30,
    restSpeed: 0.1,
    restDelta: 0.1,
  });

  // Tracks previous scroll position without causing re-renders.
  const lastScrollY = useRef(0);
  // Tracks whether navbar is currently hidden — avoids redundant .set() calls.
  const isHidden = useRef(false);

  // ── Scroll detection ─────────────────────────────────────────────
  // Using a native scroll event listener with `passive: true` for
  // maximum cross-browser reliability. Framer Motion's useScroll()
  // tracks the same window.scrollY but can have subtle timing
  // differences in SSR/hydration phases. The native listener is
  // the most robust approach and fires earliest in the event loop.
  useEffect(() => {
    const handleScroll = () => {
      // Clamp to 0 — iOS rubber-band scrolling can produce negative values.
      const current = Math.max(0, window.scrollY);
      const previous = lastScrollY.current;
      lastScrollY.current = current;

      const scrollingDown = current > previous;
      const pastThreshold = current > 80;

      if (scrollingDown && pastThreshold) {
        // Hide: scrolling DOWN past 80px
        if (!isHidden.current) {
          isHidden.current = true;
          navY.set(-100);
        }
      } else {
        // Show: scrolling UP, or near the top of the page
        if (isHidden.current || current <= 80) {
          isHidden.current = false;
          navY.set(0);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navY]);

  // ── bfcache recovery ─────────────────────────────────────────────
  // Browser back/forward button restores the JS heap including motion
  // values. If navY was at -100 when the user navigated away, it stays
  // at -100 on restore (navbar stuck hidden). pageshow + e.persisted
  // detects bfcache restore and resets all state.
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        navY.set(0);
        lastScrollY.current = 0;
        isHidden.current = false;
        document.documentElement.classList.add('bfcache-restored');
        setTimeout(() => {
          document.documentElement.classList.remove('bfcache-restored');
        }, 500);
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [navY]);

  return (

    <motion.header
      data-navbar
      style={{
        y: springY,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
      transformTemplate={(_, generated) => `${generated} translateZ(0px)`}
      className="fixed top-0 left-0 w-full z-9999 px-6 pt-5"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between">

        <motion.div
          initial={{ opacity: 0, x: -40, y: -25 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="flex items-center gap-3"
        >
          <Image
            src="/logo.png"
            alt="Phantoms Logo"
            width={56}
            height={56}
            priority
            className="
              h-14
              w-14
              shrink-0
              object-contain
              relative
              z-20
              drop-shadow-[0_0_20px_rgba(255,59,59,0.45)]
            "
          />

          <div className="flex flex-col leading-none">
            <span
              className="
                text-[1.05rem]
                font-black
                uppercase
                tracking-[0.16em]
                text-white
              "
            >
              Phantoms
            </span>

            <span className="mt-1 text-[10px] tracking-[0.22em] text-white/35 uppercase">
              AI Ecosystem
            </span>
          </div>
        </motion.div>
        <motion.nav
          initial={{
            opacity: 0,
            y: -70,
            scaleX: 0.05,
            borderRadius: '999px',
          }}
          animate={{
            opacity: 1,
            y: 0,
            scaleX: 1,
            borderRadius: '20px',
          }}
          transition={{
            duration: 1.2,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="
            absolute
            left-1/2
            -translate-x-1/2

            flex
            items-center
            gap-1

            rounded-[20px]

            border
            border-white/10

            bg-white/4

            px-2
            py-2

            backdrop-blur-2xl

            shadow-[0_0_30px_rgba(0,0,0,0.22)]
          "
        >

          {menuItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.15 + index * 0.05,
                duration: 0.45,
              }}
            >
              <Link
                href={item.link}
                aria-label={item.ariaLabel}
                className="
                  group
                  relative
                  flex
                  items-center
                  justify-center

                  overflow-hidden

                  rounded-xl

                  px-4
                  py-2

                  text-[13px]
                  font-medium
                  tracking-wide
                  text-white/65

                  transition-all
                  duration-300

                  hover:text-white
                "
              >
                {/* Hover BG */}
                <span
                  className="
                    absolute
                    inset-0
                    scale-0
                    rounded-xl
                    bg-white/5
                    opacity-0
                    transition-all
                    duration-300
                    group-hover:scale-100
                    group-hover:opacity-100
                  "
                />

                {/* Hover Glow */}
                <span
                  className="
                    absolute
                    inset-0
                    rounded-xl
                    opacity-0
                    shadow-[0_0_20px_rgba(255,59,59,0.18)]
                    transition-all
                    duration-300
                    group-hover:opacity-100
                  "
                />

                <span className="relative z-10">
                  {item.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.nav>

        {/* ── RIGHT — CTA Button ────────────────────────────────────
            Child mount animation. Slides in from right.
            Fully independent of header's springY.
        */}
        <motion.div
          initial={{ opacity: 0, x: 40, y: -20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{
            duration: 0.65,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <button
            className="
              group
              relative

              flex
              items-center
              gap-2

              overflow-hidden

              rounded-xl

              border
              border-white/10

              bg-white/4.5

              px-4
              py-2.5

              backdrop-blur-2xl

              shadow-[0_0_18px_rgba(0,0,0,0.14)]

              transition-all
              duration-300

              hover:border-[#FF3B3B]/40
              hover:bg-white/6
              hover:shadow-[0_0_28px_rgba(255,59,59,0.12)]
              hover:-translate-y-px

              cursor-pointer
            "
          >
            {/* Gradient Glow */}
            <div
              className="
                absolute
                inset-0
                opacity-0
                transition-opacity
                duration-500
                group-hover:opacity-100
                bg-[radial-gradient(circle_at_top,rgba(255,59,59,0.14),transparent_70%)]
              "
            />

            {/* Top Shine */}
            <div
              className="
                absolute
                inset-x-0
                top-0
                h-px
                bg-linear-to-r
                from-transparent
                via-white/20
                to-transparent
              "
            />

            {/* Text */}
            <div className="relative z-10 flex flex-col items-start leading-none">
              <span
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.18em]
                  text-white/30
                "
              >
                Open System
              </span>

              <span
                className="
                  mt-0.5
                  text-[13px]
                  font-semibold
                  tracking-wide
                  text-white
                "
              >
                RAFIQ
              </span>
            </div>

            {/* Icon */}
            <ArrowUpRight
              className="
                relative
                z-10
                h-3.5
                w-3.5
                text-white/45
                transition-all
                duration-300
                group-hover:text-white
                group-hover:translate-x-0.5
                group-hover:-translate-y-0.5
              "
            />
          </button>
        </motion.div>
      </nav>
    </motion.header>
  );
}