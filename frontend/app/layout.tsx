import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import SmoothScroll from "./components/SmoothScroll";
import AuthAccessGuard from "./components/AuthAccessGuard";
import PrivacyTermsModal from "./components/PrivacyTermsModal";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Confera — Pametno mreženje na konferencah",
  description:
    "Sistem za ciljno usmerjeno mreženje med udeleženci konference. Akademija, industrija, javna uprava.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="sl"
      className={`${cormorant.variable} ${dmSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <SmoothScroll>
          <AuthAccessGuard>{children}</AuthAccessGuard>
        </SmoothScroll>
        <PrivacyTermsModal />
      </body>
    </html>
  );
}
