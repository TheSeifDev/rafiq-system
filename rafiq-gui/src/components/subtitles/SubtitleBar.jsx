import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '../../store/aiStore';

const SubtitleBar = () => {
  const { speakingText, aiState } = useAIStore();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current && speakingText) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [speakingText]);

  return (
    <AnimatePresence mode="wait">
      {speakingText && aiState === 'speaking' && (
        <motion.div
          className="absolute bottom-20 left-0 right-0 flex justify-center px-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative max-w-3xl w-full">
            {/* Glow background */}
            <div
              className="absolute inset-0 rounded-2xl blur-xl"
              style={{
                background: 'linear-gradient(180deg, rgba(0,212,255,0.3) 0%, rgba(0,255,204,0.1) 100%)',
                filter: 'blur(20px)'
              }}
            />

            {/* Subtitle container */}
            <div
              ref={scrollRef}
              className="relative px-8 py-4 bg-rafiq-bg/90 rounded-2xl border border-rafiq-glow/40 overflow-x-auto"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {/* Left fade */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-rafiq-bg to-transparent z-10" />

              {/* Right fade */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-rafiq-bg to-transparent z-10" />

              {/* Text */}
              <p className="text-rafiq-text text-xl md:text-2xl text-center leading-relaxed whitespace-nowrap font-light">
                {speakingText}
              </p>

              {/* Speaking indicator */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 rounded-full bg-rafiq-glow"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SubtitleBar;