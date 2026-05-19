'use client';

import { motion } from 'framer-motion';


export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/phantom-mask.png')" }}
    >
      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen max-w-7xl flex-col px-4 sm:px-6 lg:px-8">

        {/* LEFT — smaller & shifted more to the left */}
        <div className="flex flex-1 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="w-full max-w-md py-16 sm:max-w-lg sm:py-20 lg:max-w-xl"
          >
            {/* TITLE */}
            <h1 className="text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
              We Are <br />
              <span className="text-[#FF3B3B]">Phantoms</span>
            </h1>

            {/* DESCRIPTION */}
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/80 sm:text-base md:text-lg">
              A futuristic AI engineering team building intelligent healthcare,
              smart automation, cybersecurity systems, and edge AI ecosystems.
            </p>

            {/* STATS */}
            <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
              {[
                ['12+', 'Projects'],
                ['1+', 'Years'],
                ['25', 'Members'],
              ].map(([num, label], i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md sm:rounded-2xl sm:p-4"
                >
                  <h3 className="text-lg font-black text-[#FF3B3B] sm:text-xl md:text-2xl">
                    {num}
                  </h3>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/50 sm:text-xs">
                    {label}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-8 sm:mt-10">
              <button
                className="
                  group relative overflow-hidden
                  rounded-2xl
                  bg-[#FF3B3B]
                  px-5 py-3
                  text-sm font-bold
                  text-white
                  shadow-[0_0_40px_rgba(255,59,59,0.3)]
                  transition-all
                  duration-300
                  hover:scale-105 hover:shadow-[0_0_60px_rgba(255,59,59,0.5)]
                  active:scale-95
                  sm:px-7 sm:py-3.5 sm:text-base
                  cursor-pointer
                "
              >
                <span className="relative z-10">Let’s Work Together</span>
                <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-0" />
              </button>
            </div>
          </motion.div>
        </div>

      </div>
      {/* BOTTOM CARDS — Mission & Vision (SIDE BY SIDE) */}
    </section>
  );
}