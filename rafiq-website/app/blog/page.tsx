'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Clock3,
  Search,
  TrendingUp,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

const featuredPost = {
  title: 'Engineering The Future Of Intelligent Healthcare',
  description:
    'How Phantoms is building scalable AI infrastructure, smart healthcare systems, and real-world automation experiences through RAFIQ.',
  image: '/blog/featured.jpg',
  category: 'Featured',
  readTime: '8 min read',
};

const categories = [
  { title: 'AI Systems', icon: Cpu },
  { title: 'Cybersecurity', icon: ShieldCheck },
  { title: 'Engineering', icon: TrendingUp },
];

const posts = [
  {
    title: 'Inside RAFIQ Architecture',
    description:
      'A deep dive into the AI infrastructure powering healthcare automation and smart monitoring.',
    image: '/blog/1.jpg',
    category: 'AI',
    readTime: '6 min',
  },
  {
    title: 'Building Secure AI Platforms',
    description:
      'Modern security practices for scalable healthcare and intelligent systems.',
    image: '/blog/2.jpg',
    category: 'Security',
    readTime: '5 min',
  },
  {
    title: 'Designing SaaS User Experiences',
    description:
      'Creating cinematic interfaces and premium dashboard systems with modern frontend engineering.',
    image: '/blog/3.jpg',
    category: 'Development',
    readTime: '4 min',
  },
  {
    title: 'Edge AI & Real-Time Systems',
    description:
      'Deploying low-latency intelligence directly on embedded and edge devices.',
    image: '/blog/4.jpg',
    category: 'AI',
    readTime: '7 min',
  },
  {
    title: 'Automation & Smart Ecosystems',
    description:
      'Integrating intelligent workflows with Home Assistant and connected systems.',
    image: '/blog/5.jpg',
    category: 'Automation',
    readTime: '5 min',
  },
  {
    title: 'Scaling Full Stack Platforms',
    description:
      'Engineering scalable SaaS infrastructure with Next.js, TypeScript, and Supabase.',
    image: '/blog/6.jpg',
    category: 'Development',
    readTime: '6 min',
  },
];

const filters = ['All', 'AI', 'Security', 'Development', 'Automation'];

export default function Page() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        `${post.title} ${post.description} ${post.category}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesFilter =
        activeFilter === 'All' ? true : post.category === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [search, activeFilter]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030408] text-white pb-20">
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute left-[-10%] top-[-5%] h-[40rem] w-[40rem] max-w-full rounded-full bg-[#FF3B3B]/8 blur-[130px]" />
        <div className="absolute right-[-10%] top-[15%] h-[35rem] w-[35rem] max-w-full rounded-full bg-[#2563EB]/8 blur-[130px]" />
        <div 
          className="absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(circle at 50% 30%, black, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 30%, black, transparent 80%)'
          }}
        />
      </div>

      <section className="relative z-10 px-4 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 lg:max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[#FF3B3B] backdrop-blur-xl">
                Phantoms Blog
              </div>

              <h1 className="mt-6 text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight text-white leading-[1.05] font-display">
                SaaS Engineering <br className="hidden sm:inline" />
                Insights &{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF3B3B] to-[#ff6b6b]">
                  Innovation.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-white/60">
                Technical articles, architecture insights, AI engineering workflows, 
                cybersecurity systems, and product design experiences built by Phantoms.
              </p>
            </motion.div>
          </div>

          <div className="mt-10 flex items-center gap-3 overflow-x-auto pb-4 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  className="group inline-flex shrink-0 items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 backdrop-blur-xl transition-all duration-300 hover:border-[#FF3B3B]/40 hover:bg-[#FF3B3B]/10 hover:text-white"
                >
                  <Icon size={16} className="transition-colors duration-300 group-hover:text-[#FF3B3B]" />
                  {item.title}
                </button>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="group relative mt-12 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl transition-all duration-300 hover:border-white/20"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 lg:items-stretch">
              <div className="relative min-h-[260px] sm:min-h-[380px] lg:min-h-full lg:col-span-7 overflow-hidden">
                <Image
                  src={featuredPost.image}
                  alt={featuredPost.title}
                  fill
                  priority
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030408] via-[#030408]/40 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#030408]/90 z-10" />
              </div>

              <div className="relative z-20 flex flex-col justify-center p-6 sm:p-10 lg:p-14 lg:col-span-5 bg-[#030408]/70 lg:bg-transparent backdrop-blur-xs lg:backdrop-blur-none">
                <div className="inline-flex w-fit items-center rounded-full border border-[#FF3B3B]/30 bg-[#FF3B3B]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF3B3B]">
                  {featuredPost.category}
                </div>

                <h2 className="mt-5 text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight font-display">
                  {featuredPost.title}
                </h2>

                <p className="mt-4 text-sm sm:text-base leading-relaxed text-white/50">
                  {featuredPost.description}
                </p>

                <div className="mt-6 flex items-center gap-2 text-xs font-medium text-white/40">
                  <Clock3 size={14} />
                  {featuredPost.readTime}
                </div>

                <Link
                  href="#"
                  className="group/btn relative mt-8 inline-flex w-full sm:w-fit items-center justify-center gap-2.5 rounded-xl bg-[#FF3B3B] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_4px_25px_rgba(255,59,59,0.2)] transition-all duration-300 hover:scale-[1.01] hover:bg-[#ff4d4d] hover:shadow-[0_4px_35px_rgba(255,59,59,0.4)]"
                >
                  Read Article
                  <ArrowUpRight size={16} className="transition-transform duration-300 group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between border-b border-white/5 pb-8"
          >
            <div className="group relative w-full lg:max-w-md">
              <div className="absolute inset-0 rounded-2xl bg-[#FF3B3B]/0 blur-xl transition-all duration-500 group-focus-within:bg-[#FF3B3B]/5" />
              <div className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B0D14]/60 px-4 py-3.5 backdrop-blur-xl transition-all duration-300 focus-within:border-[#FF3B3B]/40 focus-within:bg-[#0B0D14]">
                <Search size={18} className="shrink-0 text-white/30 transition-colors duration-300 group-focus-within:text-[#FF3B3B]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search articles, tech, systems..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
              {filters.map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveFilter(item)}
                  className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-medium transition-all duration-300 cursor-pointer ${
                    activeFilter === item
                      ? 'border-[#FF3B3B]/50 bg-[#FF3B3B]/15 text-white shadow-[0_0_20px_rgba(255,59,59,0.15)]'
                      : 'border-white/10 bg-white/5 text-white/60 hover:border-[#FF3B3B]/30 hover:bg-[#FF3B3B]/5 hover:text-white'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </motion.div>

          <section className="mt-12">
            <div className="mb-10">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                Latest Articles
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-white font-display">
                Explore The Knowledge Hub
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
              {filteredPosts.map((post, index) => (
                <motion.article
                  key={post.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
                  className="group relative flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0B0D14]/40 backdrop-blur-md transition-all duration-500 hover:-translate-y-1.5 hover:border-[#FF3B3B]/30 hover:bg-[#0B0D14]/90 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                >
                  <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#FF3B3B]/0 blur-3xl transition-opacity duration-500 opacity-0 group-hover:opacity-100 group-hover:bg-[#FF3B3B]/10 pointer-events-none" />

                  <div className="relative h-56 w-full overflow-hidden">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#030408] via-transparent to-transparent" />
                    <div className="absolute left-4 top-4 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                      {post.category}
                    </div>
                  </div>

                  <div className="flex flex-col flex-1 p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-white/40">
                        <Clock3 size={13} />
                        {post.readTime}
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/40 transition-all duration-300 group-hover:border-[#FF3B3B]/40 group-hover:bg-[#FF3B3B]/10 group-hover:text-[#FF3B3B]">
                        <ArrowUpRight size={15} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </div>
                    </div>

                    <h3 className="mt-4 text-xl font-bold leading-snug text-white transition-colors duration-300 group-hover:text-[#FF3B3B]">
                      {post.title}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-white/40 line-clamp-2 flex-1">
                      {post.description}
                    </p>

                    <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                      <Link href="#" className="text-xs font-semibold text-white/70 transition-colors duration-300 group-hover:text-[#FF3B3B]">
                        Read Article
                      </Link>
                      <div className="h-px w-12 bg-gradient-to-r from-white/10 to-transparent transition-all duration-300 group-hover:w-20 group-hover:from-[#FF3B3B]/30" />
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-12 rounded-[24px] border border-white/10 bg-white/[0.02] px-6 py-16 text-center backdrop-blur-xl"
              >
                <h3 className="text-xl font-bold text-white">No Articles Found</h3>
                <p className="mt-2 text-sm text-white/40 max-w-xs mx-auto">
                  We couldn't find anything matching "{search}". Try checking your spelling or selecting a different filter.
                </p>
              </motion.div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}