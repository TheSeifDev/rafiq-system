'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Shield, Zap, Globe, Users, Rocket } from 'lucide-react';

const features = [
  {
    icon: Cpu,
    title: 'AI Engineering',
    desc: 'Building cutting-edge machine learning models and neural networks that power intelligent systems across industries.',
  },
  {
    icon: Shield,
    title: 'Cybersecurity',
    desc: 'Protecting digital infrastructures with advanced threat detection, encryption, and automated security protocols.',
  },
  {
    icon: Zap,
    title: 'Edge Computing',
    desc: 'Deploying high-performance AI directly on edge devices for real-time processing with minimal latency.',
  },
  {
    icon: Globe,
    title: 'Global Scale',
    desc: 'Designing distributed systems that operate seamlessly across regions with enterprise-grade reliability.',
  },
  {
    icon: Users,
    title: 'Collaborative',
    desc: 'A tight-knit team of 25 engineers, researchers, and designers working in agile, focused squads.',
  },
  {
    icon: Rocket,
    title: 'Fast Delivery',
    desc: 'From concept to production in record time without compromising on quality or security standards.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const About = () => {
  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-125 w-125 rounded-full bg-[#FF3B3B]/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#FF3B3B]">
            Who We Are
          </span>
          <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            About <span className="text-[#FF3B3B]">Phantoms</span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-white/60">
            Born from a shared obsession with the future, Phantoms is a collective of engineers and researchers
            pushing the boundaries of what artificial intelligence can achieve. We don&apos;t just write code —
            we architect intelligence.
          </p>
        </motion.div>
        {/* FEATURES GRID */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="mt-20 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map(({ icon: Icon, title, desc }) => (
            <motion.div
              key={title}
              className="group rounded-2xl border border-white/10 bg-white/3 p-6 backdrop-blur-md transition-all duration-300 hover:border-[#FF3B3B]/30 hover:bg-white/6"
            >
              <div className="flex items-center gap-4">
                <div className="shrink-0 rounded-xl bg-[#FF3B3B]/10 p-3 text-[#FF3B3B] transition-colors group-hover:bg-[#FF3B3B]/20">
                  <Icon size={22} strokeWidth={2} />
                </div>
                <h4 className="text-lg font-bold text-white">{title}</h4>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/50">{desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* BOTTOM CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 text-center"
        >
          <p className="text-white/40">
            Want to see what we&apos;re building next?
          </p>
          <button className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-md transition-all duration-300 hover:border-[#FF3B3B]/50 hover:bg-[#FF3B3B]/10 hover:text-[#FF3B3B]">
            Explore Our Projects
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default About;