import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const serif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", display: "swap" });

export const metadata: Metadata = {
  title: { default: "DoseCost: GLP-1 Cost Guardian", template: "%s · DoseCost" },
  description:
    "Find your cheapest legal path to Zepbound, Wegovy and other GLP-1s, decode a denial letter, and never overpay. Not medical, legal or financial advice.",
};

export const viewport: Viewport = { themeColor: "#0e6b5e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body className="font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
          Skip to content
        </a>
        {children}
        <Toaster position="top-center" richColors theme="light" />
      </body>
    </html>
  );
}
