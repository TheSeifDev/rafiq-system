'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Calendar, Briefcase } from 'lucide-react';

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
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export default function Experience() {
  return (
    <section className="relative overflow-hidden bg-[#02020d] text-white py-20 sm:py-28 selection:bg-[#FF3B3B]/30 selection:text-white">
      {/* الخلفية المضيئة الموحدة لجمالية الـ Premium Design */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute right-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-[#FF3B3B]/5 blur-[140px]" />
        <div className="absolute left-[-10%] bottom-[-10%] h-[500px] w-[500px] rounded-full bg-[#FF3B3B]/3 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#FF3B3B]"
        >
          <Briefcase size={12} />
          Experience
        </motion.span>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 grid grid-cols-1 gap-6 border-b border-white/5 pb-10 sm:grid-cols-2 sm:gap-12 sm:pb-14"
        >
          <h2 className="text-3xl font-black leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-[2.75rem] font-display">
            A yearly snapshot of<br />our creative growth
          </h2>
          <p className="self-end text-sm leading-relaxed text-white/50 sm:text-base font-light">
            We craft intelligent digital systems focused on AI, healthcare,
            smart automation, and immersive user experiences combining
            modern engineering with futuristic design to build impactful
            technology for the real world.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="mt-4 space-y-4"
        >
          {experiences.map((exp) => (
            <motion.div
              key={exp.id}
              variants={itemVariants}
              whileHover={{ y: -4, border: '1px solid rgba(255, 59, 59, 0.15)' }}
              className="group relative rounded-[24px] border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-6 sm:p-8 backdrop-blur-xl transition-all duration-500 hover:bg-white/[0.04] hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
            >
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:gap-8">
                <div className="max-w-xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FF3B3B]/80">
                    <span>{exp.company}</span>
                    <span className="font-normal text-white/30 lowercase">at</span>
                    <div className="inline-flex items-center gap-1 rounded-full border border-white/5 bg-white/[0.02] px-2.5 py-0.5 text-[10px] text-white/40 group-hover:text-[#FF3B3B] group-hover:bg-[#FF3B3B]/5 transition-colors duration-300">
                      <Calendar size={10} />
                      {exp.period}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1">
                    <h3 className="text-lg font-black tracking-tight text-white transition-colors duration-300 group-hover:text-[#FF3B3B] sm:text-xl font-display">
                      {exp.role}
                    </h3>
                    <ArrowUpRight
                      size={18}
                      className="text-[#FF3B3B] opacity-0 -translate-x-1 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 shrink-0"
                    />
                  </div>
                  
                  <p className="mt-3 text-sm leading-relaxed text-white/50 transition-colors duration-300 group-hover:text-white/70 font-light">
                    {exp.description}
                  </p>
                </div>

                <div className="shrink-0 text-xl font-black tracking-tight text-white/30 transition-all duration-500 group-hover:text-white/80 sm:text-2xl lg:text-3xl font-display">
                  #{exp.id.toString().padStart(2, '0')}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}