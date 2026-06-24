"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";

import {
  ArrowUpRight,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";

import { useRef, useEffect, useState } from "react";

import { menuItems, moreLinks, rafiqLinks } from "@/src/types/menuItems";


export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  const isRafiqRoute = pathname === "/rafiq" || pathname.startsWith("/rafiq/");

  // ─── scroll hide / show ───────────────────────────────────────────────────
  const navY = useMotionValue(0);
  const springY = useSpring(navY, { stiffness: 260, damping: 30, restSpeed: 0.1, restDelta: 0.1 });
  const lastScrollY = useRef(0);
  const isHidden = useRef(false);

  // keep a timer so hovering the dropdown keeps it open
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMore = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMoreOpen(true);
  };
  const closeMore = () => {
    closeTimer.current = setTimeout(() => setMoreOpen(false), 120);
  };

  useEffect(() => {
    const handleScroll = () => {
      const current = Math.max(0, window.scrollY);
      const previous = lastScrollY.current;
      lastScrollY.current = current;
      const scrollingDown = current > previous;
      const pastThreshold = current > 80;

      if (scrollingDown && pastThreshold) {
        if (!isHidden.current) { isHidden.current = true; navY.set(-100); }
      } else {
        if (isHidden.current || current <= 80) { isHidden.current = false; navY.set(0); }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [navY]);

  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        navY.set(0);
        lastScrollY.current = 0;
        isHidden.current = false;
        document.documentElement.classList.add("bfcache-restored");
        setTimeout(() => document.documentElement.classList.remove("bfcache-restored"), 500);
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [navY]);

  useEffect(() => {
    if (!mobileOpen) return;
    const close = () => setMobileOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [mobileOpen]);

  return (
    <>
      <motion.header
        data-navbar
        style={{ y: springY, willChange: "transform", backfaceVisibility: "hidden" }}
        transformTemplate={(_, generated) => `${generated} translateZ(0px)`}
        className="
          fixed left-0 top-0 z-[9999] w-full
          px-4 pt-4
          sm:px-6 sm:pt-5
        "
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between">

          {/* ── LEFT – logo ── */}
          <motion.div
            initial={{ opacity: 0, x: -40, y: -25 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2 sm:gap-3"
          >
            <Image
              src="/logo.png" alt="Phantoms Logo" width={56} height={56} priority
              className="
                relative z-20 h-11 w-11 shrink-0 object-contain
                drop-shadow-[0_0_20px_rgba(255,59,59,0.45)]
                sm:h-14 sm:w-14
              "
            />
            <div className="flex flex-col leading-none">
              <span className="text-[0.95rem] font-black uppercase tracking-[0.14em] text-white sm:text-[1.05rem] sm:tracking-[0.16em]">
                Phantoms
              </span>
              <span className="mt-1 text-[9px] uppercase tracking-[0.18em] text-white/35 sm:text-[10px] sm:tracking-[0.22em]">
                AI Ecosystem
              </span>
            </div>
          </motion.div>

          {/* ── DESKTOP NAV ── */}
          <motion.nav
            initial={{ opacity: 0, y: -70, scaleX: 0.05, borderRadius: "999px" }}
            animate={{ opacity: 1, y: 0, scaleX: 1, borderRadius: "20px" }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="
              absolute left-1/2 hidden -translate-x-1/2
              items-center gap-1 rounded-[20px]
              border border-white/10 bg-white/4
              px-2 py-2 backdrop-blur-2xl
              shadow-[0_0_30px_rgba(0,0,0,0.22)]
              lg:flex
            "
          >
            {/* regular items */}
            {menuItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.05, duration: 0.45 }}
              >
                <Link
                  href={item.link}
                  aria-label={item.ariaLabel}
                  className="
                    group relative flex items-center justify-center
                    overflow-hidden rounded-xl px-4 py-2
                    text-[13px] font-medium tracking-wide text-white/65
                    transition-all duration-300 hover:text-white
                  "
                >
                  <span className="absolute inset-0 scale-0 rounded-xl bg-white/5 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
                  <span className="absolute inset-0 rounded-xl opacity-0 shadow-[0_0_20px_rgba(255,59,59,0.18)] transition-all duration-300 group-hover:opacity-100" />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              </motion.div>
            ))}

            {/* ── More button (hover-triggered) ── */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + menuItems.length * 0.05, duration: 0.45 }}
              className="relative"
              onMouseEnter={openMore}
              onMouseLeave={closeMore}
            >
              <button
                className="
                  group relative flex items-center gap-1.5
                  overflow-hidden rounded-xl px-4 py-2
                  text-[13px] font-medium tracking-wide text-white/65
                  transition-all duration-300 hover:text-white
                "
              >
                <span className="absolute inset-0 scale-0 rounded-xl bg-white/5 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
                <span className="absolute inset-0 rounded-xl opacity-0 shadow-[0_0_20px_rgba(255,59,59,0.18)] transition-all duration-300 group-hover:opacity-100" />
                <span className="relative z-10">More</span>
                <ChevronDown
                  className={`relative z-10 h-3.5 w-3.5 transition-transform duration-300 ${moreOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* ── Dropdown panel ── */}
              <AnimatePresence>
                {moreOpen && (
<motion.div
  initial={{ opacity: 0, y: -8, scale: 0.97 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: -8, scale: 0.97 }}
  transition={{
    duration: 0.22,
    ease: [0.22, 1, 0.36, 1],
  }}
  className="
    absolute
    left-1/2
    top-[calc(100%+10px)]
    -translate-x-1/2
    z-[99999]

    w-[28rem]
    overflow-hidden

    rounded-[22px]

    border border-white/10

    bg-[#05070F]/80

    supports-[backdrop-filter]:bg-[#05070F]/55
    backdrop-blur-[45px]
    backdrop-saturate-[180%]

    shadow-[0_20px_80px_rgba(0,0,0,0.55)]

    p-3
  "
  onMouseEnter={openMore}
  onMouseLeave={closeMore}
>
                    <div
  className="
    absolute inset-0 -z-10
    bg-[radial-gradient(circle_at_top,rgba(255,59,59,0.08),transparent_45%)]
  "
/>

<div
  className="
    absolute inset-0 -z-10
    bg-[#05070F]/55
    backdrop-blur-[50px]
  "
/>
                    {/* extra nav links — row */}
                    <div className="flex gap-1">
                      {moreLinks.map((item) => (
                        <Link
                          key={item.label}
                          href={item.link}
                          aria-label={item.ariaLabel}
                          onClick={() => setMoreOpen(false)}
                          className="
                            group relative flex flex-1 items-center justify-between
                            overflow-hidden rounded-xl px-3 py-2.5
                            text-[13px] font-medium tracking-wide text-white/65
                            transition-all duration-300 hover:text-white
                          "
                        >
                          <span className="absolute inset-0 scale-0 rounded-xl bg-white/5 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
                          <span className="absolute inset-0 rounded-xl opacity-0 shadow-[0_0_20px_rgba(255,59,59,0.18)] transition-all duration-300 group-hover:opacity-100" />
                          <span className="relative z-10">{item.label}</span>
                          <ArrowUpRight className="relative z-10 h-3.5 w-3.5 text-white/30 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                        </Link>
                      ))}
                    </div>

                    {/* ── divider ── */}
                    <hr className="my-3 border-white/10" />

                    {/* ── Rafiq links ── */}
                    <p className="mb-2 px-3 text-[10px] uppercase tracking-[0.2em] text-white/30">
                      Rafiq
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {rafiqLinks.map(({ label, link, icon: Icon }) => (
                        <Link
                          key={label}
                          href={link}
                          onClick={() => setMoreOpen(false)}
                          className="
                            group relative flex items-center gap-2
                            overflow-hidden rounded-xl px-3 py-2
                            text-[12px] font-medium tracking-wide text-white/55
                            transition-all duration-300 hover:text-white
                          "
                        >
                          <span className="absolute inset-0 scale-0 rounded-xl bg-white/5 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
                          <span className="absolute inset-0 rounded-xl opacity-0 shadow-[0_0_20px_rgba(255,59,59,0.12)] transition-all duration-300 group-hover:opacity-100" />
                          <Icon className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#FF3B3B]/70 transition-colors duration-300 group-hover:text-[#FF3B3B]" />
                          <span className="relative z-10 truncate">{label}</span>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.nav>

          {/* ── RIGHT ── */}
          <div className="flex items-center gap-2">
            {/* DESKTOP CTA */}
            <motion.div
              initial={{ opacity: 0, x: 40, y: -20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="hidden sm:block"
            >
              <Link
                href={isRafiqRoute ? "/" : "/rafiq"}
                className="
                  group relative flex items-center gap-2
                  overflow-hidden rounded-xl
                  border border-white/10 bg-white/4.5
                  px-4 py-2.5 backdrop-blur-2xl
                  shadow-[0_0_18px_rgba(0,0,0,0.14)]
                  transition-all duration-300
                  hover:-translate-y-px hover:border-[#FF3B3B]/40
                  hover:bg-white/6 hover:shadow-[0_0_28px_rgba(255,59,59,0.12)]
                "
              >
                <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(255,59,59,0.14),transparent_70%)]" />
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
                <div className="relative z-10 flex flex-col items-start leading-none">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                    {isRafiqRoute ? "Back To" : "Open System"}
                  </span>
                  <span className="mt-0.5 text-[13px] font-semibold tracking-wide text-white">
                    {isRafiqRoute ? "HOME" : "RAFIQ"}
                  </span>
                </div>
                <ArrowUpRight className="relative z-10 h-3.5 w-3.5 text-white/45 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
              </Link>
            </motion.div>

            {/* MOBILE MENU BUTTON */}
            <motion.button
              initial={{ opacity: 0, x: 30, y: -20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.6 }}
              onClick={() => setMobileOpen(!mobileOpen)}
              className="
                relative flex h-11 w-11 items-center justify-center
                rounded-xl border border-white/10 bg-white/4
                text-white backdrop-blur-2xl
                transition-all duration-300
                hover:border-[#FF3B3B]/30 hover:bg-white/6
                lg:hidden
              "
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </motion.button>
          </div>
        </nav>
      </motion.header>

      {/* ── MOBILE MENU ── */}
      <motion.header>
        {mobileOpen && (
          <>
            {/* BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[9990] bg-[#000109]/70 backdrop-blur-md lg:hidden"
            />

            {/* PANEL */}
            <motion.div
              initial={{ opacity: 0, y: -30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="
                fixed left-4 right-4 top-22 z-[9991]
                overflow-hidden rounded-3xl
                border border-white/10 bg-[#060812]/90
                p-4 backdrop-blur-2xl
                shadow-[0_0_50px_rgba(0,0,0,0.35)]
                lg:hidden
              "
            >
              {/* regular links */}
              <div className="space-y-2">
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <Link
                      href={item.link}
                      aria-label={item.ariaLabel}
                      onClick={() => setMobileOpen(false)}
                      className="
                        group relative flex items-center justify-between
                        overflow-hidden rounded-2xl
                        border border-white/6 bg-white/3
                        px-4 py-3
                        transition-all duration-300
                        hover:border-[#FF3B3B]/30 hover:bg-white/5
                      "
                    >
                      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_left,rgba(255,59,59,0.14),transparent_70%)]" />
                      <span className="relative z-10 text-sm font-medium tracking-wide text-white/80">{item.label}</span>
                      <ArrowUpRight className="relative z-10 h-4 w-4 text-white/35 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                    </Link>
                  </motion.div>
                ))}

                {/* More links in mobile */}
                {moreLinks.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (menuItems.length + index) * 0.04 }}
                  >
                    <Link
                      href={item.link}
                      aria-label={item.ariaLabel}
                      onClick={() => setMobileOpen(false)}
                      className="
                        group relative flex items-center justify-between
                        overflow-hidden rounded-2xl
                        border border-white/6 bg-white/3
                        px-4 py-3
                        transition-all duration-300
                        hover:border-[#FF3B3B]/30 hover:bg-white/5
                      "
                    >
                      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_left,rgba(255,59,59,0.14),transparent_70%)]" />
                      <span className="relative z-10 text-sm font-medium tracking-wide text-white/80">{item.label}</span>
                      <ArrowUpRight className="relative z-10 h-4 w-4 text-white/35 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* ── Divider ── */}
              <hr className="my-4 border-white/10" />

              {/* ── Rafiq links in mobile ── */}
              <p className="mb-3 px-1 text-[10px] uppercase tracking-[0.2em] text-white/30">Rafiq</p>
              <div className="grid grid-cols-2 gap-2">
                {rafiqLinks.map(({ label, link, icon: Icon }, index) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (menuItems.length + moreLinks.length + index) * 0.03 }}
                  >
                    <Link
                      href={link}
                      onClick={() => setMobileOpen(false)}
                      className="
                        group relative flex items-center gap-2
                        overflow-hidden rounded-2xl
                        border border-white/6 bg-white/3
                        px-3 py-2.5
                        transition-all duration-300
                        hover:border-[#FF3B3B]/30 hover:bg-white/5
                      "
                    >
                      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_left,rgba(255,59,59,0.10),transparent_70%)]" />
                      <Icon className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#FF3B3B]/70 transition-colors duration-300 group-hover:text-[#FF3B3B]" />
                      <span className="relative z-10 truncate text-[12px] font-medium tracking-wide text-white/70">{label}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* MOBILE CTA */}
              <Link
                href="/rafiq"
                onClick={() => setMobileOpen(false)}
                className="
                  group relative mt-4
                  flex items-center justify-between
                  overflow-hidden rounded-2xl
                  border border-[#FF3B3B]/20 bg-[#FF3B3B]/10
                  px-4 py-3.5
                  transition-all duration-300
                  hover:border-[#FF3B3B]/40
                "
              >
                <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_center,rgba(255,59,59,0.18),transparent_70%)]" />
                <div className="relative z-10">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Open System</p>
                  <p className="mt-1 text-sm font-semibold tracking-wide text-white">RAFIQ Platform</p>
                </div>
                <ArrowUpRight className="relative z-10 h-4 w-4 text-white/60" />
              </Link>
            </motion.div>
          </>
        )}
      </motion.header>
    </>
  );
}