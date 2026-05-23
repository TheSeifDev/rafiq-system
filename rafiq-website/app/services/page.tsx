"use client";

import { motion } from "framer-motion";
import Link from 'next/link';
import { 
  Code2, 
  Smartphone, 
  ShieldAlert, 
  Layers, 
  Compass, 
  BrainCircuit, 
  ArrowRight 
} from "lucide-react";

const services = [
  {
    title: "Web Development",
    description: "Building modern, high-performance web applications using Next.js, React, and cutting-edge frontend technologies.",
    icon: Code2,
  },
  {
    title: "Mobile Apps",
    description: "Crafting seamless cross-platform mobile experiences with React Native for high stability and smooth performance.",
    icon: Smartphone,
  },
  {
    title: "Cybersecurity",
    description: "Securing platforms with end-to-end encryption protocols, secure communication systems, and robust backend architectures.",
    icon: ShieldAlert,
  },
  {
    title: "Full-Stack Solutions",
    description: "Developing scalable backends with FastAPI and Python, combined with synchronized real-time databases like Supabase.",
    icon: Layers,
  },
  {
    title: "AI & ML Integration",
    description: "Integrating smart intelligent models, automated workflows, and predictive data analysis into your current software core.",
    icon: BrainCircuit,
  },
  {
    title: "UI/UX & Animations",
    description: "Creating immersive digital experiences utilizing advanced interactive models, 3D visual effects, and fluid layouts.",
    icon: Compass,
  },
];

export default function ServicesPage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white py-24 px-4 sm:px-6 lg:px-8">
      
      {/* سكشن الخلفية (الشبكة والتوهج) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="
            absolute left-[-10%] top-[0%]
            h-125 w-125
            rounded-full
            bg-[#FF3B3B]/10
            blur-[140px]
          "
        />

        <div
          className="
            absolute right-[-10%] top-[20%]
            h-105 w-105
            rounded-full
            bg-[#2563EB]/10
            blur-[140px]
          "
        />

        <div
          className="
            absolute inset-0
            bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]
            bg-size-[70px_70px]
            mask-[radial-gradient(circle_at_center,black,transparent_85%)]
          "
        />
      </div>

      {/* محتوى الصفحة الرئيسي */}
      <section className="relative z-10 max-w-7xl mx-auto">
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          {/* التعديل هنا: ضفنا font-black و font-display وتعديل الـ leading ليطابق كود الـ Blog بالظبط */}
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black font-display tracking-tight leading-none">
            Our{" "}
            <span className="text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]">
              Services
            </span>
          </h2>

          <p className="mt-6 text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            We provide end-to-end digital solutions to help your
            business grow, scale, and succeed.
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.08,
                }}
                whileHover={{
                  y: -10,
                  scale: 1.02,
                }}
                className="group relative rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-8 overflow-hidden hover:border-red-500/30 transition-all duration-500"
              >
                {/* Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-[radial-gradient(circle_at_top_left,rgba(255,0,0,0.12),transparent_45%)]" />

                {/* Icon */}
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(255,0,0,0.15)]">
                  <Icon className="w-8 h-8 text-red-500" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  {/* التعديل هنا: ضفنا font-display للعناوين الجانبية جوه الكروت لخلق طابع متناسق */}
                  <h3 className="text-[1.55rem] font-bold font-display leading-[1.15] tracking-tight mb-5 transition-colors duration-300 group-hover:text-red-500">
                    {service.title}
                  </h3>

                  <p className="text-gray-400 leading-8 text-[15px]">
                    {service.description}
                  </p>

                  {/* Learn More */}
                  <button className="mt-10 flex items-center gap-2 text-red-500 font-semibold group/btn">
                    Learn More
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </button>
                </div>

                {/* Border Glow */}
                <div className="absolute inset-0 rounded-3xl border border-transparent group-hover:border-red-500/20 transition-all duration-500" />
              </motion.div>
            );
          })}
        </div>
      </section>
    </main>
  );
}