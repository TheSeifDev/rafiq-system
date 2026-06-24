'use client';

import { motion } from 'framer-motion';
import { Target, Eye } from 'lucide-react';

const Bottom = () => {
  return (
    <div className="mx-auto -mt-10 grid w-full max-w-6xl grid-cols-1 gap-4 pb-4 sm:grid-cols-2 sm:gap-6 sm:-mt-14 lg:gap-8">

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="group rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-colors hover:bg-white/10 sm:p-6"
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-xl bg-[#FF3B3B]/10 p-3 text-[#FF3B3B]">
            <Target size={22} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white sm:text-base">
              Our Mission
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="group rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-colors hover:bg-white/10 sm:p-6"
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-xl bg-[#FF3B3B]/10 p-3 text-[#FF3B3B]">
            <Eye size={22} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white sm:text-base">
              Our Vision
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Bottom;