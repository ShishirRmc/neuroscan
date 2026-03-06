import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import Disclaimer from "@/components/Disclaimer";
import FeaturesInfo from "@/components/FeaturesInfo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "NeuroScan AI — Brain Tumor Classification",
  description:
    "AI-powered brain tumor detection from MRI scans. Research prototype — not for clinical use.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen">
        <Navbar />
        <Disclaimer />
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        <FeaturesInfo />
      </body>
    </html>
  );
}
