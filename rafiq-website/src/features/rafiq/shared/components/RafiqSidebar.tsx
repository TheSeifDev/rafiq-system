'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  motion,
  AnimatePresence,
} from 'framer-motion';

import {
  Layers,
  Cpu,
  Brain,
  Database,
  GitBranch,
  Terminal,
  Home,
  ShieldAlert,
  Watch,
  Bot,
  Lock,
  Network,
  RefreshCw,
  Code2,
  AlertTriangle,
  BookOpen,
  Activity,
  ChevronRight,
  X,
} from 'lucide-react';

import { rafiqNavGroups } from '../../config/navigation';
import type { NavStatus } from '../../config/navigation';

const ICON: Record<
  string,
  React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>
> = {
  Layers,
  Cpu,
  Brain,
  Database,
  GitBranch,
  Terminal,
  Home,
  ShieldAlert,
  Watch,
  Bot,
  Lock,
  Network,
  RefreshCw,
  Code2,
  AlertTriangle,
  BookOpen,
  Activity,
};

function PulseDot({ status }: { status: NavStatus }) {
  const color =
    status === 'online'
      ? '#4ade80'
      : status === 'active'
        ? '#FF3B3B'
        : status === 'warning'
          ? '#fbbf24'
          : status === 'syncing'
            ? '#60a5fa'
            : '#6b7280';

  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      {(status === 'online' || status === 'active') && (
        <motion.span
          className="absolute inline-flex h-full w-4/5 rounded-full opacity-75"
          style={{ backgroundColor: color }}
          animate={{
            scale: [1, 2, 1],
            opacity: [0.75, 0, 0.75],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}

      <span
        className="relative inline-flex h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

function NavItem({
  label,
  sublabel,
  href,
  icon,
  status,
  badge,
  isLive,
  isWarning,
  isActive,
  onClick,
  delay,
}: {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  icon: string;
  status: NavStatus;
  badge?: string;
  isLive?: boolean;
  isWarning?: boolean;
  isActive: boolean;
  onClick: () => void;
  delay: number;
}) {
  const Icon = ICON[icon];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.28,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link
        href={href}
        onClick={onClick}
        className="group block"
      >
        <div
          className={[
            'relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-300',
            isActive
              ? 'border border-white/10 bg-white/6'
              : 'border border-transparent hover:border-white/7 hover:bg-white/4',
          ].join(' ')}
        >
          {isActive && (
            <div
              className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-[#FF3B3B]"
              style={{
                boxShadow:
                  '0 0 8px rgba(255,59,59,0.6)',
              }}
            />
          )}

          <span
            className="
              absolute
              inset-0
              rounded-xl
              opacity-0
              shadow-[0_0_20px_rgba(255,59,59,0.12)]
              transition-opacity
              duration-300
              group-hover:opacity-100
            "
          />

          {Icon && (
            <div
              className={[
                'relative z-10 shrink-0 rounded-lg p-1.5 transition-all duration-300',
                isActive
                  ? 'bg-[#FF3B3B]/15 text-[#FF3B3B]'
                  : isWarning
                    ? 'bg-amber-400/10 text-amber-400/60 group-hover:bg-amber-400/15'
                    : 'bg-white/4 text-white/30 group-hover:bg-white/7 group-hover:text-white/60',
              ].join(' ')}
            >
              <Icon
                size={12}
                strokeWidth={1.5}
              />
            </div>
          )}

          <div className="relative z-10 min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[11.5px] font-medium leading-none tracking-wide transition-colors duration-300 ${
                  isActive
                    ? 'text-white'
                    : 'text-white/45 group-hover:text-white/75'
                }`}
              >
                {label}
              </span>

              {badge && (
                <span
                  className={[
                    'rounded px-1 py-px font-mono text-[8px] font-bold uppercase tracking-wider',
                    isLive
                      ? 'bg-[#FF3B3B]/20 text-[#FF3B3B]/90'
                      : 'bg-white/6 text-white/30',
                  ].join(' ')}
                >
                  {badge}
                </span>
              )}
            </div>

            <p className="mt-0.5 truncate font-mono text-[8.5px] text-white/18">
              {sublabel}
            </p>
          </div>

          <div className="relative z-10 flex shrink-0 items-center gap-1.5">
            <PulseDot status={status} />

            <ChevronRight
              size={9}
              className={`transition-all duration-300 ${
                isActive
                  ? 'text-[#FF3B3B]/50'
                  : 'text-white/12 group-hover:translate-x-0.5 group-hover:text-white/30'
              }`}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function CollapsedTab({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      aria-label="Open RAFIQ navigation"
      className="
        group
        fixed
        left-0
        z-201
        flex
        flex-col
        items-center
        justify-center
        gap-2
        overflow-hidden
        rounded-r-xl
      "
      style={{
        width: 18,
        top: '92px',
        bottom: 14,

        background: 'rgba(255,255,255,0.03)',

        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',

        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: 'none',

        boxShadow:
          '0 0 30px rgba(0,0,0,0.22), 2px 0 0 rgba(255,59,59,0.10)',
      }}
      whileHover={{ width: 22 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 28,
      }}
    >
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-px"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(255,59,59,0.4) 50%, transparent 100%)',
        }}
      />

      <motion.div
        className="pointer-events-none absolute left-0 right-0 h-8"
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgba(255,59,59,0.06), transparent)',
        }}
        animate={{
          top: ['10%', '85%', '10%'],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative flex flex-col items-center gap-1.5">
        <motion.div
          className="h-1 w-1 rounded-full bg-[#FF3B3B]/70"
          animate={{
            opacity: [0.4, 1, 0.4],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            boxShadow:
              '0 0 6px rgba(255,59,59,0.6)',
          }}
        />

        {[0, 0.3, 0.6].map((delay, i) => (
          <motion.div
            key={i}
            className="h-px w-1.5 rounded-full bg-white/15"
            animate={{
              opacity: [0.15, 0.5, 0.15],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              delay,
              ease: 'easeInOut',
            }}
          />
        ))}

        <motion.div
          className="h-1 w-1 rounded-full bg-white/20"
          animate={{
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: 1,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
    </motion.button>
  );
}

function SystemFooter({
  delay,
}: {
  delay: number;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setTick((n) => n + 1);
    }, 2800);

    return () => clearInterval(t);
  }, []);

  const latency =
    140 +
    Math.floor(
      Math.sin(tick * 0.4) * 35,
    );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.3,
        delay,
      }}
      className="border-t border-white/6 px-4 py-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PulseDot status="online" />

          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/30">
            System Online
          </span>
        </div>

        <span className="font-mono text-[9px] text-white/18">
          v2.1
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: 'AI', value: `${latency}ms` },
          { label: 'MQTT', value: '3 conn' },
          { label: 'Sync', value: 'OK' },
          { label: 'Layer', value: 'Local' },
        ].map((m) => (
          <div
            key={m.label}
            className="
              flex
              items-center
              justify-between
              rounded-lg
              border
              border-white/5
              bg-white/2
              px-2
              py-1
            "
          >
            <span className="font-mono text-[8px] uppercase tracking-wider text-white/18">
              {m.label}
            </span>

            <span className="font-mono text-[9px] text-white/40">
              {m.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-end justify-center gap-px">
        {[3, 5, 7, 5, 8, 4, 6].map((h, i) => (
          <motion.div
            key={i}
            className="w-px rounded-full bg-[#FF3B3B]/30"
            animate={{
              height: [
                h * 0.5,
                h,
                h * 0.6,
                h * 0.8,
                h * 0.5,
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.12,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function RafiqSidebar() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);

  const sidebarRef =
    useRef<HTMLDivElement>(null);

  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;

      requestAnimationFrame(() => {
        setOpen(false);
      });
    }
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const handler = (e: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(
          e.target as Node,
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handler,
    );

    return () =>
      document.removeEventListener(
        'mousedown',
        handler,
      );
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener(
      'keydown',
      handler,
    );

    return () =>
      window.removeEventListener(
        'keydown',
        handler,
      );
  }, []);

  const isActive = (href: string) =>
    href === '/rafiq'
      ? pathname === '/rafiq'
      : pathname.startsWith(href);

  const groups = useMemo(
    () => rafiqNavGroups,
    [],
  );

  let itemIndex = 0;

  return (
    <>
      {!open && (
        <CollapsedTab
          onClick={() => setOpen(true)}
        />
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.22,
            }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-199"
            style={{
              background:
                'rgba(0,1,9,0.45)',
              backdropFilter: 'blur(2px)',
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.aside
            ref={sidebarRef}
            key="panel"
            initial={{
              x: -264,
              opacity: 0,
            }}
            animate={{
              x: 0,
              opacity: 1,
            }}
            exit={{
              x: -264,
              opacity: 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 30,
              opacity: {
                duration: 0.18,
              },
            }}
            className="
              fixed
              bottom-3
              left-0
              z-200
              flex
              w-65
              flex-col
              overflow-hidden
              rounded-r-xl
            "
            style={{
              top: '92px',

              background:
                'rgba(255,255,255,0.025)',

              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter:
                'blur(24px)',

              border:
                '1px solid rgba(255,255,255,0.09)',

              borderLeft: 'none',

              boxShadow: [
                '0 0 0 0.5px rgba(255,59,59,0.08) inset',
                '4px 0 40px rgba(0,0,0,0.35)',
                '0 0 60px rgba(255,59,59,0.04)',
              ].join(', '),
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/12 to-transparent" />

            <div
              className="pointer-events-none absolute bottom-0 right-0 top-0 w-px"
              style={{
                background:
                  'linear-gradient(to bottom, transparent, rgba(255,59,59,0.15) 50%, transparent)',
              }}
            />

            <motion.div
              initial={{
                opacity: 0,
                y: -8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.28,
                delay: 0.04,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="
                flex
                items-center
                justify-between
                border-b
                border-white/6
                px-5
                py-4
              "
            >
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex
                    h-7
                    w-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-white/10
                  "
                  style={{
                    background:
                      'rgba(255,59,59,0.10)',

                    boxShadow:
                      '0 0 12px rgba(255,59,59,0.15)',
                  }}
                >
                  <Activity
                    size={13}
                    className="text-[#FF3B3B]"
                    strokeWidth={2}
                  />
                </div>

                <div>
                  <div className="text-[12px] font-black uppercase tracking-[0.14em] text-white">
                    RAFIQ
                  </div>

                  <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/25">
                    AI Healthcare OS
                  </div>
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="
                  group
                  flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-white/6
                  bg-white/3
                  text-white/25
                  transition-all
                  duration-200
                  hover:border-white/10
                  hover:text-white/60
                "
              >
                <X size={11} />
              </button>
            </motion.div>

            <nav
              className="
                flex-1
                overflow-y-auto
                py-3
                pr-1
              "
              style={{
                scrollbarWidth: 'none',
              }}
            >
              {groups.map((group, gi) => (
                <div
                  key={group.id}
                  className={
                    gi > 0 ? 'mt-4' : ''
                  }
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: 0.22,
                      delay:
                        0.05 + gi * 0.04,
                    }}
                    className="mb-1 px-4"
                  >
                    <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.22em] text-white/18">
                      {group.label}
                    </span>
                  </motion.div>

                  <div className="space-y-px px-2">
                    {group.items.map((item) => {
                      const delay =
                        0.06 +
                        itemIndex * 0.035;

                      itemIndex++;

                      return (
                        <NavItem
                          key={item.id}
                          {...item}
                          isActive={isActive(
                            item.href,
                          )}
                          onClick={() =>
                            setOpen(false)
                          }
                          delay={delay}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <SystemFooter delay={0.18} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}