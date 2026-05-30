"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Briefcase,
  Layers,
  Image as ImageIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Settings,
  Shield,
  Sparkles,
  User,
  Crown,
  Activity,
} from "lucide-react";
import { supabaseClient } from "@/lib/client";
import { useRouter } from "next/navigation";

const menuItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, badge: null },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare, badge: "new" },
  { href: "/admin/blog", label: "Blog", icon: FileText, badge: null },
  { href: "/admin/experience", label: "Experience", icon: Briefcase, badge: null },
  { href: "/admin/services", label: "Services", icon: Layers, badge: null },
];

interface AdminSidebarProps {
  user: {
    full_name?: string;
    email?: string;
    role?: string;
    avatar_url?: string;
  };
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(3);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    router.push("/login");
    router.refresh();
  };

  const getRoleIcon = (role?: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return <Crown className="h-3 w-3 text-amber-400" />;
      case "moderator":
        return <Shield className="h-3 w-3 text-blue-400" />;
      default:
        return <User className="h-3 w-3 text-slate-400" />;
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "moderator":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  if (!mounted) {
    return (
      <aside className="fixed left-0 top-0 z-40 h-screen w-[280px] border-r border-white/5 bg-[#0a0a0f]">
        <div className="flex h-16 items-center border-b border-white/5 px-6">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-800" />
        </div>
      </aside>
    );
  }

  return (
    <>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setCollapsed(true)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/5 bg-[#0a0a0f]/95 backdrop-blur-2xl"
      >

        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />


        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-5">
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3"
              >
                <Link href="/admin" className="flex items-center gap-3 group">
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-rose-500 shadow-lg shadow-rose-500/20 transition-transform duration-300 group-hover:scale-110">
                    <Sparkles className="h-5 w-5 text-white" />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 opacity-0 blur transition-opacity duration-300 group-hover:opacity-50" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-white">Rafiq</span>
                    <span className="ml-1 text-xs font-medium text-rose-400">Admin</span>
                  </div>
                </Link>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="mx-auto"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-rose-500 shadow-lg shadow-rose-500/20">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-all duration-300 hover:border-white/20 hover:text-white hover:bg-white/5"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="shrink-0 px-4 pt-4"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 transition-all duration-300 focus:border-rose-500/30 focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-rose-500/10"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3 pt-4">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isHovered = hoveredItem === item.href;

            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                onMouseEnter={() => setHoveredItem(item.href)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Link
                  href={item.href}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
                    active
                      ? "bg-gradient-to-r from-rose-500/10 to-transparent text-rose-400"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >

                  {active && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-rose-500"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

     
                  <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-300 ${
                    active
                      ? "bg-rose-500/10 text-rose-400"
                      : isHovered
                      ? "bg-white/5 text-white"
                      : "bg-transparent text-slate-500"
                  }`}>
                    <Icon className={`h-5 w-5 transition-transform duration-300 ${isHovered ? "scale-110" : ""}`} />


                    {item.badge && collapsed && (
                      <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-rose-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      </span>
                    )}
                  </div>


                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {active && !collapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="ml-auto"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    </motion.div>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

 
        <div className="mx-4 my-2 h-px shrink-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="shrink-0 border-t border-white/5">

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-3"
              >
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all duration-300 hover:bg-white/5 hover:text-white">
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
                    <Bell className="h-5 w-5" />
                    {notifications > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-[#0a0a0f]">
                        {notifications}
                      </span>
                    )}
                  </div>
                  <span className="flex-1 text-left">Notifications</span>
                </button>

                <button className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all duration-300 hover:bg-white/5 hover:text-white">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
                    <Settings className="h-5 w-5" />
                  </div>
                  <span>Settings</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

 
          <div className="p-4">
            <AnimatePresence mode="wait">
              {!collapsed ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
                >
                  <div className="flex items-center gap-3">

                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/20 to-blue-500/20 ring-2 ring-white/5">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-slate-400" />
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-[#0a0a0f]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {user?.full_name || "Admin User"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {user?.email || "admin@rafiq.com"}
                      </p>
                    </div>
                  </div>


                  <div className="mt-3 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${getRoleColor(user?.role)}`}>
                      {getRoleIcon(user?.role)}
                      {user?.role || "User"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400">
                      <Activity className="h-3 w-3" />
                      Online
                    </span>
                  </div>

  
                  <button
                    onClick={handleLogout}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm font-medium text-red-400 transition-all duration-300 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/20 to-blue-500/20 ring-2 ring-white/5">
                    <User className="h-5 w-5 text-slate-400" />
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-[#0a0a0f]" />
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-red-400 transition-all duration-300 hover:bg-red-500/10"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>
    </>
  );
}