import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/sonner";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fórmula Dota — mentoria Immortal em tempo real",
  description:
    "Compre partidas ranked com Pedro Paulo (Immortal/Top 0.5%). Mentoria 1-1 dentro do jogo, agendada via Discord.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${spaceGrotesk.variable} ${jetbrains.variable}`}
    >
      <body>
        {children}
        {/* Toaster global — qualquer Client Component pode chamar toast() */}
        <Toaster />
      </body>
    </html>
  );
}
