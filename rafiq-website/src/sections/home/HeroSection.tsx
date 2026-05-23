'use client';

import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen bg-[#000109] text-white flex items-center overflow-hidden">
      <div 
        className="absolute inset-0 z-0 bg-no-repeat bg-center sm:bg-right bg-[length:90%_auto] sm:bg-[length:50%_auto] lg:bg-contain opacity-40 sm:opacity-100 transition-all duration-700"
        style={{ backgroundImage: "url('/phantom-mask.png')" }}
      />

      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,59,59,0.05),transparent_50%)] pointer-events-none" />

      <div className="relative z-10 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md sm:max-w-xl md:max-w-2xl"
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF3B3B] animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#FF3B3B]/80 font-bold">
              SYSTEM_INIT // CORE_DECK
            </span>
          </div>

          <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl font-display">
            We Are <br />
            <span className="relative text-[#FF3B3B] drop-shadow-[0_0_20px_rgba(255,59,59,0.2)]">
              Phantoms
            </span>
          </h1>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/70 sm:text-base md:text-lg">
            A futuristic AI engineering team building intelligent healthcare,
            smart automation, cybersecurity systems, and edge AI ecosystems.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-4 max-w-md">
            {[
              ['12+', 'Projects'],
              ['1+', 'Years'],
              ['25', 'Members'],
            ].map(([num, label], i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, borderColor: 'rgba(255,59,59,0.2)', backgroundColor: 'rgba(255,59,59,0.02)' }}
                className="relative rounded-xl border border-white/5 bg-white/[0.02] p-3 backdrop-blur-md sm:rounded-2xl sm:p-4 transition-colors duration-300 group"
              >
                <div className="absolute top-0 left-4 h-[1px] w-4 bg-[#FF3B3B]/0 group-hover:bg-[#FF3B3B]/50 transition-all duration-300" />
                <h3 className="text-lg font-black text-[#FF3B3B] sm:text-xl md:text-2xl tracking-tight">
                  {num}
                </h3>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-white/40 group-hover:text-white/60 transition-colors sm:text-xs">
                  {label}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 sm:mt-12">
            <button
              className="
                group relative overflow-hidden
                rounded-xl sm:rounded-2xl
                bg-[#FF3B3B]
                px-6 py-3.5
                text-sm font-bold
                text-white
                shadow-[0_0_30px_rgba(255,59,59,0.25)]
                transition-all
                duration-300
                hover:scale-[1.03] hover:shadow-[0_0_50px_rgba(255,59,59,0.45)]
                active:scale-98
                sm:px-8 sm:py-4 sm:text-base
                cursor-pointer
              "
            >
              <span className="relative z-10 flex items-center gap-2">
                Let's Work Together
                <span className="text-xs transition-transform duration-300 group-hover:translate-x-1">→</span>
              </span>
              <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)] transition-transform duration-600 ease-out group-hover:translate-x-full" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}