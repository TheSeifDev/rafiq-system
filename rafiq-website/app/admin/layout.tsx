"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("admin_token");
      const user = localStorage.getItem("admin_user");

      if (!token || !user) {
        router.push("/login");
        return;
      }

      setAuthenticated(true);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="flex min-h-screen bg-slate-950">
      <aside className="w-64 border-r border-slate-800 p-4">
        <h2 className="text-lg font-bold text-white">Rafiq Admin</h2>
        <nav className="mt-4 space-y-2">
          <a href="/admin" className="block text-slate-400 hover:text-white">Dashboard</a>
          <a href="/admin/services" className="block text-slate-400 hover:text-white">Services</a>
          <a href="/admin/blog" className="block text-slate-400 hover:text-white">Blog</a>
        </nav>
        <button
          onClick={() => {
            localStorage.removeItem("admin_token");
            localStorage.removeItem("admin_user");
            router.push("/login");
          }}
          className="mt-4 text-red-400"
        >
          Logout
        </button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}