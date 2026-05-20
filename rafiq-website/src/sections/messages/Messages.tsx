'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function Messages() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-24">

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center"
        >

          {/* MESSAGE */}
          <h2
            className="
              mx-auto max-w-4xl
              text-3xl font-black leading-[1.2]
              tracking-tight text-white
              sm:text-4xl
              lg:text-7xl
            "
          >
            <span className="text-[#FF3B3B]">“</span>

            {' '}
            <span className="font-display">
              Knowledge is power when it is used.
            </span>
            {' '}

            <span className="text-[#FF3B3B]">”</span>
          </h2>

          {/* BORDER */}
          <div className="mx-auto mt-10 h-px w-full max-w-2xl bg-white/10" />

          {/* PROFILE */}
          <div className="mt-8 flex items-center justify-center gap-4">

            {/* IMAGE */}
            <div
              className="
      relative h-20 w-20 overflow-hidden
      rounded-3xl
      border border-white/10
      shrink-0
    "
            >
              <Image
                src="/me.jpg"
                alt="Profile"
                fill
                className="object-cover"
              />
            </div>

            {/* INFO */}
            <div className="text-left">
              <h3 className="text-xl font-semibold text-white">
                Seif Ayman
              </h3>

              <p className="mt-1 text-sm tracking-wide text-white/45">
                Founder & Software Engineer
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}