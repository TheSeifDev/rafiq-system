'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronDown,
  MessageCircle,
  Shield,
  Cpu,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';

const faqData = [
  {
    category: 'General',
    icon: Cpu,
    items: [
      {
        question: 'What is Rafiq?',
        answer:
          'Rafiq is an AI-powered smart care ecosystem designed for healthcare, monitoring, smart automation, and intelligent assistance with privacy-first architecture.',
      },
      {
        question: 'Who is Rafiq built for?',
        answer:
          'Rafiq is designed for patients, elderly care, healthcare environments, and intelligent smart-home monitoring scenarios.',
      },
    ],
  },
  {
    category: 'AI & Offline',
    icon: WifiOff,
    items: [
      {
        question: 'Does Rafiq work offline?',
        answer:
          'Yes. Rafiq is designed around edge AI and local-first principles. Core services can continue operating even during internet disruption depending on deployment architecture.',
      },
      {
        question: 'Which AI models are used?',
        answer:
          'Rafiq supports local and cloud AI pipelines including LLM integrations, automation logic, and modular AI services depending on infrastructure requirements.',
      },
    ],
  },
  {
    category: 'Security',
    icon: Shield,
    items: [
      {
        question: 'How secure is the system?',
        answer:
          'Security is a core layer of Rafiq architecture including protected APIs, encrypted communication, authentication layers, and infrastructure isolation strategies.',
      },
      {
        question: 'Is user data protected?',
        answer:
          'Yes. Rafiq follows privacy-first engineering and avoids unnecessary cloud dependency whenever local processing is available.',
      },
    ],
  },
];

export default function Page() {
  const [query, setQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<string | null>('0-0');

  const filtered = useMemo(() => {
    return faqData.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.question.toLowerCase().includes(query.toLowerCase()) ||
          item.answer.toLowerCase().includes(query.toLowerCase())
      ),
    }));
  }, [query]);

  return (
    <main className="relative overflow-hidden px-4 pb-24 pt-32 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl sm:p-12">
          <div className="absolute inset-0">
            <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-[#FF3B3B]/10 blur-3xl" />
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#FF3B3B]/5 blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FF3B3B]/20 bg-[#FF3B3B]/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#FF6B6B]">
              <MessageCircle size={14} />
              Knowledge Center
            </div>

            <h1
              className="
                mt-6
                text-5xl font-black leading-[0.95]
                tracking-tight text-white
                sm:text-6xl
                lg:text-7xl
                font-display
              "
            >
              Frequently <br />
              Asked Questions
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/50">
              Everything you need to know about Rafiq, architecture,
              AI systems, security, and deployment workflows.
            </p>

            {/* SEARCH */}
            <div className="relative mt-10 max-w-xl">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
              />

              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions..."
                className="
                  h-14 w-full
                  rounded-2xl
                  border border-white/10
                  bg-white/[0.03]
                  pl-12 pr-4
                  text-white
                  outline-none
                  backdrop-blur-xl
                  transition-all duration-300
                  placeholder:text-white/25
                  focus:border-[#FF3B3B]/40
                  focus:bg-white/[0.05]
                  focus:shadow-[0_0_30px_rgba(255,59,59,0.08)]
                "
              />
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-14 grid gap-8">
          {filtered.map((section, sectionIndex) => {
            if (!section.items.length) return null;

            const Icon = section.icon;

            return (
              <section key={section.category}>
                <div className="mb-5 flex items-center gap-3">
                  <div
                    className="
                      flex h-10 w-10 items-center justify-center
                      rounded-xl
                      border border-[#FF3B3B]/20
                      bg-[#FF3B3B]/10
                      text-[#FF6B6B]
                    "
                  >
                    <Icon size={18} />
                  </div>

                  <h2 className="text-lg font-semibold text-white">
                    {section.category}
                  </h2>
                </div>

                <div className="space-y-4">
                  {section.items.map((item, itemIndex) => {
                    const id = `${sectionIndex}-${itemIndex}`;
                    const open = openIndex === id;

                    return (
                      <motion.div
                        key={id}
                        layout
                        className="
                          overflow-hidden
                          rounded-3xl
                          border border-white/10
                          bg-white/[0.03]
                          backdrop-blur-2xl
                          transition-all duration-300
                          hover:border-[#FF3B3B]/20
                          hover:bg-white/[0.04]
                        "
                      >
                        <button
                          onClick={() =>
                            setOpenIndex(open ? null : id)
                          }
                          className="
                            flex w-full items-center justify-between
                            gap-4 p-6 text-left
                          "
                        >
                          <span className="text-base font-medium text-white">
                            {item.question}
                          </span>

                          <motion.div
                            animate={{
                              rotate: open ? 180 : 0,
                            }}
                            transition={{
                              duration: 0.3,
                            }}
                            className="
                              flex h-10 w-10 shrink-0
                              items-center justify-center
                              rounded-xl
                              border border-white/10
                              bg-black/20
                              text-white/60
                            "
                          >
                            <ChevronDown size={18} />
                          </motion.div>
                        </button>

                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              initial={{
                                opacity: 0,
                                height: 0,
                              }}
                              animate={{
                                opacity: 1,
                                height: 'auto',
                              }}
                              exit={{
                                opacity: 0,
                                height: 0,
                              }}
                              transition={{
                                duration: 0.35,
                              }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 pb-6">
                                <div className="mb-4 h-px w-full bg-white/8" />

                                <p className="max-w-3xl text-sm leading-7 text-white/50">
                                  {item.answer}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* CTA */}
        <div
          className="
            relative mt-20 overflow-hidden
            rounded-[2rem]
            border border-white/10
            bg-white/[0.03]
            p-8
            backdrop-blur-2xl
            sm:p-10
          "
        >
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-[#FF3B3B]/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-3xl font-bold text-white">
                Still have questions?
              </h3>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/45">
                Contact the Phantoms team for technical inquiries,
                collaboration opportunities, or deployment support.
              </p>
            </div>

            <Link
              href="/contact"
              className="
                group inline-flex h-14 items-center gap-3
                self-start rounded-2xl
                border border-white/10
                bg-white/[0.03]
                px-5
                text-white
                backdrop-blur-xl
                transition-all duration-300
                hover:-translate-y-1
                hover:border-[#FF3B3B]/40
                hover:bg-[#FF3B3B]/10
              "
            >
              Contact Us

              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function ArrowRightIcon() {
  return (
    <motion.div
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
    >
      →
    </motion.div>
  );
}