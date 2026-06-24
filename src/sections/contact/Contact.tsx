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

export default function Contact() {
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

  const handleSubmit = async (
  e: React.FormEvent<HTMLFormElement>
) => {
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
      throw new Error(
        data.message || 'Failed to send message.'
      );
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
      message:
        error instanceof Error
          ? error.message
          : 'Something went wrong.',
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
    <section className="relative overflow-hidden py-16 sm:py-20">
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <span
            className="
              inline-flex items-center
              rounded-full border border-white/10
              bg-white/5
              px-3 py-1
              text-[10px] font-semibold uppercase
              tracking-[0.25em]
              text-[#FF3B3B]
              backdrop-blur-xl
            "
          >
            Contact
          </span>

          <h2
            className="
              mt-5
              text-3xl font-black leading-[1.05]
              tracking-tight text-white
              sm:text-4xl
              lg:text-5xl font-display
            "
          >
            Let&apos;s Create Something <br />
            Exceptional Together
          </h2>

          <p
            className="
              mx-auto mt-5 max-w-xl
              text-sm leading-relaxed text-white/50
              sm:text-[15px]
            "
          >
            Reach out for AI systems, smart automation,
            cybersecurity, embedded solutions, and
            modern digital platforms.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_320px]">

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="
              rounded-[28px]
              border border-white/10
              bg-white/5
              p-5
              backdrop-blur-2xl
              sm:p-7
            "
          >
            <div className="grid gap-4 sm:grid-cols-2">

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-white/50">
                  Full Name
                </label>

                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="John Carter"
                  className="
                    h-12 w-full rounded-2xl
                    border border-white/10
                    bg-white/5
                    px-4
                    text-sm text-white
                    outline-none
                    transition-all duration-300
                    placeholder:text-white/25
                    focus:border-[#FF3B3B]/40
                    focus:bg-white/[0.07]
                  "
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-white/50">
                  Email
                </label>

                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                  placeholder="the.phantoms.dev@gmail.com"
                  className="
                    h-12 w-full rounded-2xl
                    border border-white/10
                    bg-white/5
                    px-4
                    text-sm text-white
                    outline-none
                    transition-all duration-300
                    placeholder:text-white/25
                    focus:border-[#FF3B3B]/40
                    focus:bg-white/[0.07]
                  "
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-white/50">
                Subject
              </label>

              <input
                type="text"
                required
                value={form.subject}
                onChange={(e) =>
                  setForm({
                    ...form,
                    subject: e.target.value,
                  })
                }
                placeholder="Project Discussion"
                className="
                  h-12 w-full rounded-2xl
                  border border-white/10
                  bg-white/5
                  px-4
                  text-sm text-white
                  outline-none
                  transition-all duration-300
                  placeholder:text-white/25
                  focus:border-[#FF3B3B]/40
                  focus:bg-white/[0.07]
                "
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-white/50">
                Message
              </label>

              <textarea
                rows={5}
                required
                value={form.message}
                onChange={(e) =>
                  setForm({
                    ...form,
                    message: e.target.value,
                  })
                }
                placeholder="Tell us about your project..."
                className="
                  w-full rounded-2xl
                  border border-white/10
                  bg-white/5
                  px-4 py-3
                  text-sm text-white
                  outline-none
                  transition-all duration-300
                  placeholder:text-white/25
                  focus:border-[#FF3B3B]/40
                  focus:bg-white/[0.07]
                "
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">

              <button
                type="submit"
                disabled={loading}
                className="
                  group inline-flex items-center gap-2
                  rounded-2xl
                  bg-[#FF3B3B]
                  px-5 py-3
                  text-sm font-semibold text-white
                  shadow-[0_0_35px_rgba(255,59,59,0.25)]
                  transition-all duration-300
                  hover:scale-[1.02]
                  hover:shadow-[0_0_55px_rgba(255,59,59,0.4)]
                  disabled:cursor-not-allowed
                  disabled:opacity-70
                "
              >
                {loading ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message

                    <ArrowUpRight
                      size={16}
                      className="
                        transition-transform duration-300
                        group-hover:-translate-y-0.5
                        group-hover:translate-x-0.5
                      "
                    />
                  </>
                )}
              </button>

              {status.type && (
                <div
                  className={`
                    flex items-center gap-2
                    text-sm font-medium
                    ${status.type === 'success'
                      ? 'text-green-400'
                      : 'text-red-400'
                    }
                  `}
                >
                  {status.type === 'success' ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <XCircle size={18} />
                  )}

                  <span>{status.message}</span>
                </div>
              )}
            </div>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            viewport={{ once: true }}
            className="flex flex-col gap-4"
          >
            {[
              {
                icon: Mail,
                title: 'Email',
                value: 'the.phantoms.dev@gmail.com',
              },
              {
                icon: Phone,
                title: 'Phone',
                value: '+20 122 136 9658',
              },
              {
                icon: MapPin,
                title: 'Location',
                value: 'Alexandria, Egypt',
              },
            ].map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  key={index}
                  className="
                    rounded-3xl
                    border border-white/10
                    bg-white/5
                    p-5
                    backdrop-blur-xl
                    transition-all duration-300
                    hover:border-[#FF3B3B]/30
                    hover:bg-white/6
                  "
                >
                  <div
                    className="
                      flex h-11 w-11 items-center justify-center
                      rounded-2xl
                      bg-[#FF3B3B]/10
                      text-[#FF3B3B]
                    "
                  >
                    <Icon size={20} />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-white">
                    {item.title}
                  </h3>

                  <p className="mt-1 text-sm text-white/50">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}