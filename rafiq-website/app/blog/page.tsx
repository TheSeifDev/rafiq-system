'use client';

import React, {
  useMemo,
  useState,
} from 'react';

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
  {
    title: 'AI Systems',
    icon: Cpu,
  },
  {
    title: 'Cybersecurity',
    icon: ShieldCheck,
  },
  {
    title: 'Engineering',
    icon: TrendingUp,
  },
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

const filters = [
  'All',
  'AI',
  'Security',
  'Development',
  'Automation',
];

export default function Page() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] =
    useState('All');

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        `${post.title} ${post.description} ${post.category}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesFilter =
        activeFilter === 'All'
          ? true
          : post.category === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [search, activeFilter]);

  return (
    <main className="relative overflow-hidden text-white mb-8">

      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden">

        {/* glow */}
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

        {/* grid */}
        <div
          className="
            absolute inset-0

            bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]

            bg-size-[70px_70px]

            mask-[radial-gradient(circle_at_center,black,transparent_85%)]
          "
        />
      </div>

      {/* HERO */}
      <section className="relative z-10 px-4 pt-32 sm:px-6 lg:px-8">

        <div className="mx-auto max-w-7xl">

          {/* HERO */}
          <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">

            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="max-w-4xl"
            >
              {/* badge */}
              <div
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
                Phantoms Blog
              </div>

              {/* title */}
              <h1
                className="
                  mt-8

                  max-w-5xl

                  text-5xl
                  font-black

                  leading-[0.88]
                  tracking-tight

                  text-white

                  sm:text-6xl
                  lg:text-[6.5rem]

                  font-display
                "
              >
                SaaS Engineering <br />
                Insights &{' '}
                <span className="text-[#FF3B3B]">
                  Innovation.
                </span>
              </h1>

              {/* desc */}
              <p
                className="
                  mt-8

                  max-w-2xl

                  text-sm
                  leading-relaxed

                  text-white/50

                  sm:text-base
                "
              >
                Technical articles, architecture insights,
                AI engineering workflows, cybersecurity systems,
                and product design experiences built by Phantoms.
              </p>
            </motion.div>
          </div>

          {/* CATEGORY BUTTONS */}
          <div className="mt-14 flex flex-wrap gap-3">

            {categories.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.title}
                  className="
                    group inline-flex items-center gap-2

                    rounded-2xl

                    border border-white/10

                    bg-white/3

                    px-5 py-3

                    text-sm font-medium text-white/70

                    backdrop-blur-xl

                    transition-all duration-300

                    hover:border-[#FF3B3B]/30
                    hover:bg-[#FF3B3B]/10
                    hover:text-white
                  "
                >
                  <Icon
                    size={16}
                    className="
                      transition-colors duration-300

                      group-hover:text-[#FF3B3B]
                    "
                  />

                  {item.title}
                </button>
              );
            })}
          </div>

          {/* FEATURED */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="
              group relative mt-20 overflow-hidden

              rounded-[36px]

              border border-white/10

              bg-white/3

              backdrop-blur-2xl
            "
          >
            <div className="grid lg:grid-cols-[1.1fr_0.9fr]">

              {/* IMAGE */}
              <div className="relative min-h-80 overflow-hidden lg:min-h-145">

                <Image
                  src={featuredPost.image}
                  alt={featuredPost.title}
                  fill
                  className="
                    object-cover

                    transition-transform duration-700

                    group-hover:scale-105
                  "
                />

                <div
                  className="
                    absolute inset-0

                    bg-linear-to-t
                    from-black/80
                    via-black/20
                    to-transparent
                  "
                />
              </div>

              {/* CONTENT */}
              <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-14">

                <div
                  className="
                    inline-flex w-fit items-center

                    rounded-full

                    border border-[#FF3B3B]/20

                    bg-[#FF3B3B]/10

                    px-3 py-1

                    text-[10px]
                    font-semibold
                    uppercase

                    tracking-[0.25em]

                    text-[#FF3B3B]
                  "
                >
                  {featuredPost.category}
                </div>

                <h2
                  className="
                    mt-7

                    text-3xl
                    font-black

                    leading-none
                    tracking-tight

                    text-white

                    sm:text-5xl

                    font-display
                  "
                >
                  {featuredPost.title}
                </h2>

                <p
                  className="
                    mt-5

                    text-sm
                    leading-relaxed

                    text-white/50

                    sm:text-base
                  "
                >
                  {featuredPost.description}
                </p>

                <div className="mt-6 flex items-center gap-3 text-sm text-white/35">

                  <Clock3 size={15} />

                  {featuredPost.readTime}
                </div>

                <Link
                  href="#"
                  className="
                    group/button relative mt-10 inline-flex w-fit items-center gap-3 overflow-hidden

                    rounded-2xl

                    bg-[#FF3B3B]

                    px-6 py-4

                    text-sm font-semibold text-white

                    shadow-[0_0_45px_rgba(255,59,59,0.25)]

                    transition-all duration-300

                    hover:scale-[1.02]
                    hover:shadow-[0_0_70px_rgba(255,59,59,0.4)]
                  "
                >
                  Read Article

                  <ArrowUpRight
                    size={18}
                    className="
                      transition-transform duration-300

                      group-hover/button:-translate-y-0.5
                      group-hover/button:translate-x-0.5
                    "
                  />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* SEARCH + FILTERS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="
              mt-20

              flex flex-col gap-4

              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >
            {/* SEARCH */}
            <div
              className="
                group relative

                w-full
                lg:max-w-xl
              "
            >
              <div
                className="
                  absolute inset-0

                  rounded-3xl

                  bg-[#FF3B3B]/0

                  blur-2xl

                  transition-all duration-500

                  group-focus-within:bg-[#FF3B3B]/10
                "
              />

              <div
                className="
                  relative flex items-center gap-3

                  rounded-[26px]

                  border border-white/10

                  bg-[#0B0D14]/80

                  px-5 py-4

                  backdrop-blur-2xl

                  transition-all duration-300

                  focus-within:border-[#FF3B3B]/30
                  focus-within:bg-[#10131D]
                "
              >
                <Search
                  size={18}
                  className="
                    shrink-0

                    text-white/35

                    transition-colors duration-300

                    group-focus-within:text-[#FF3B3B]
                  "
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search articles, technologies, systems..."
                  className="
                    w-full bg-transparent

                    text-sm text-white

                    outline-none

                    placeholder:text-white/25
                  "
                />
              </div>
            </div>

            {/* FILTERS */}
            <div className="flex flex-wrap gap-3">

              {filters.map((item) => (
                <button
                  key={item}
                  onClick={() =>
                    setActiveFilter(item)
                  }
                  className={`
                    rounded-2xl

                    border

                    px-4 py-3

                    text-sm font-medium

                    backdrop-blur-xl
                    cursor-pointer
                    transition-all duration-300

                    ${
                      activeFilter === item
                        ? `
                          border-[#FF3B3B]/40
                          bg-[#FF3B3B]/15
                          text-white
                          shadow-[0_0_30px_rgba(255,59,59,0.15)]
                        `
                        : `
                          border-white/10
                          bg-white/3
                          text-white/55

                          hover:border-[#FF3B3B]/30
                          hover:bg-[#FF3B3B]/10
                          hover:text-white
                        `
                    }
                  `}
                >
                  {item}
                </button>
              ))}
            </div>
          </motion.div>

          {/* POSTS */}
          <div className="mt-28">

            <div className="mb-12 flex items-end justify-between gap-6">

              <div>
                <span className="text-xs uppercase tracking-[0.25em] text-white/35">
                  Latest Articles
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
                  Explore The <br />
                  Knowledge Hub
                </h2>
              </div>
            </div>

            {/* GRID */}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

              {filteredPosts.map((post, index) => (
                <motion.article
                  key={post.title}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.08,
                  }}
                  className="
                    group relative overflow-hidden

                    rounded-[34px]

                    border border-white/10

                    bg-[#0B0D14]/80

                    backdrop-blur-2xl

                    transition-all duration-500 ease-out

                    hover:-translate-y-1.5
                    hover:border-[#FF3B3B]/30
                    hover:bg-[#10131D]
                    hover:shadow-[0_20px_80px_rgba(0,0,0,0.45)]
                  "
                >
                  {/* glow */}
                  <div
                    className="
                      absolute inset-0

                      opacity-0

                      transition-opacity duration-500

                      group-hover:opacity-100
                    "
                  >
                    <div
                      className="
                        absolute -right-10 -top-10

                        h-40 w-40

                        rounded-full

                        bg-[#FF3B3B]/10

                        blur-3xl
                      "
                    />
                  </div>

                  {/* image */}
                  <div className="relative h-64 overflow-hidden">

                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="
                        object-cover

                        transition-transform duration-700 ease-out

                        group-hover:scale-105
                      "
                    />

                    {/* overlays */}
                    <div
                      className="
                        absolute inset-0

                        bg-linear-to-t
                        from-[#03040A]
                        via-black/30
                        to-transparent
                      "
                    />

                    {/* category */}
                    <div
                      className="
                        absolute left-5 top-5

                        inline-flex items-center

                        rounded-full

                        border border-white/10

                        bg-black/40

                        px-3 py-1.5

                        text-[10px]
                        font-semibold
                        uppercase

                        tracking-[0.22em]

                        text-white

                        backdrop-blur-xl
                      "
                    >
                      {post.category}
                    </div>
                  </div>

                  {/* content */}
                  <div className="relative z-10 p-7">

                    {/* meta */}
                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-2 text-xs text-white/35">
                        <Clock3 size={13} />
                        {post.readTime}
                      </div>

                      <div
                        className="
                          flex h-10 w-10 items-center justify-center

                          rounded-2xl

                          border border-white/10

                          bg-white/3

                          text-white/50

                          transition-all duration-300

                          group-hover:border-[#FF3B3B]/30
                          group-hover:bg-[#FF3B3B]/10
                          group-hover:text-[#FF3B3B]
                        "
                      >
                        <ArrowUpRight
                          size={17}
                          className="
                            transition-transform duration-300

                            group-hover:-translate-y-0.5
                            group-hover:translate-x-0.5
                          "
                        />
                      </div>
                    </div>

                    {/* title */}
                    <h3
                      className="
                        mt-6

                        text-[1.55rem]
                        font-bold

                        leading-[1.15]

                        tracking-tight

                        text-white

                        transition-colors duration-300

                        group-hover:text-[#FF3B3B]
                      "
                    >
                      {post.title}
                    </h3>

                    {/* desc */}
                    <p
                      className="
                        mt-4

                        text-sm
                        leading-relaxed

                        text-white/45
                      "
                    >
                      {post.description}
                    </p>

                    {/* bottom */}
                    <div
                      className="
                        mt-7

                        flex items-center justify-between
                      "
                    >
                      <Link
                        href="#"
                        className="
                          text-sm font-medium

                          text-white/65

                          transition-colors duration-300

                          hover:text-[#FF3B3B]
                        "
                      >
                        Read Article
                      </Link>

                      <div
                        className="
                          ml-5

                          h-px flex-1

                          bg-linear-to-r
                          from-white/10
                          to-transparent
                        "
                      />
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>

            {/* EMPTY */}
            {filteredPosts.length === 0 && (
              <div
                className="
                  mt-10

                  rounded-[30px]

                  border border-white/10

                  bg-white/3

                  px-8 py-14

                  text-center

                  backdrop-blur-2xl
                "
              >
                <h3 className="text-2xl font-bold text-white">
                  No Articles Found
                </h3>

                <p className="mt-3 text-sm text-white/45">
                  Try different keywords or filters.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}