'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

import {
  Mail,
  Phone,
  MapPin,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({
    type: null,
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);

      setStatus({
        type: null,
        message: '',
      });

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message.');
      }

      setStatus({
        type: 'success',
        message: data.message,
      });

      setForm({
        name: '',
        email: '',
        subject: '',
        message: '',
      });

      setTimeout(() => {
        setStatus({
          type: null,
          message: '',
        });
      }, 5000);
    } catch (error) {
      console.error(error);

      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong.',
      });

      setTimeout(() => {
        setStatus({
          type: null,
          message: '',
        });
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative overflow-hidden bg-[#000109] text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="
            absolute left-[-10%] top-[10%]
            h-105 w-105
            rounded-full
            bg-[#FF3B3B]/10
            blur-[140px]
          "
        />
        <div
          className="
            absolute bottom-[-10%] right-[-5%]
            h-95 w-95
            rounded-full
            bg-white/4
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
          px-4 pb-24 pt-32
          sm:px-6
          lg:px-8
        "
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-[1fr_560px] lg:items-center">

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
                Contact Phantoms
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 35 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="
                  mt-8
                  text-5xl
                  font-black
                  leading-[0.88]
                  tracking-tight
                  text-white
                  sm:text-6xl
                  lg:text-8xl
                  font-display
                "
              >
                Let’s Build <br />
                Something <span className="text-[#FF3B3B]">Legendary.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="
                  mt-12
                  max-w-xl
                  text-sm
                  leading-relaxed
                  text-white/50
                  sm:text-base
                 text-balance
                "
              >
                We design and engineer AI ecosystems, modern web platforms, 
                automation systems, embedded technologies, and futuristic digital experiences.
              </motion.p>

              <div
                className="
                  mt-10
                  grid gap-4
                  grid-cols-1
                  sm:grid-cols-3
                  lg:grid-cols-1
                  xl:grid-cols-3
                "
              >
                {[
                  {
                    icon: Mail,
                    title: 'Email',
                    value: 'the.phantoms.dev@gmail.com',
                    href: 'mailto:the.phantoms.dev@gmail.com'
                  },
                  {
                    icon: Phone,
                    title: 'Phone',
                    value: '+20 122 136 9658',
                    href: 'tel:+201221369658'
                  },
                  {
                    icon: MapPin,
                    title: 'Location',
                    value: 'Alexandria, Egypt',
                    href: 'https://maps.google.com/?q=Alexandria,Egypt'
                  },
                ].map((item, index) => {
                  const Icon = item.icon;
                  const IsLink = item.href;

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.1,
                      }}
                      className="
                        group relative overflow-hidden
                        min-h-[165px]
                        rounded-[28px]
                        border border-white/10
                        bg-white/3
                        p-5
                        backdrop-blur-2xl
                        transition-all duration-500 ease-out
                        hover:-translate-y-1
                        hover:border-[#FF3B3B]/30
                        hover:bg-white/5
                        hover:shadow-[0_0_40px_rgba(255,59,59,0.12)]
                      "
                    >
                      <div
                        className="
                          absolute right-[-30%] top-[-30%]
                          h-32 w-32
                          rounded-full
                          bg-[#FF3B3B]/10
                          opacity-0
                          blur-3xl
                          transition-opacity duration-500
                          group-hover:opacity-100
                        "
                      />

                      <div className="relative z-10 flex items-start justify-between">
                        <div
                          className="
                            flex h-13 w-13 items-center justify-center
                            rounded-2xl
                            border border-white/10
                            bg-[#FF3B3B]/10
                            text-[#FF3B3B]
                            transition-all duration-300
                            group-hover:border-[#FF3B3B]/30
                            group-hover:bg-[#FF3B3B]
                            group-hover:text-white
                          "
                        >
                          <Icon size={21} />
                        </div>

                        <div
                          className="
                            h-2 w-2 rounded-full
                            bg-[#FF3B3B]/40
                            transition-all duration-300
                            group-hover:scale-125
                            group-hover:bg-[#FF3B3B]
                          "
                        />
                      </div>

                      {/* Content Card */}
                      <div className="relative z-10 mt-7">
                        <h3 className="text-sm font-semibold tracking-wide text-white">
                          {item.title}
                        </h3>
                        
                        {IsLink ? (
                          <a 
                            href={item.href}
                            target={item.title === 'Location' ? '_blank' : undefined}
                            rel={item.title === 'Location' ? 'noopener noreferrer' : undefined}
                            className="
                              mt-3 block
                              text-sm leading-relaxed
                              text-white/45
                              transition-colors duration-300
                              group-hover:text-white/85
                              break-all
                              hover:underline
                              decoration-[#FF3B3B]/50
                              underline-offset-4
                            "
                          >
                            {item.value}
                          </a>
                        ) : (
                          <p className="mt-3 text-sm leading-relaxed text-white/45 break-all">
                            {item.value}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="
                relative overflow-hidden
                rounded-[34px]
                border border-white/10
                bg-white/4
                p-6
                backdrop-blur-2xl
                shadow-[0_10px_60px_rgba(0,0,0,0.35)]
                sm:p-8
              "
            >
              <div
                className="
                  absolute right-[-20%] top-[-20%]
                  h-64 w-64
                  rounded-full
                  bg-[#FF3B3B]/10
                  blur-3xl
                "
              />

              <div className="relative z-10">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white">
                    Start a Project
                  </h2>
                  <p className="mt-2 text-sm text-white/45">
                    Tell us about your idea and we’ll bring it to life.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="John Carter"
                      className="
                        h-14 w-full
                        rounded-2xl
                        border border-white/10
                        bg-black/20
                        px-5
                        text-sm text-white
                        outline-none
                        transition-all duration-300
                        placeholder:text-white/20
                        focus:border-[#FF3B3B]/50
                        focus:bg-white/4
                        focus:ring-1
                        focus:ring-[#FF3B3B]/20
                      "
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="hello@phantoms.dev"
                      className="
                        h-14 w-full
                        rounded-2xl
                        border border-white/10
                        bg-black/20
                        px-5
                        text-sm text-white
                        outline-none
                        transition-all duration-300
                        placeholder:text-white/20
                        focus:border-[#FF3B3B]/50
                        focus:bg-white/4
                        focus:ring-1
                        focus:ring-[#FF3B3B]/20
                      "
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Project Discussion"
                      className="
                        h-14 w-full
                        rounded-2xl
                        border border-white/10
                        bg-black/20
                        px-5
                        text-sm text-white
                        outline-none
                        transition-all duration-300
                        placeholder:text-white/20
                        focus:border-[#FF3B3B]/50
                        focus:bg-white/4
                        focus:ring-1
                        focus:ring-[#FF3B3B]/20
                      "
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                      Message
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us about your project..."
                      className="
                        w-full
                        rounded-3xl
                        border border-white/10
                        bg-black/20
                        px-5 py-4
                        text-sm text-white
                        outline-none
                        transition-all duration-300
                        placeholder:text-white/20
                        focus:border-[#FF3B3B]/50
                        focus:bg-white/4
                        focus:ring-1
                        focus:ring-[#FF3B3B]/20
                        resize-none
                      "
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="submit"
                      disabled={loading}
                      className="
                        group relative overflow-hidden
                        inline-flex items-center gap-2
                        rounded-2xl
                        bg-[#FF3B3B]
                        px-6 py-4
                        text-sm font-semibold text-white
                        shadow-[0_0_40px_rgba(255,59,59,0.25)]
                        transition-all duration-300
                        hover:shadow-[0_0_60px_rgba(255,59,59,0.4)]
                        disabled:cursor-not-allowed
                        disabled:opacity-70
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

                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <ArrowUpRight
                            size={17}
                            className="
                              transition-transform duration-300
                              group-hover:-translate-y-0.5
                              group-hover:translate-x-0.5
                            "
                          />
                        </>
                      )}
                    </motion.button>

                    {status.type && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`
                          flex items-center gap-2
                          text-sm font-medium
                          ${status.type === 'success' ? 'text-green-400' : 'text-red-400'}
                        `}
                      >
                        {status.type === 'success' ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <XCircle size={18} />
                        )}
                        <span>{status.message}</span>
                      </motion.div>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>

          </div>
        </div>
      </section>
    </main>
  );
}