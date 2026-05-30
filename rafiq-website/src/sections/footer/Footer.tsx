'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
} from 'lucide-react';

import {
  Instagram,
  TwitterNew,
  YouTube,
  GitHub,
} from '@deemlol/next-icons';
import Image from 'next/image';

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