'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Calendar, Briefcase, Sparkles, Activity } from 'lucide-react';

const stats = [
  { title: 'Projects Completed', value: '12+' },
  { title: 'Systems Built', value: '2+' },
  { title: 'Years Experience', value: '1+' },
  { title: 'Innovation', value: '24/7' },
];

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
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1] as const, // تم إضافة as const هنا لحل المشكلة
    },
  },
};

export default function Page() {
  return (
    <main className="relative overflow-hidden bg-[#02020ddc] text-white min-h-screen selection:bg-[#FF3B3B]/30 selection:text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute left-[-15%] top-[-5%] h-[600px] w-[600px] rounded-full bg-[#FF3B3B]/8 blur-160px]" />
        <div className="absolute right-[-10%] top-[40%] h-[500px] w-[500px] rounded-full bg-[#FF3B3B]/4 blur-160px]" />
        <div className="absolute left-[20%] bottom-[-10%] h-[550px] w-[550px] rounded-full bg-[#FF3B3B]/6 blur-180px]" />
        <div 
          className="absolute inset-0 opacity-25 mix-blend-overlay"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
            maskImage: 'radial-gradient(circle at center, black, transparent 90%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 90%)'
          }}
        />
      </div>

      <section className="relative z-10 px-4 pt-36 pb-24 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid gap-16 lg:grid-cols-[1fr_460px] lg:items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.25em] text-[#FF3B3B] backdrop-blur-xl shadow-inner shadow-white/5"
            >
              <Activity size={12} className="animate-pulse text-[#FF3B3B]" />
              Engineering Portfolio
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] as const }}
              className="mt-6 text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-8xl font-display"
            >
              Building <br />
              Intelligent <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-[#FF3B3B] via-[#ff6b6b] to-white drop-shadow-[0_0_35px_rgba(255,59,59,0.25)]">Systems.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
              className="mt-8 max-w-xl text-base leading-relaxed text-white/50 sm:text-lg font-light"
            >
              A journey through AI engineering, cybersecurity, healthcare systems, automation, embedded technologies, and next-generation digital experiences crafted by Phantoms.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] as const }}
            className="grid grid-cols-2 gap-4 sm:gap-5"
          >
            {stats.map((item) => (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-[24px] border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent p-6 backdrop-blur-2xl transition-all duration-500 hover:border-[#FF3B3B]/20 hover:from-white/[0.05] hover:to-[#FF3B3B]/[0.01] hover:shadow-[0_12px_40px_rgba(255,59,59,0.03)]"
              >
                <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#FF3B3B]/10 blur-2xl transition-all duration-500 group-hover:bg-[#FF3B3B]/15" />
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <h3 className="text-4xl font-black tracking-tight text-white font-display group-hover:text-[#FF3B3B] transition-colors duration-300 sm:text-5xl">
                    {item.value}
                  </h3>
                  <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors duration-300">
                    {item.title}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="mt-36">
          <div className="mb-16 flex flex-col gap-6 border-b border-white/5 pb-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#FF3B3B] font-bold">
                <Sparkles size={12} />
                Timeline
              </span>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl font-display leading-tight">
                Creative & Technical <br />
                Evolution
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-relaxed text-white/40 sm:text-base font-light lg:mb-1">
              Combining engineering precision with futuristic design to create scalable systems, immersive interfaces, and intelligent real-world technologies.
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-[#FF3B3B]/40 via-white/5 to-transparent md:left-1/2 md:-ml-px pointer-events-none" />

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              className="space-y-6 md:space-y-12"
            >
              {experiences.map((exp, index) => {
                const isEven = index % 2 === 0;
                return (
                  <motion.div
                    key={exp.id}
                    variants={itemVariants}
                    className={`relative flex flex-col md:flex-row ${isEven ? 'md:flex-row-reverse' : ''} gap-8 items-stretch`}
                  >
                    <div className="absolute left-[15px] top-7 h-2 w-2 rounded-full bg-[#FF3B3B] -translate-x-1/2 ring-4 ring-[#FF3B3B]/20 z-20 md:left-1/2 md:translate-x-[-50%]" />

                    <div className="w-full md:w-1/2 flex" />

                    <motion.div 
                      whileHover={{ y: -4, border: '1px solid rgba(255, 59, 59, 0.2)' }}
                      className="group w-full md:w-1/2 relative rounded-[28px] border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-6 sm:p-8 backdrop-blur-xl transition-all duration-500 hover:bg-white/[0.03] hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] pl-10 md:pl-8"
                    >
                      <div className="absolute top-6 right-6 flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40 transition-all duration-300 group-hover:border-[#FF3B3B]/20 group-hover:text-[#FF3B3B] group-hover:bg-[#FF3B3B]/5">
                        <Calendar size={10} />
                        {exp.period}
                      </div>

                      <div className="flex items-center gap-2 text-[#FF3B3B]/80 text-xs font-semibold uppercase tracking-wider">
                        <Briefcase size={12} />
                        <span>{exp.company}</span>
                      </div>

                      <div className="mt-4 flex items-start gap-2 max-w-[85%]">
                        <h3 className="text-lg font-black tracking-tight text-white transition-colors duration-300 group-hover:text-[#FF3B3B] sm:text-xl font-display">
                          {exp.role}
                        </h3>
                        <ArrowUpRight
                          size={18}
                          className="text-[#FF3B3B] opacity-0 -translate-x-1 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 shrink-0 mt-1"
                        />
                      </div>

                      <p className="mt-4 text-sm leading-relaxed text-white/50 transition-colors duration-300 group-hover:text-white/70 font-light">
                        {exp.description}
                      </p>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
          className="relative overflow-hidden mt-36 rounded-[32px] border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-8 text-center backdrop-blur-3xl sm:p-20 shadow-[0_30px_100px_rgba(0,0,0,0.4)]"
        >
          <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-[#FF3B3B]/8 blur-3xl pointer-events-none" />
          <div className="absolute -right-20 -bottom-20 h-48 w-48 rounded-full bg-[#FF3B3B]/8 blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl font-display leading-tight">
              Ready To Work <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-[#FF3B3B] via-[#ff7676] to-white drop-shadow-[0_0_30px_rgba(255,59,59,0.25)]">Together?</span>
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/40 sm:text-base font-light">
              Let’s build scalable systems, intelligent platforms, and futuristic experiences engineered for impact.
            </p>

            <div className="mt-12">
              <Link
                href="/contact"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-[#FF3B3B] px-10 py-5 text-sm font-bold text-white shadow-[0_10px_35px_rgba(255,59,59,0.25)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_15px_50px_rgba(255,59,59,0.45)] active:scale-98"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start a Project
                  <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
                <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] transition-transform duration-700 ease-out group-hover:translate-x-full" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}