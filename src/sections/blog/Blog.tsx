'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowUpRight,
  Calendar,
  Clock3,
} from 'lucide-react';

const posts = [
  {
    id: 1,
    title: 'Engineering RAFIQ AI Healthcare Ecosystem',
    description:
      'Inside the architecture behind intelligent healthcare automation, monitoring systems, and AI-powered workflows.',
    image: '/blog/blog-1.jpg',
    category: 'AI Systems',
    date: 'May 2026',
    read: '6 min',
    link: '/blog/rafiq-ai-healthcare',
  },
  {
    id: 2,
    title: 'Designing Cinematic SaaS Interfaces',
    description:
      'How we craft futuristic interfaces using motion systems, glassmorphism, and modern interaction design.',
    image: '/blog/blog-2.jpg',
    category: 'UI/UX',
    date: 'April 2026',
    read: '4 min',
    link: '/blog/cinematic-saas-ui',
  },
  {
    id: 3,
    title: 'Smart Home Infrastructure With IoT',
    description:
      'Building scalable automation ecosystems powered by Home Assistant, sensors, and edge devices.',
    image: '/blog/blog-3.jpg',
    category: 'IoT',
    date: 'March 2026',
    read: '5 min',
    link: '/blog/smart-home-iot',
  },
];

export default function Blog() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-28">

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="max-w-3xl"
          >
            <span
              className="
                text-xs font-semibold uppercase tracking-[0.15em] text-white/40
              "
            >
              Blog & Insights
            </span>

            <h2
              className="
                mt-6
                text-3xl font-black leading-[1.05]
                tracking-tight text-white
                sm:text-4xl
                lg:text-5xl font-display
              "
            >
              Modern Thinking <br />
              For Digital Innovation
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            viewport={{ once: true }}
            className="
              max-w-xl
              text-sm leading-relaxed text-white/50
              sm:text-base
            "
          >
            Insights about AI systems, smart automation, cybersecurity,
            full-stack engineering, and futuristic digital experiences.
          </motion.p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post, index) => (
            <Link
              key={post.id}
              href={post.link}
              className="block"
            >
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.12,
                }}
                viewport={{ once: true }}
                className="
                group relative overflow-hidden
                rounded-[28px]
                border border-white/10
                bg-white/3
                backdrop-blur-2xl
                transition-all duration-500
                hover:-translate-y-2
                hover:border-[#FF3B3B]/30
                hover:bg-white/5
              "
              >
                <div className="relative aspect-16/10 overflow-hidden">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="
    object-cover
    transition-transform duration-700
    group-hover:scale-105
  "
                  />

                  <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />

                  <div className="absolute left-4 top-4">
                    <span
                      className="
                      rounded-full border border-white/10
                      bg-black/40
                      px-3 py-1
                      text-[10px] font-semibold uppercase
                      tracking-[0.2em]
                      text-white
                      backdrop-blur-md
                    "
                    >
                      {post.category}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-7">

                  <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      <span>{post.date}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock3 size={14} />
                      <span>{post.read}</span>
                    </div>
                  </div>

                  <h3
                    className="
                    mt-5
                    text-xl font-bold leading-snug text-white
                    transition-colors duration-300
                    group-hover:text-[#FF3B3B]
                    sm:text-2xl
                  "
                  >
                    {post.title}
                  </h3>

                  <p
                    className="
                    mt-4
                    text-sm leading-relaxed text-white/55
                    sm:text-[15px]
                  "
                  >
                    {post.description}
                  </p>

                  <div
                    className="
                    mt-8 flex items-center justify-between
                    border-t border-white/10
                    pt-5
                  "
                  >
                    <span className="text-sm font-medium text-white/60">
                      Read Article
                    </span>

                    <div
                      className="
                      flex h-11 w-11 items-center justify-center
                      rounded-full border border-white/10
                      bg-white/3
                      text-white/70
                      transition-all duration-300
                      group-hover:border-[#FF3B3B]/30
                      group-hover:bg-[#FF3B3B]
                      group-hover:text-white
                    "
                    >
                      <ArrowUpRight
                        size={18}
                        className="
                        transition-transform duration-300
                        group-hover:-translate-y-0.5
                        group-hover:translate-x-0.5
                      "
                      />
                    </div>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-white/5" />
              </motion.article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}