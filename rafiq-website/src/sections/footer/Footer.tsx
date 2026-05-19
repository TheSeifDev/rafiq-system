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

        {/* TOP */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">

          {/* LEFT */}
          <div className="max-w-2xl">
            <h2
              className="
                text-5xl font-black leading-[0.95]
                tracking-tight text-white
                sm:text-6xl
                lg:text-7xl
              "
            >
              Let’s Connect <br />
              There
            </h2>
          </div>

          {/* BUTTON */}
          <Link
            href="/contact"
            className="
              group inline-flex h-16 items-center gap-3
              self-start
              rounded-full
              border border-white/10
              bg-white/5
              px-5 pr-7
              backdrop-blur-xl
              transition-all duration-300
              hover:border-[#FF3B3B]/30
              hover:bg-white/[0.07]
            "
          >
            <div
              className="
                flex h-12 w-12 items-center justify-center
                rounded-full
                bg-black
                text-white
                transition-all duration-300
                group-hover:bg-[#FF3B3B]
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

            <span className="text-sm font-medium text-white">
              Hire Me Now!
            </span>
          </Link>
        </div>

        {/* LINE */}
        <div className="mt-16 h-px w-full bg-white/10" />

        {/* CENTER */}
        <div className="grid gap-12 py-12 sm:grid-cols-2 lg:grid-cols-5">

          {/* BRAND */}
          <div className="lg:col-span-2">

            <div className="flex items-center gap-3">

              {/* LOGO */}
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

            {/* SOCIALS */}
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
        flex h-10 w-10 items-center justify-center
        rounded-xl
        border border-white/10
        bg-white/5
        text-white/60
        transition-all duration-300
        hover:border-[#FF3B3B]/30
        hover:bg-[#FF3B3B]
        hover:text-white
      "
                  >
                    <Icon
                      size={18}
                      className={
                        item.icon === TwitterNew
                          ? 'translate-x-[3.5px] translate-y-[3.5px] size-6'
                          : ''
                      }
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ADDRESS */}
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

          {/* EMAIL */}
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

          {/* PHONE */}
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

        {/* LINE */}
        <div className="h-px w-full bg-white/10" />

        {/* BOTTOM */}
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
      </div>
    </footer>
  );
}