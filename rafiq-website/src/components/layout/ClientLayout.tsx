"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/src/components/navigation/Navbar";
import GlobalBackground from "@/src/components/layout/GlobalBackground";
import Footer from "@/src/sections/footer/Footer";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") || pathname === "/login";

  return (
    <>
      <GlobalBackground />
      {!isAdmin && <Navbar />}
      <main className="min-h-screen">
        {children}
      </main>
      {!isAdmin && <Footer />}
    </>
  );
}