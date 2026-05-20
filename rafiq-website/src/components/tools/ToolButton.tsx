'use client';

import { ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ToolButton() {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowButton(window.scrollY > window.innerHeight * 0.7);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={`
        group fixed bottom-6 left-6 z-50

        flex h-12 w-12 items-center justify-center

        rounded-xl
        border border-white/10

        bg-black/30
        backdrop-blur-xl

        shadow-[0_8px_30px_rgba(0,0,0,0.35)]

        transition-all duration-500 ease-out

        hover:-translate-y-1
        hover:border-[#FF3B3B]/40
        hover:bg-[#FF3B3B]/10
        hover:shadow-[0_0_30px_rgba(255,59,59,0.25)]

        active:scale-95
        cursor-pointer
        ${
          showButton
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-8 opacity-0'
        }
      `}
    >
      {/* glow */}
      <div
        className="
          absolute inset-0 rounded-2xl
          bg-linear-to-br from-[#FF3B3B]/10 to-transparent
          opacity-0 blur-xl
          transition-opacity duration-500
          group-hover:opacity-100
        "
      />

      {/* icon */}
      <ChevronUp
        size={22}
        strokeWidth={2.8}
        className="
          relative z-10
          translate-y-[0.5px]
          transition-all duration-300
          group-hover:text-[#FF3B3B]
        "
      />
    </button>
  );
}