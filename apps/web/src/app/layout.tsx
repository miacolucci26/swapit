import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SCRIPT_TEMA } from "@/lib/tema-script";

// Inter para todo (400–700); las cifras usan tabular-nums con la clase .num.
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Swapit — Intercambio de materiales e insumos entre empresas",
  description:
    "Swapit conecta empresas que tienen excedentes de materiales con las que los usan como insumo: publica, encuentra, negocia y mide el impacto de cada acuerdo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <head><script>{SCRIPT_TEMA}</script></head>
      <body className="min-h-full flex flex-col bg-bg text-ink-900">{children}</body>
    </html>
  );
}
