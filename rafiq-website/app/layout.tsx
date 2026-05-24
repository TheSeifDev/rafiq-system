import type { Metadata } from "next";
import Script from "next/script";
import Navbar from "@/src/components/navigation/Navbar";
import GlobalBackground from "@/src/components/layout/GlobalBackground";

import {
  Montserrat,
  Playwrite_NZ,
} from "next/font/google";

import "./globals.css";
import Footer from "@/src/sections/footer/Footer";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-en",
  display: "swap",
});

const playwrite = Playwrite_NZ({
  weight: "400",
  variable: "--font-en-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://phantomsio.vercel.app"),
  
  title: {
    default: "PHANTOMS | RAFIQ AI Ecosystem",
    template: "%s | PHANTOMS",
  },

  description:
    "RAFIQ is a next-generation AI healthcare and smart home ecosystem focused on elderly safety, real-time monitoring, and offline-first intelligence.",

  keywords: [
    "RAFIQ",
    "PHANTOMS",
    "PHANTOMSIO",
    "AI",
    "Healthcare",
    "IoT",
    "Smart Home",
    "Medical Assistant",
    "Edge AI",
  ],

  authors: [{ name: "Team Phantoms" }],
  creator: "Team Phantoms",
  publisher: "Team Phantoms",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "PHANTOMS — RAFIQ AI Ecosystem",
    description:
      "AI-powered healthcare, emergency automation, and smart home infrastructure.",
    url: "https://phantomsio.vercel.app",
    siteName: "PHANTOMS",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/image.png",
        width: 1200,
        height: 630,
        alt: "RAFIQ AI Ecosystem by Team Phantoms",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "PHANTOMS — RAFIQ AI Ecosystem",
    description: "AI-powered healthcare, emergency automation, and smart home infrastructure.",
    creator: "@YourTwitterHandle",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Team Phantoms",
    "url": "https://phantomsio.vercel.app",
    "logo": "https://phantomsio.vercel.app/logo.png",
    "description": "Developers of RAFIQ, a next-generation AI healthcare and smart home ecosystem.",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Alexandria",
      "addressCountry": "EG"
    },
    "makesOffer": {
      "@type": "Offer",
      "itemOffered": {
        "@type": "SoftwareApplication",
        "name": "RAFIQ",
        "applicationCategory": "HealthApplication",
        "operatingSystem": "All"
      }
    }
  };

  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${playwrite.variable}`}
    >
      <body className="bg-[#000109] text-white overflow-x-hidden">
        {/* حقن الـ Schema بطريقة آمنة */}
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        <GlobalBackground />
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}