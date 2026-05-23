'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';

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
  Menu,
  Pin,
  PinOff,
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
          className="absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: color }}
          animate={{
            scale: [1, 2.2, 1],
            opacity: [0.75, 0, 0.75],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}
      <span
        className="relative inline-flex h-1.5 w-1.5 rounded-full animate-pulse"
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
}) {
  const Icon = ICON[icon];

  return (
    <Link href={href} onClick={onClick} className="group block w-full">
      <div
        className={[
          'relative flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-300',
          isActive
            ? 'border border-white/10 bg-white/6 shadow-[0_0_15px_rgba(255,59,59,0.04)]'
            : 'border border-transparent hover:border-white/8 hover:bg-white/[0.03]',
        ].join(' ')}
      >
        {isActive && (
          <div
            className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[#FF3B3B]"
            style={{
              boxShadow: '0 0 10px rgba(255,59,59,0.7)',
            }}
          />
        )}

        {Icon && (
          <div
            className={[
              'relative z-10 shrink-0 rounded-lg p-2 transition-all duration-300',
              isActive
                ? 'bg-[#FF3B3B]/15 text-[#FF3B3B]'
                : isWarning
                  ? 'bg-amber-400/10 text-amber-400/60 group-hover:bg-amber-400/15 group-hover:text-amber-400'
                  : 'bg-white/4 text-white/30 group-hover:bg-white/7 group-hover:text-white/60',
            ].join(' ')}
          >
            <Icon size={13} strokeWidth={1.7} />
          </div>
        )}

        <div className="relative z-10 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[12px] font-bold leading-none tracking-wide transition-colors duration-300 ${
                isActive ? 'text-white' : 'text-white/45 group-hover:text-white/80'
              }`}
            >
              {label}
            </span>

            {badge && (
              <span
                className={[
                  'rounded px-1 py-px font-mono text-[7px] font-bold uppercase tracking-wider',
                  isLive ? 'bg-[#FF3B3B]/20 text-[#FF3B3B]/90' : 'bg-white/6 text-white/30',
                ].join(' ')}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-[8.5px] text-white/18 group-hover:text-white/28 transition-colors">
            {sublabel}
          </p>
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-1.5">
          <PulseDot status={status} />
          <ChevronRight
            size={10}
            className={`transition-all duration-300 ${
              isActive
                ? 'text-[#FF3B3B]/60'
                : 'text-white/12 group-hover:translate-x-0.5 group-hover:text-white/40'
            }`}
          />
        </div>
      </div>
    </Link>
  );
}

function SystemFooter() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setTick((n) => n + 1);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const latency = 140 + Math.floor(Math.sin(tick * 0.4) * 35);

  return (
    <div className="border-t border-white/6 px-4 py-4 select-none">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/30">
            SYS ONLINE
          </span>
        </div>
        <span className="font-mono text-[8px] text-[#FF3B3B]/50 tracking-wider">
          AI_READY
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1">
        {[
          { label: 'AI_LATENCY', value: `${latency}ms` },
          { label: 'MQTT_CONN', value: '3_CONN' },
          { label: 'CLOUD_SYNC', value: 'SYNC_OK' },
          { label: 'BUS_STATE', value: 'ACTIVE' },
        ].map((m) => (
          <div
            key={m.label}
            className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.015] px-2 py-1"
          >
            <span className="font-mono text-[7px] uppercase tracking-wider text-white/15">
              {m.label}
            </span>
            <span className="font-mono text-[8px] text-white/35">
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RafiqSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef(pathname);

  // Persistence of pin state
  useEffect(() => {
    const saved = localStorage.getItem('rafiq_sidebar_pinned');
    if (saved === 'true') {
      setIsPinned(true);
      setIsOpen(true);
    }
  }, []);

  // Close floating drawer on navigation
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      if (!isPinned) {
        setIsOpen(false);
      }
      setMobileOpen(false);
    }
  }, [pathname, isPinned]);

  // Click outside to collapse floating panel if unpinned
  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        if (!isPinned) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', clickHandler);
    return () => document.removeEventListener('mousedown', clickHandler);
  }, [isPinned]);

  // Toggle Pinned Open state
  const handleTogglePin = () => {
    const nextPin = !isPinned;
    setIsPinned(nextPin);
    localStorage.setItem('rafiq_sidebar_pinned', String(nextPin));
    if (nextPin) {
      setIsOpen(true);
    }
  };

  const handleMouseEnter = () => {
    if (!isPinned) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setIsOpen(false);
    }
  };

  const isActive = (href: string) =>
    href === '/rafiq' ? pathname === '/rafiq' : pathname.startsWith(href);

  const groups = useMemo(() => rafiqNavGroups, []);

  // Collect all flat items to render in collapsed rail
  const railItems = useMemo(() => {
    return groups.flatMap((group) => group.items);
  }, [groups]);

  return (
    <LazyMotion features={domAnimation}>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="hidden md:block select-none"
      >
        {/* COLLAPSED INTEL RAIL (Always Visible) */}
        <div
          className="fixed left-0 top-0 bottom-0 z-[200] w-[60px] flex flex-col justify-between items-center py-5 bg-[#000109]/60 backdrop-blur-xl border-r border-white/[0.08]"
          style={{ willChange: 'transform, opacity' }}
        >
          {/* Rail Header Logo */}
          <div className="relative group/logo cursor-pointer" onClick={handleTogglePin}>
            <motion.div
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FF3B3B]/20 bg-[#FF3B3B]/8"
              animate={{
                boxShadow: [
                  '0 0 5px rgba(255,59,59,0.1)',
                  '0 0 16px rgba(255,59,59,0.3)',
                  '0 0 5px rgba(255,59,59,0.1)',
                ],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Activity size={16} className="text-[#FF3B3B] animate-pulse" strokeWidth={2} />
            </motion.div>
            <div className="absolute top-1/2 left-[70px] -translate-y-1/2 opacity-0 pointer-events-none group-hover/logo:opacity-100 transition-opacity duration-300 font-mono text-[8px] tracking-widest text-[#FF3B3B] bg-black/90 border border-[#FF3B3B]/25 rounded px-2 py-1 whitespace-nowrap z-50">
              PIN_DECK: {isPinned ? 'LOCK_ON' : 'STBY'}
            </div>
          </div>

          {/* Rail Items List */}
          <div className="flex-1 w-full flex flex-col items-center gap-3.5 justify-center py-6">
            {railItems.map((item) => {
              const Icon = ICON[item.icon];
              const isItemActive = isActive(item.href);

              return (
                <div
                  key={item.id}
                  className="relative group/rail w-full flex justify-center"
                  onMouseEnter={() => setActiveTooltip(item.id)}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  <Link href={item.href} className="relative z-10 block">
                    <motion.div
                      whileHover={{ scale: 1.06 }}
                      className={[
                        'flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300',
                        isItemActive
                          ? 'border-[#FF3B3B]/25 bg-[#FF3B3B]/10 text-[#FF3B3B] shadow-[0_0_15px_rgba(255,59,59,0.12)]'
                          : 'border-transparent bg-white/[0.015] text-white/30 hover:border-white/10 hover:bg-white/[0.05] hover:text-white/70',
                      ].join(' ')}
                    >
                      {Icon && <Icon size={14} strokeWidth={1.8} />}
                    </motion.div>
                  </Link>

                  {/* Active Indicator Strip */}
                  {isItemActive && (
                    <motion.div
                      layoutId="active-rail-bar"
                      className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-[#FF3B3B] shadow-[0_0_8px_rgba(255,59,59,0.8)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  {/* Elegant Mini Tooltips */}
                  <AnimatePresence>
                    {activeTooltip === item.id && (
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="absolute left-[70px] top-1/2 -translate-y-1/2 bg-black/95 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-[9px] text-white tracking-wide whitespace-nowrap z-50 pointer-events-none shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          {item.label}
                          <PulseDot status={item.status} />
                        </div>
                        <div className="text-[7.5px] text-white/35 font-normal tracking-normal mt-0.5">
                          {item.sublabel}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Rail Bottom Indicators */}
          <div className="flex flex-col items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
        </div>

        {/* FLOATING EXPANDED DECK PANEL */}
        <AnimatePresence>
          {isOpen && (
            <motion.aside
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="fixed left-[76px] top-4 bottom-4 w-[260px] z-[199] flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-black/90 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.45),_0_0_40px_rgba(255,59,59,0.015)]"
              style={{ willChange: 'transform, opacity' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/6 px-5 py-4 select-none">
                <div>
                  <div className="text-[12px] font-black uppercase tracking-[0.14em] text-white">
                    RAFIQ
                  </div>
                  <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/25 mt-0.5">
                    Infrastructure OS
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Pin Toggle Button */}
                  <button
                    onClick={handleTogglePin}
                    className={[
                      'flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-200',
                      isPinned
                        ? 'border-[#FF3B3B]/20 bg-[#FF3B3B]/10 text-[#FF3B3B]'
                        : 'border-white/5 bg-white/3 text-white/30 hover:border-white/10 hover:text-white/60',
                    ].join(' ')}
                    title={isPinned ? 'Unpin Sidebar' : 'Pin Sidebar Open'}
                  >
                    {isPinned ? <Pin size={11} /> : <PinOff size={11} />}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/5 bg-white/3 text-white/20 transition-all duration-200 hover:border-white/10 hover:text-white/60"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>

              {/* Navigation Scroller */}
              <nav
                className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5"
                style={{ scrollbarWidth: 'none' }}
              >
                {groups.map((group) => (
                  <div key={group.id} className="space-y-1">
                    <div className="px-3">
                      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-white/18 select-none">
                        {group.label}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <NavItem
                          key={item.id}
                          {...item}
                          isActive={isActive(item.href)}
                          onClick={() => {
                            if (!isPinned) setIsOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Technical Footer */}
              <SystemFooter />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* MOBILE TRIGGER & BOTTOM-SHEET OVERLAY */}
      <div className="block md:hidden">
        {/* Floating Mobile Toggle Button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-5 right-5 z-[201] flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-black/80 text-white backdrop-blur-md shadow-[0_12px_36px_rgba(255,59,59,0.12)]"
        >
          <Menu size={18} />
        </button>

        <AnimatePresence>
          {mobileOpen && (
            <>
              {/* Dimmed Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-[202] bg-black/60 backdrop-blur-[2px]"
              />

              {/* Glass Bottom-Sheet Drawer */}
              <motion.aside
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="fixed bottom-0 inset-x-0 max-h-[82vh] z-[203] flex flex-col rounded-t-[2rem] border-t border-white/[0.1] bg-[#000109]/95 backdrop-blur-2xl px-5 pb-6 pt-4"
              >
                {/* Drag Handle Top Bar */}
                <div className="mx-auto w-12 h-1 rounded-full bg-white/12 mb-4" onClick={() => setMobileOpen(false)} />

                <div className="flex items-center justify-between border-b border-white/6 pb-3">
                  <div>
                    <div className="text-[13px] font-black uppercase tracking-[0.14em] text-white">
                      RAFIQ NAVIGATION
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/25 mt-0.5">
                      Safety System Deck
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-white/3 text-white/40"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Scroller */}
                <div className="flex-1 overflow-y-auto py-4 space-y-6" style={{ scrollbarWidth: 'none' }}>
                  {groups.map((group) => (
                    <div key={group.id} className="space-y-1.5">
                      <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.24em] text-white/18">
                        {group.label}
                      </span>
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <NavItem
                            key={item.id}
                            {...item}
                            isActive={isActive(item.href)}
                            onClick={() => setMobileOpen(false)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <SystemFooter />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}