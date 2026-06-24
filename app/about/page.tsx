"use client";
import React from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import {
  Cpu,
  Shield,
  Zap,
  Globe,
  Users,
  Rocket,
  ArrowUpRight,
} from 'lucide-react';

const features = [
  {
    icon: Cpu,
    title: 'AI Engineering',
    desc: 'Building advanced AI systems, neural architectures, and intelligent automation platforms.',
  },
  {
    icon: Shield,
    title: 'Cybersecurity',
    desc: 'Securing infrastructures with modern protection systems and intelligent threat analysis.',
  },
  {
    icon: Zap,
    title: 'Edge Computing',
    desc: 'Running real-time AI directly on edge devices with ultra-low latency performance.',
  },
  {
    icon: Globe,
    title: 'Global Systems',
    desc: 'Scalable distributed architectures designed for reliability and worldwide deployment.',
  },
  {
    icon: Users,
    title: 'Elite Team',
    desc: 'A focused collective of engineers, designers, and researchers building future technologies.',
  },
  {
    icon: Rocket,
    title: 'Fast Execution',
    desc: 'From concept to production rapidly while maintaining quality, scalability, and security.',
  },
];

export default function Page() {
  const [teamCount] = React.useState(25);
  const [projectCount] = React.useState(100);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = clientX - left - width / 2;
    const y = clientY - top - height / 2;
    mouseX.set(x);
    mouseY.set(y);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  const rotateX = useTransform(mouseY, [-200, 200], [10, -10]);
  const rotateY = useTransform(mouseX, [-200, 200], [-10, 10]);

  return (
    <main className="relative overflow-hidden bg-[#000109] text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="
            absolute left-[-10%] top-[10%]
            h-[420px] w-[420px]
            rounded-full
            bg-[#FF3B3B]/10
            blur-[140px]
          "
        />
        <div
          className="
            absolute bottom-[-10%] right-[-5%]
            h-[380px] w-[380px]
            rounded-full
            bg-white/4
            blur-[140px]
          "
        />
        <div
          className="
            absolute inset-0
            bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]
            bg-[size:70px_70px]
            [mask-image:radial-gradient(circle_at_center,black,transparent_85%)]
          "
        />
      </div>

      <section
        className="
          relative z-10
          px-4 pb-24 pt-32
          sm:px-6
          lg:px-8
        "
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-[1fr_500px] lg:items-center">

            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="
                  inline-flex items-center
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
                About Phantoms
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 35 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="
                  mt-8
                  text-5xl
                  font-black
                  leading-[1.1]
                  tracking-tight
                  text-white
                  sm:text-6xl
                  lg:text-8xl
                  font-display
                "
              >
                Engineering <br />
                The Future <span className="text-[#FF3B3B]">Beyond Limits.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="
                  mt-8
                  max-w-2xl
                  text-sm
                  leading-relaxed
                  text-white/50
                  sm:text-base
                "
              >
                Phantoms is a next-generation engineering collective
                focused on AI ecosystems, cybersecurity, intelligent automation,
                embedded systems, and futuristic digital infrastructure.
                We don't simply build products — we architect intelligent experiences.
              </motion.p>

              <div className="mt-10 flex flex-wrap gap-4">
                {[
                  { value: `${teamCount}+`, label: 'Engineers' },
                  { value: `${projectCount}+`, label: 'Projects' },
                  { value: '24/7', label: 'Innovation' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="
                      rounded-2xl
                      border border-white/10
                      bg-white/3
                      px-5 py-4
                      backdrop-blur-xl
                    "
                  >
                    <h3 className="text-2xl font-black text-white">
                      {item.value}
                    </h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div 
              className="relative hidden aspect-square lg:block pointer-events-auto"
              style={{ perspective: 1000 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <motion.div
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                transition={{ type: "spring", stiffness: 150, damping: 20 }}
                className="absolute inset-0"
              >
                <div
                  className="
                    absolute inset-0
                    rounded-[40px]
                    border border-white/10
                    bg-white/3
                    backdrop-blur-2xl
                  "
                />

                <div
                  className="
                    absolute left-1/2 top-1/2
                    h-72 w-72
                    -translate-x-1/2 -translate-y-1/2
                    rounded-full
                    bg-[#FF3B3B]/15
                    blur-[120px]
                  "
                />

                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  style={{ translateZ: 20 }}
                  className="
                    absolute left-1/2 top-1/2
                    h-[340px] w-[340px]
                    -translate-x-1/2 -translate-y-1/2
                    rounded-full
                    border border-dashed border-white/10
                  "
                />

                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  style={{ translateZ: 40 }}
                  className="
                    absolute left-1/2 top-1/2
                    h-[250px] w-[250px]
                    -translate-x-1/2 -translate-y-1/2
                    rounded-full
                    border border-[#FF3B3B]/20
                  "
                />

                <div
                  style={{ transform: "translate(-50%, -50%) translateZ(60px)" }}
                  className="
                    absolute left-1/2 top-1/2
                    text-center
                  "
                >
                  <h2
                    className="
                      text-7xl
                      font-black
                      tracking-tight
                      text-white
                      font-display
                    "
                  >
                    PH
                  </h2>

                  <p className="mt-2 text-xs uppercase tracking-[0.35em] text-white/40">
                    PHANTOMS
                  </p>
                </div>
              </motion.div>
            </div>

          </div>

          <div
            className="
              mt-24
              grid gap-5
              sm:grid-cols-2
              xl:grid-cols-3
            "
          >
            {features.map(({ icon: Icon, title, desc }, index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.08,
                }}
                className="
                  group relative overflow-hidden
                  rounded-[30px]
                  border border-white/10
                  bg-white/3
                  p-6
                  backdrop-blur-2xl
                  transition-all duration-500
                  hover:-translate-y-1
                  hover:border-[#FF3B3B]/30
                  hover:bg-white/5
                  hover:shadow-[0_0_40px_rgba(255,59,59,0.12)]
                "
              >
                <div
                  className="
                    absolute right-[-20%] top-[-20%]
                    h-40 w-40
                    rounded-full
                    bg-[#FF3B3B]/10
                    opacity-0
                    blur-3xl
                    transition-opacity duration-500
                    group-hover:opacity-100
                  "
                />

                <div className="relative z-10">
                  <div
                    className="
                      flex h-14 w-14 items-center justify-center
                      rounded-2xl
                      border border-white/10
                      bg-[#FF3B3B]/10
                      text-[#FF3B3B]
                      transition-all duration-300
                      group-hover:bg-[#FF3B3B]
                      group-hover:text-white
                    "
                  >
                    <Icon size={24} />
                  </div>

                  <h3 className="mt-6 text-xl font-bold text-white">
                    {title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-white/50">
                    {desc}
                  </p>
                </div>
              </motion.div>
            ))}
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
                text-3xl
                font-black
                tracking-tight
                text-white
                sm:text-5xl
                font-display
              "
            >
              Ready To Build <span className="text-[#FF3B3B]">The Next Big Thing?</span>
            </h2>

            <p
              className="
                mx-auto mt-5 max-w-2xl
                text-sm leading-relaxed
                text-white/50
                sm:text-base
              "
            >
              Let's transform ambitious ideas into powerful intelligent systems
              engineered for the future.
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
              Explore Our Projects
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