import type { Metadata } from "next";
import Navbar from "@/src/components/navigation/Navbar";

import {
  Montserrat,
  Alexandria,
  Playwrite_GB_J_Guides,
} from "next/font/google";

import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-en",
  display: "swap",
});

const alexandria = Alexandria({
  subsets: ["arabic"],
  variable: "--font-ar",
  display: "swap",
});

const playwrite = Playwrite_GB_J_Guides({
  weight: "400",
  variable: "--font-en-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PHANTOMS",
    template: "%s | PHANTOMS",
  },

  description:
    "RAFIQ is a next-generation AI healthcare and smart home ecosystem focused on elderly safety, real-time monitoring, and offline-first intelligence.",

  keywords: [
    "RAFIQ",
    "PHANTOMS",
    "AI",
    "Healthcare",
    "IoT",
    "Smart Home",
    "Medical Assistant",
    "Edge AI",
  ],

  authors: [{ name: "Phantoms Team" }],

  creator: "Phantoms",
  publisher: "Phantoms",

  openGraph: {
    title: "PHANTOMS — RAFIQ AI Ecosystem",
    description:
      "AI-powered healthcare, emergency automation, and smart home infrastructure.",
    siteName: "PHANTOMS",
    locale: "en_US",
    type: "website",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${alexandria.variable} ${playwrite.variable}`}
    >
      <body className="bg-[#000109] text-white overflow-x-hidden">
        <Navbar />

        <main className="relative min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}