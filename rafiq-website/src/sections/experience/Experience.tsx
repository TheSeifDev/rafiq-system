'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
const experiences = [
  {
    id: 1,
    role: 'AI & Healthcare Systems',
    company: 'RAFIQ Project',
    period: '2025 — Present',
    description:
      'Built intelligent healthcare ecosystems combining AI assistance, smart monitoring, emergency automation, and real-time patient interaction workflows for the RAFIQ platform.',
  },
  {
    id: 2,
    role: 'Smart Home Integration',
    company: 'Home Assistant Ecosystem',
    period: '2026',
    description:
      'Integrated smart home environments with automation systems, IoT devices, and centralized control layers using Home Assistant for seamless connected experiences.',
  },
  {
    id: 3,
    role: 'Cybersecurity & Infrastructure',
    company: 'Phantoms Team',
    period: '2020 — 2026',
    description:
      'Designed secure architectures, protected APIs, authentication systems, and optimized backend infrastructure focused on stability, scalability, and system reliability.',
  },
  {
    id: 4,
    role: 'Mobile & Full-Stack Development',
    company: 'RAFIQ App',
    period: '2025 — Present',
    description:
      'Developed cross-platform mobile experiences with Expo and React Native alongside scalable full-stack web systems using Next.js, TypeScript, and Supabase.',
  },
  {
    id: 5,
    role: 'Embedded Systems & IoT',
    company: 'Smart Automation Lab',
    period: '2026 — Present',
    description:
      'Worked on embedded hardware integration, sensors, monitoring systems, and real-world automation logic for smart healthcare and environmental control systems.',
  },
  {
    id: 6,
    role: 'UI/UX & Brand Experience',
    company: 'Phantoms Creative',
    period: '2022 — Present',
    description:
      'Created futuristic user interfaces, cinematic landing pages, responsive dashboards, and premium digital branding experiences focused on clarity and modern aesthetics.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

export default function Experience() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">

        {/* Top Label */}
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40"
        >
          Experience
        </motion.span>

        {/* Header Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-8 grid grid-cols-1 gap-6 border-b border-white/10 pb-10 sm:grid-cols-2 sm:gap-12 sm:pb-14"
        >
          <h2 className="text-3xl font-semibold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-[2.75rem] font-display ">
            A yearly snapshot of<br />our creative growth
          </h2>
          <p className="self-end text-sm leading-relaxed text-white/50 sm:text-base">
            We craft intelligent digital systems focused on AI, healthcare,
            smart automation, and immersive user experiences combining
            modern engineering with futuristic design to build impactful
            technology for the real world.
          </p>
        </motion.div>

        {/* Experience List */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="mt-2"
        >
          {experiences.map((exp) => (
            <motion.div
              key={exp.id}
              variants={itemVariants}
              className="group relative cursor-pointer border-b border-white/10 py-8 transition-all duration-500 last:border-b-0 sm:py-10"
            >
              {/* Hover Background */}
              <div className="absolute inset-0 -mx-4 -my-2 rounded-2xl bg-white/2 opacity-0 transition-all duration-500 group-hover:opacity-100 sm:-mx-6 sm:-my-4" />

              {/* Hover Glow Line */}
              <div className="absolute bottom-0 left-0 h-px w-0 bg-[#FF3B3B] transition-all duration-700 group-hover:w-full" />

              <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:gap-8">

                {/* Left: Role + Company + Description */}
                <div className="max-w-lg">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-white transition-colors duration-300 group-hover:text-[#FF3B3B] sm:text-lg">
                      {exp.role}
                    </h3>
                    <span className="font-normal text-white/40">at</span>
                    <span className="font-semibold text-white transition-colors duration-300 group-hover:text-white/90">{exp.company}</span>
                    <ArrowUpRight
                      size={16}
                      className="ml-1 text-white/0 transition-all duration-300 group-hover:text-[#FF3B3B] sm:ml-2"
                    />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-white/50 transition-colors duration-300 group-hover:text-white/70">
                    {exp.description}
                  </p>
                </div>

                {/* Right: Period */}
                <div className="shrink-0 text-2xl font-semibold tracking-tight text-white/80 transition-all duration-500 group-hover:text-white group-hover:translate-x-1 sm:text-3xl lg:text-4xl font-display ">
                  {exp.period}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}