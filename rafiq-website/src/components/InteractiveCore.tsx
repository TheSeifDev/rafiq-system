"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Terminal, Atom } from "lucide-react";

const stackDetails = {
  frontend: {
    title: "Cinematic Frontend Architecture",
    subtitle: "Next.js 14 & Framer Motion",
    desc: "Engineering ultra-fluid, high-performance web experiences with structural server-side rendering and interactive layouts.",
    color: "from-red-600 to-red-400",
    glow: "rgba(239, 68, 68, 0.15)",
    icon: Atom,
  },
  cyber: {
    title: "Cryptographic Core Security",
    subtitle: "RSA-OAEP End-to-End Encryption",
    desc: "Securing full-stack data payloads, handling secure key generation, and implementing bulletproof communication protocols.",
    color: "from-red-700 to-red-500",
    glow: "rgba(185, 28, 28, 0.2)",
    icon: Shield,
  },
  backend: {
    title: "High-Speed Real-time Backend",
    subtitle: "FastAPI, Python & Supabase Core",
    desc: "Building low-latency database synchronization layers and scalable API engines capable of hosting autonomous system syncs.",
    color: "from-red-800 to-red-600",
    glow: "rgba(153, 27, 27, 0.15)",
    icon: Terminal,
  },
};

type StackKey = keyof typeof stackDetails;

export default function InteractiveCore() {
  const [activeNode, setActiveNode] = useState<StackKey>("frontend");

  const CurrentIcon = stackDetails[activeNode].icon;

  return (
    <div className="w-full max-w-6xl mx-auto my-32 px-4 relative z-20">
      

      <div className="text-center mb-16">
        <span className="text-xs uppercase tracking-[0.3em] text-[#FF3B3B] font-semibold">The Phantoms Core</span>
        <h2 className="text-4xl md:text-6xl font-black font-display text-white mt-3 tracking-tight">
          Interactive Tech Stack
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
        

        <div className="relative rounded-[36px] border border-white/10 bg-[#0B0D14]/80 backdrop-blur-2xl p-8 md:p-12 min-h-[380px] flex flex-col justify-between overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.5)]">
          

          <div 
            className="absolute -right-10 -top-10 w-72 h-72 rounded-full blur-[120px] transition-all duration-700 pointer-events-none"
            style={{ backgroundColor: stackDetails[activeNode].glow }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeNode}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative z-10"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stackDetails[activeNode].color} p-[1px] mb-8 shadow-lg`}>
                <div className="w-full h-full bg-[#0B0D14] rounded-[15px] flex items-center justify-center text-white">
                  <CurrentIcon size={24} className="text-red-500" />
                </div>
              </div>

              <span className="text-xs uppercase tracking-widest text-white/40 font-mono">
                {stackDetails[activeNode].subtitle}
              </span>
              
              <h3 className="text-3xl md:text-4xl font-black font-display text-white mt-2 leading-tight">
                {stackDetails[activeNode].title}
              </h3>

              <p className="mt-6 text-base text-white/50 leading-relaxed font-normal max-w-xl">
               {stackDetails[activeNode].desc}
              </p>
            </motion.div>
          </AnimatePresence>


          <div className="mt-8 flex gap-2">
            {(["frontend", "cyber", "backend"] as const).map((node) => (
              <div 
                key={node} 
                className={`h-1 rounded-full transition-all duration-500 ${
                  activeNode === node ? "w-12 bg-red-500" : "w-3 bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>


        <div className="flex flex-col gap-4 justify-center items-center relative w-full">
          

          <button
            onClick={() => setActiveNode("frontend")}
            className={`w-full max-w-xs flex items-center gap-4 px-6 py-5 rounded-2xl border text-left transition-all duration-300 ${
              activeNode === "frontend"
                ? "border-red-500/40 bg-red-500/10 text-white shadow-[0_0_30px_rgba(239,68,68,0.15)]"
                : "border-white/5 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white"
            }`}
          >
            <Atom size={20} className="text-red-500" />
            <div>
              <h4 className="text-sm font-bold font-display">Frontend Node</h4>
              <p className="text-xs text-white/30 font-mono">Next.js Framework</p>
            </div>
          </button>


          <button
            onClick={() => setActiveNode("cyber")}
            className={`w-full max-w-xs flex items-center gap-4 px-6 py-5 rounded-2xl border text-left transition-all duration-300 ${
              activeNode === "cyber"
                ? "border-red-500/40 bg-red-500/10 text-white shadow-[0_0_30px_rgba(239,68,68,0.15)]"
                : "border-white/5 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white"
            }`}
          >
            <Shield size={20} className="text-red-500" />
            <div>
              <h4 className="text-sm font-bold font-display">Security Shield</h4>
              <p className="text-xs text-white/30 font-mono">RSA-OAEP Protocol</p>
            </div>
          </button>


          <button
            onClick={() => setActiveNode("backend")}
            className={`w-full max-w-xs flex items-center gap-4 px-6 py-5 rounded-2xl border text-left transition-all duration-300 ${
              activeNode === "backend"
                ? "border-red-500/40 bg-red-500/10 text-white shadow-[0_0_30px_rgba(239,68,68,0.15)]"
                : "border-white/5 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white"
            }`}
          >
            <Terminal size={20} className="text-red-500" />
            <div>
              <h4 className="text-sm font-bold font-display">Database Engine</h4>
              <p className="text-xs text-white/30 font-mono">FastAPI & Supabase</p>
            </div>
          </button>

        </div>

      </div>
    </div>
  );
}