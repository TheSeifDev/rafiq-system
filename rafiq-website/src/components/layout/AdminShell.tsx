// src/components/layout/AdminShell.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {AdminSidebar} from "./AdminSidebar";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);  

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("admin_token");
      const userData = localStorage.getItem("admin_user");

      if (!token || !userData) {
        router.push("/login");
        return;
      }

      try {
        setUser(JSON.parse(userData));  
      } catch {
        setUser({ name: "Admin" });    
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
      <AdminSidebar user={user} /> 
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}