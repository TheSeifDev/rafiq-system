'use client';

import React, { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MessageSquareText,
  Send,
  Star,
} from 'lucide-react';

import { AnimatePresence, motion } from 'framer-motion';

import {
  Instagram,
  TwitterNew,
  YouTube,
  GitHub,
} from '@deemlol/next-icons';
import Image from 'next/image';
import { supabaseClient } from '@/lib/client';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

type ReviewResponse = {
  success: boolean;
  message?: string;
};
function FooterReviewForm() {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [text, setText] = useState('');

  const [submitState, setSubmitState] =
    useState<SubmitState>('idle');

  const [statusMessage, setStatusMessage] =
    useState('');

  const activeRating = hoveredRating ?? rating;
  const isSubmitting =
    submitState === 'submitting';

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSubmitState('submitting');
    setStatusMessage('');

    try {
      const supabase = supabaseClient;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        '/api/reviews',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token
              ? {
                  Authorization: `Bearer ${session.access_token}`,
                }
              : {}),
          },
          body: JSON.stringify({
            name,
            role,
            rating,
            text,
          }),
        }
      );

      const result =
        (await response.json()) as ReviewResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            'Review could not be submitted.'
        );
      }

      setName('');
      setRole('');
      setRating(5);
      setHoveredRating(null);
      setText('');

      setSubmitState('success');
      setStatusMessage(
        result.message ||
          'Review submitted successfully.'
      );

      router.refresh();

      setTimeout(() => {
        setOpen(false);
        setSubmitState('idle');
        setStatusMessage('');
      }, 1500);
    } catch (error) {
      setSubmitState('error');
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong.'
      );
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="
          group relative mt-5 inline-flex h-16 items-center gap-4
          self-start overflow-hidden rounded-full
          border border-white/10
          bg-white/3
          px-5 pr-8
          backdrop-blur-2xl
          shadow-[0_8px_40px_rgba(0,0,0,0.35)]
          transition-all duration-500 ease-out
          hover:-translate-y-1
          hover:border-[#FF3B3B]/40
          hover:bg-white/6
          hover:shadow-[0_0_45px_rgba(255,59,59,0.18)]
        "
      >
        <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div
            className="
              absolute -left-10 top-1/2 h-32 w-32
              -translate-y-1/2 rounded-full
              bg-[#FF3B3B]/20 blur-3xl
            "
          />
        </div>

        <div
          className="
            relative z-10 flex h-12 w-12
            items-center justify-center rounded-full
            border border-white/10
            bg-black/80 shadow-inner shadow-white/5
            transition-all duration-500
            group-hover:scale-110
            group-hover:border-[#FF3B3B]/30
            group-hover:bg-[#FF3B3B]
          "
        >
          <MessageSquareText size={18} />
        </div>

        <div className="relative z-10 flex flex-col">
          <span
            className="
              text-[15px] font-semibold
              tracking-wide text-white
              transition-all duration-300
              group-hover:text-[#FF3B3B] items-start text-left
            "
          >
            Leave Review
          </span>

          <span
            className="
              text-xs text-white/40
              transition-all duration-300
              group-hover:text-white/60
            "
          >
            Share your experience with us
          </span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="
                fixed inset-0 z-[120]
                bg-black/70
                backdrop-blur-xl
              "
            />

            <motion.div
              initial={{
                opacity: 0,
                scale: 0.92,
                y: 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: 10,
              }}
              transition={{
                duration: 0.35,
              }}
              className="
                fixed left-1/2 top-1/2
                z-[130]
                w-[92vw] max-w-xl
                -translate-x-1/2 -translate-y-1/2
              "
            >
              <form
                onSubmit={handleSubmit}
                className="
                  relative overflow-hidden rounded-[2rem]
                  border border-white/10
                  bg-[#050505]/85
                  p-6
                  backdrop-blur-3xl
                  shadow-[0_35px_100px_rgba(0,0,0,0.65)]
                "
              >
                <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#FF3B3B]/12 blur-3xl" />

                <div className="relative z-10">
                  <h3 className="text-3xl font-bold text-white">
                    Leave Review
                  </h3>

                  <p className="mt-2 text-sm text-white/45">
                    Share your feedback.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <input
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value)
                      }
                      placeholder="Name"
                      required
                      className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none focus:border-[#FF3B3B]/40"
                    />

                    <input
                      value={role}
                      onChange={(e) =>
                        setRole(e.target.value)
                      }
                      placeholder="Role"
                      className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none focus:border-[#FF3B3B]/40"
                    />
                  </div>

                  <div className="mt-5 flex gap-2">
                    {Array.from({ length: 5 }).map(
                      (_, i) => {
                        const value = i + 1;

                        return (
                          <button
                            key={value}
                            type="button"
                            onMouseEnter={() =>
                              setHoveredRating(value)
                            }
                            onMouseLeave={() =>
                              setHoveredRating(null)
                            }
                            onClick={() =>
                              setRating(value)
                            }
                          >
                            <Star
                              size={22}
                              className={
                                value <= activeRating
                                  ? 'fill-[#FF3B3B] text-[#FF3B3B]'
                                  : 'text-white/20'
                              }
                            />
                          </button>
                        );
                      }
                    )}
                  </div>

                  <textarea
                    value={text}
                    onChange={(e) =>
                      setText(e.target.value)
                    }
                    rows={5}
                    required
                    placeholder="Excellent architecture..."
                    className="
                      mt-5 w-full rounded-2xl
                      border border-white/10
                      bg-white/[0.04]
                      p-4 text-white
                      outline-none resize-none
                      focus:border-[#FF3B3B]/40
                    "
                  />

                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-xs text-white/40">
                      {statusMessage}
                    </p>

                    <button
                      disabled={isSubmitting}
                      className="
                        inline-flex h-12 items-center gap-2
                        rounded-full bg-[#FF3B3B]
                        px-5 text-sm font-bold text-white
                        transition hover:bg-[#ff5252]
                      "
                    >
                      {isSubmitting ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <Send size={16} />
                      )}
                      Submit
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 py-16 sm:py-20">

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">

          <div className="max-w-2xl">
            <h2
              className="
                text-5xl font-black leading-[0.95]
                tracking-tight text-white
                sm:text-6xl
                lg:text-7xl font-display
              "
            >
              Let&apos;s Connect <br />
              There
            </h2>
          </div>
          <div className="flex w-full flex-col items-start lg:w-auto lg:items-end">
            <Link
              href="/contact"
              className="
    group relative inline-flex h-16 items-center gap-4
    self-start overflow-hidden

    rounded-full
    border border-white/10

    bg-white/3
    px-5 pr-8

    backdrop-blur-2xl

    shadow-[0_8px_40px_rgba(0,0,0,0.35)]

    transition-all duration-500 ease-out

    hover:-translate-y-1
    hover:border-[#FF3B3B]/40
    hover:bg-white/6
    hover:shadow-[0_0_45px_rgba(255,59,59,0.18)]
    lg:self-end
  "
            >
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
        absolute -left-10 top-1/2 h-32 w-32
        -translate-y-1/2
        rounded-full
        bg-[#FF3B3B]/20
        blur-3xl
      "
                />
              </div>

              <div
                className="
      relative z-10

      flex h-12 w-12 items-center justify-center

      rounded-full

      border border-white/10
      bg-black/80

      shadow-inner shadow-white/5

      transition-all duration-500

      group-hover:scale-110
      group-hover:border-[#FF3B3B]/30
      group-hover:bg-[#FF3B3B]
      group-hover:shadow-[0_0_25px_rgba(255,59,59,0.45)]
    "
              >
                <ArrowUpRight
                  size={18}
                  strokeWidth={2.5}
                  className="
        translate-x-[0.5px] translate-y-[-0.5px]

        transition-all duration-500

        group-hover:translate-x-1
        group-hover:-translate-y-1
      "
                />
              </div>

              <div className="relative z-10 flex flex-col">
                <span
                  className="
        text-[15px]
        font-semibold
        tracking-wide
        text-white

        transition-all duration-300
        group-hover:text-[#FF3B3B]
      "
                >
                  Hire Me Now
                </span>

                <span
                  className="
        text-xs
        text-white/40
        transition-all duration-300
        group-hover:text-white/60
      "
                >
                  Let&apos;s build something powerful
                </span>
              </div>

              <div
                className="
      absolute inset-0 -translate-x-full
      bg-linear-to-r
      from-transparent
      via-white/10
      to-transparent

      transition-transform duration-1000
      group-hover:translate-x-full
    "
              />
            </Link>

            <FooterReviewForm />
          </div>
        </div>

        <div className="mt-16 h-px w-full bg-white/10" />

        <div className="grid gap-12 py-12 sm:grid-cols-2 lg:grid-cols-5">

          <div className="lg:col-span-2">

            <div className="flex items-center gap-3">

              <div
                className="
    relative flex h-22 w-22 items-center justify-center
    overflow-hidden
  "
              >
                <Image
                  src="/icon.ico"
                  alt="Phantoms Logo"
                  fill
                  sizes="44px"
                  className="object-contain p-1"
                />
              </div>

              <h3 className="text-2xl font-bold text-white">
                Phantoms
              </h3>
            </div>

            <p
              className="
                mt-5 max-w-sm
                text-sm leading-relaxed text-white/45
              "
            >
              AI engineering team building intelligent healthcare,
              smart automation, cybersecurity systems,
              and futuristic digital experiences.
            </p>

            <div className="mt-6 flex items-center gap-3">

              {[
                {
                  icon: Instagram,
                  href: '#',
                },
                {
                  icon: TwitterNew,
                  href: '#',
                },
                {
                  icon: YouTube,
                  href: '#',
                },
                {
                  icon: GitHub,
                  href: '#',
                },
              ].map((item, index) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={index}
                    href={item.href}
                    className="
    mt-4
    flex h-10 w-10 items-center justify-center
    rounded-xl
    border border-white/10
    bg-white/5
    text-white
    backdrop-blur-md
    transition-all duration-300
    hover:border-[#FF3B3B]/50
    hover:bg-[#FF3B3B]/10
    hover:text-[#FF3B3B]
  "
                  >
                    <Icon
                      size={18}
                      className={
                        item.icon === TwitterNew
                          ? 'translate-x-[4.5px] translate-y-[4.5px] size-6'
                          : ''
                      }
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <h4
              className="
                text-sm font-semibold uppercase
                tracking-[0.2em]
                text-white
              "
            >
              Address
            </h4>

            <p
              className="
                mt-5
                text-sm leading-relaxed text-white/45
              "
            >
              Alexandria, Egypt
            </p>
          </div>

          <div>
            <h4
              className="
                text-sm font-semibold uppercase
                tracking-[0.2em]
                text-white
              "
            >
              Email Address
            </h4>

            <div className="mt-5 space-y-3">

              <Link
                href="mailto:the.phantoms.dev@gmail.com"
                className="
                  block text-sm text-white/45
                  transition-colors duration-300
                  hover:text-[#FF3B3B]
                "
              >
                the.phantoms.dev@gmail.com
              </Link>
            </div>
          </div>

          <div>
            <h4
              className="
                text-sm font-semibold uppercase
                tracking-[0.2em]
                text-white
              "
            >
              Phone Number
            </h4>

            <div className="mt-5 space-y-3">

              <Link
                href="tel:+201221369658"
                className="
                  block text-sm text-white/45
                  transition-colors duration-300
                  hover:text-[#FF3B3B]
                "
              >
                +20 122 136 9658
              </Link>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-white/10" />

        <div
          className="
            flex flex-col gap-5 pt-8
            text-center
            sm:flex-row sm:items-center sm:justify-between
            sm:text-left
          "
        >

          <p className="text-sm text-white/35">
            © 2026 Phantoms. All rights reserved.
          </p>

          <div className="flex items-center justify-center gap-6 sm:justify-end">

            {[
              'Templates',
              'Tools',
              'Features',
              'About Us',
            ].map((item) => (
              <Link
                key={item}
                href="#"
                className="
                  text-sm text-white/35
                  transition-colors duration-300
                  hover:text-[#FF3B3B]
                "
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-10 h-px w-full bg-linear-to-r from-transparent via-white/10 to-transparent" />

        <div className="flex items-center justify-center py-8">
          <Link
            href="https://seifdev.vercel.app/"
            target="_blank"
            className="
      group relative inline-flex items-center gap-4

      text-white/45

      transition-all duration-300

      hover:text-white
    "
          >
            <div
              className="
        absolute inset-0 -z-10
        rounded-full
        bg-[#FF3B3B]/10
        opacity-0 blur-2xl
        transition-opacity duration-500
        group-hover:opacity-100
      "
            />

            <div
              className="
        relative

        h-14 w-14
        shrink-0

        overflow-hidden
        rounded-2xl

        border border-white/10
        bg-white/3

        backdrop-blur-xl

        transition-all duration-300

        group-hover:border-[#FF3B3B]/40
        group-hover:bg-[#FF3B3B]/10
        group-hover:shadow-[0_0_25px_rgba(255,59,59,0.2)]
      "
            >
              <Image
                src="/S.png"
                alt="TheSeifDev Logo"
                fill
                sizes="56px"
                className="object-contain p-1.5"
              />
            </div>

            <div className="flex items-center gap-2">
              <span
                className="
          text-sm tracking-wide text-white/35
          transition-colors duration-300
          group-hover:text-white/50
        "
              >
                Developed by
              </span>

              <span
                className="
          text-base font-semibold tracking-tight text-white

          transition-colors duration-300
          group-hover:text-[#FF3B3B]
        "
              >
                TheSeifDev
              </span>

              <ArrowUpRight
                size={16}
                className="
          transition-all duration-300

          group-hover:-translate-y-0.5
          group-hover:translate-x-0.5
          group-hover:text-[#FF3B3B]
        "
              />
            </div>
          </Link>
        </div>
      </div>

    </footer>
  );
}
