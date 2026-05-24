"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Atom,
  Shield,
  Terminal,
  ArrowRight,
} from "lucide-react";

const stack = {
  frontend: {
    title: "Frontend Systems",
    subtitle: "Next.js · Motion · UI Runtime",
    desc: "High-performance cinematic interfaces engineered with SSR architecture, motion systems and structured rendering pipelines.",
    icon: Atom,
  },
  security: {
    title: "Security Layer",
    subtitle: "Encryption · Trust · Protection",
    desc: "Secure communication pipelines and hardened transport layers designed for modern infrastructure security.",
    icon: Shield,
  },
  backend: {
    title: "Backend Infrastructure",
    subtitle: "FastAPI · Supabase · Sync",
    desc: "Low-latency APIs, synchronized data layers and scalable backend services powering real-time systems.",
    icon: Terminal,
  },
};

type StackKey = keyof typeof stack;

const nodes: StackKey[] = [
  "frontend",
  "security",
  "backend",
];

export default function InteractiveCore() {
  const [active, setActive] =
    useState<StackKey>("frontend");

  const ActiveIcon =
    stack[active].icon;

  return (
    <section className="relative z-20 mx-auto my-28 w-full max-w-6xl px-4">

      <div className="mb-14 text-center">
        <span
          className="
            font-mono
            text-[10px]
            uppercase
            tracking-[0.28em]
            text-[#FF3B3B]/80
          "
        >
          Phantoms Infrastructure
        </span>

        <h2
          className="
            mt-4
            text-4xl
            font-black
            tracking-tight
            text-white
            md:text-6xl
          "
        >
          Core Technology
        </h2>

        <p
          className="
            mx-auto
            mt-4
            max-w-2xl
            text-sm
            leading-relaxed
            text-white/40
          "
        >
          Infrastructure engineered around
          performance, security and scalable
          backend systems.
        </p>
      </div>

      <div
        className="
          grid
          items-stretch
          gap-6
          lg:grid-cols-[320px_1fr]
        "
      >

        {/* LEFT PANEL */}

        <div
          className="
            relative
            overflow-hidden
            rounded-4xl
            border
            border-white/8
            bg-[#05060D]/65
            backdrop-blur-2xl
            shadow-[0_24px_70px_rgba(0,0,0,0.35)]
          "
        >

          <div
            className="
              border-b
              border-white/6
              px-5
              py-4
            "
          >
            <p
              className="
                font-mono
                text-[10px]
                uppercase
                tracking-[0.22em]
                text-white/25
              "
            >
              System Navigator
            </p>

            <h3
              className="
                mt-2
                text-lg
                font-semibold
                text-white
              "
            >
              Infrastructure Layers
            </h3>
          </div>

          <div className="space-y-2 p-3">

            {nodes.map((node) => {
              const item = stack[node];
              const Icon = item.icon;
              const selected =
                active === node;

              return (
                <button
                  key={node}
                  onClick={() =>
                    setActive(node)
                  }
                  className="
                    group
                    relative
                    w-full
                    overflow-hidden
                    rounded-2xl
                    text-left
                    transition-all
                    duration-300
                  "
                >

                  {selected && (
                    <motion.div
                      layoutId="core-active"
                      transition={{
                        type: "spring",
                        stiffness: 240,
                        damping: 28,
                      }}
                      className="
                        absolute
                        inset-0
                        rounded-2xl
                        border
                        border-[#FF3B3B]/20
                        bg-[#FF3B3B]/8
                      "
                    />
                  )}

                  {selected && (
                    <motion.div
                      layoutId="core-line"
                      className="
                        absolute
                        left-0
                        top-3
                        bottom-3
                        w-0.5
                        rounded-full
                        bg-[#FF3B3B]
                      "
                    />
                  )}

                  <div
                    className="
                      relative
                      z-10
                      flex
                      items-center
                      justify-between
                      px-4
                      py-4
                    "
                  >

                    <div
                      className="
                        flex
                        min-w-0
                        items-center
                        gap-4
                      "
                    >
                      <div
                        className={`
                          flex
                          h-11
                          w-11
                          shrink-0
                          items-center
                          justify-center
                          rounded-2xl
                          border
                          transition-all
                          duration-300
                          ${
                            selected
                              ? "border-[#FF3B3B]/20 bg-[#FF3B3B]/10 text-[#FF3B3B]"
                              : "border-white/6 bg-white/3 text-white/35 group-hover:text-white/65"
                          }
                        `}
                      >
                        <Icon
                          size={18}
                          strokeWidth={1.8}
                        />
                      </div>

                      <div className="min-w-0">
                        <h4
                          className={`
                            truncate
                            text-sm
                            font-semibold
                            transition-colors
                            duration-300
                            ${
                              selected
                                ? "text-white"
                                : "text-white/65"
                            }
                          `}
                        >
                          {item.title}
                        </h4>

                        <p
                          className="
                            mt-1
                            truncate
                            font-mono
                            text-[10px]
                            uppercase
                            tracking-[0.12em]
                            text-white/25
                          "
                        >
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <ArrowRight
                      size={14}
                      className={`
                        shrink-0
                        transition-all
                        duration-300
                        ${
                          selected
                            ? "translate-x-1 text-[#FF3B3B]"
                            : "text-white/18 group-hover:text-white/40"
                        }
                      `}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL */}

        <div
          className="
            relative
            overflow-hidden
            rounded-[34px]
            border
            border-white/8
            bg-[#05060D]/80
            p-8
            md:p-10
            backdrop-blur-2xl
            shadow-[0_30px_80px_rgba(0,0,0,0.42)]
          "
        >
          <motion.div
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
            }}
            className="
              absolute
              -right-15
              -top-15
              h-72
              w-72
              rounded-full
              blur-[120px]
              bg-[#FF3B3B]/10
            "
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{
                opacity: 0,
                y: 12,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -12,
              }}
              transition={{
                duration: 0.35,
              }}
              className="relative z-10"
            >
              <div className="flex items-center gap-4">

                <div
                  className="
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-[#FF3B3B]/20
                    bg-[#FF3B3B]/10
                    text-[#FF3B3B]
                  "
                >
                  <ActiveIcon
                    size={22}
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <p
                    className="
                      font-mono
                      text-[10px]
                      uppercase
                      tracking-[0.2em]
                      text-white/30
                    "
                  >
                    Active Layer
                  </p>

                  <h3
                    className="
                      mt-1
                      text-3xl
                      font-black
                      text-white
                      md:text-4xl
                    "
                  >
                    {stack[active].title}
                  </h3>
                </div>
              </div>

              <p
                className="
                  mt-8
                  max-w-2xl
                  text-[15px]
                  leading-8
                  text-white/48
                "
              >
                {stack[active].desc}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}