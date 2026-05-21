'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import {
  ArrowUpRight,
} from 'lucide-react';

const stats = [
  {
    title: 'Projects',
    value: '12+',
  },
  {
    title: 'Systems Built',
    value: '2+',
  },
  {
    title: 'Years Experience',
    value: '1+',
  },
  {
    title: 'Innovation',
    value: '24/7',
  },
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

export default function Page() {
  return (
    <main className="relative overflow-hidden bg-[#000109] text-white mb-8  ">

      
      <div className="absolute inset-0 overflow-hidden">

        
        <div
          className="
            absolute left-[-10%] top-[5%]

            h-112.5 w-112.5

            rounded-full

            bg-[#FF3B3B]/10

            blur-[140px]
          "
        />

        <div
          className="
            absolute bottom-[-10%] right-[-5%]
            h-100 w-100
            rounded-full
            blur-[140px]
          "
        />

        
        <div
          className="
            absolute inset-0

            bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]

            bg-size-[70px_70px]

            mask-[radial-gradient(circle_at_center,black,transparent_85%)]
          "
        />
      </div>

      
      <section
        className="
          relative z-10

          px-4 pt-32

          sm:px-6
          lg:px-8
        "
      >
        <div className="mx-auto max-w-7xl">

          <div className="grid gap-16 lg:grid-cols-[1fr_420px] lg:items-center">

            
            <div>

              
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="
                  inline-flex items-center gap-2

                  rounded-full

                  border border-white/10

                  bg-white/3

                  px-4 py-2

                  text-[11px]
                  font-semibold
                  uppercase

                  tracking-[0.25em]

                  text-[#FF3B3B]

                  backdrop-blur-xl
                "
              >

                Experience
              </motion.div>

              
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="
                  mt-8
                  text-5xl
                  font-black
                  leading-[0.9]
                  tracking-tight
                  text-white
                  sm:text-6xl
                  lg:text-8xl
                  font-display
                "
              >
                Building <br />
                Intelligent <span className="text-[#FF3B3B]">Systems.</span>
              </motion.h1>

              
              <motion.p
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="
                  mt-12

                  max-w-2xl

                  text-sm
                  leading-relaxed

                  text-white/50

                  sm:text-base
                "
              >
                A journey through AI engineering, cybersecurity,
                healthcare systems, automation, embedded technologies,
                and next-generation digital experiences crafted by Phantoms.
              </motion.p>
            </div>

            
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="
                grid grid-cols-2 gap-4
              "
            >
              {stats.map((item) => (
                <div
                  key={item.title}
                  className="
                    relative overflow-hidden

                    rounded-[30px]

                    border border-white/10

                    bg-white/3

                    p-6

                    backdrop-blur-2xl
                  "
                >
                  <div
                    className="
                      absolute -right-5 -top-5

                      h-24 w-24

                      rounded-full

                      bg-[#FF3B3B]/10

                      blur-2xl
                    "
                  />

                  <div className="relative z-10">
                    <h3
                      className="
                        text-4xl
                        font-black

                        tracking-tight

                        text-white

                        font-display
                      "
                    >
                      {item.value}
                    </h3>

                    <p
                      className="
                        mt-2

                        text-xs
                        uppercase

                        tracking-[0.25em]

                        text-white/40
                      "
                    >
                      {item.title}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          
          <div className="mt-24">

            <div
              className="
                mb-10
                flex flex-col gap-6
                pb-10
                sm:flex-row
                sm:items-end
                sm:justify-between
              "
            >
              <div>
                <span className="text-xs uppercase tracking-[0.25em] text-white/35">
                  Timeline
                </span>

                <h2
                  className="
                    mt-4

                    text-3xl
                    font-black

                    tracking-tight

                    text-white

                    sm:text-5xl

                    font-display
                  "
                >
                  Creative & Technical <br />
                  Evolution
                </h2>
              </div>

              <p
                className="
                  max-w-lg

                  text-sm
                  leading-relaxed

                  text-white/45

                  sm:text-base
                "
              >
                Combining engineering precision with futuristic design
                to create scalable systems, immersive interfaces,
                and intelligent real-world technologies.
              </p>
            </div>

            
            <div className="relative">

              
              <div
                className="

                  hidden h-full w-px

                  bg-white/10

                  md:block
                "
              />

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
                    
                    <div className="absolute inset-0 -mx-4 -my-2 rounded-2xl bg-white/2 opacity-0 transition-all duration-500 group-hover:opacity-100 sm:-mx-6 sm:-my-4" />

                    
                    <div className="absolute bottom-0 left-0 h-px w-0 bg-[#FF3B3B] transition-all duration-700 group-hover:w-full" />

                    <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:gap-8">

                      
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

                      
                      <div className="shrink-0 text-2xl font-semibold tracking-tight text-white/80 transition-all duration-500 group-hover:text-white group-hover:translate-x-1 sm:text-3xl lg:text-4xl font-display ">
                        {exp.period}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>

          
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="
              mt-24

              rounded-[34px]

              border border-white/10

              bg-white/3

              p-8

              text-center

              backdrop-blur-2xl

              sm:p-12
            "
          >
            <h2
              className="
                mt-7

                text-3xl
                font-black

                tracking-tight

                text-white

                sm:text-5xl

                font-display
              "
            >
              Ready To Work <span className="text-[#FF3B3B]">Together?</span>
            </h2>

            <p
              className="
                mx-auto mt-5 max-w-2xl

                text-sm leading-relaxed

                text-white/50

                sm:text-base
              "
            >
              Let’s build scalable systems, intelligent platforms,
              and futuristic experiences engineered for impact.
            </p>

            <Link
              href="/contact"
              className="
                group relative mt-8 inline-flex items-center gap-3 overflow-hidden

                rounded-2xl

                bg-[#FF3B3B]

                px-7 py-4

                text-sm font-semibold text-white

                shadow-[0_0_45px_rgba(255,59,59,0.25)]

                transition-all duration-300

                hover:scale-[1.02]
                hover:shadow-[0_0_70px_rgba(255,59,59,0.4)]
              "
            >
              <div
                className="
                  absolute inset-0

                  -translate-x-full

                  bg-linear-to-r
                  from-transparent
                  via-white/20
                  to-transparent

                  transition-transform duration-1000

                  group-hover:translate-x-full
                "
              />

              Start a Project

              <ArrowUpRight
                size={18}
                className="
                  transition-transform duration-300

                  group-hover:-translate-y-0.5
                  group-hover:translate-x-0.5
                "
              />
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  );
}