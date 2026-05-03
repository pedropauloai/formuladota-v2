import type { Metadata } from "next";
import { Cinzel, Marcellus, Inter } from "next/font/google";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

// Cinzel — fonte de impacto pra headings (alternativa open-source da Reaver Valve).
// Substitui Space Grotesk como display font do projeto.
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  variable: "--font-display",
  display: "swap",
});

// Marcellus — romana clean pra subheadings e quotes (alternativa Goudy Trajan Valve).
const marcellus = Marcellus({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-serif",
  display: "swap",
});

// Inter — sans-serif moderna pra body, nav, buttons, forms (alternativa Radiance Valve).
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FORMULADOTA — HUB Dota 2 Brasil",
  description:
    "FORMULADOTA: o HUB Dota 2 brasileiro. Lobbies in-house, ranking por temporadas, doutrina cultural. Comunidade alinhada culturalmente, integrada a Discord e Steam.",
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
      className={`${cinzel.variable} ${marcellus.variable} ${inter.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        {/* Header global — Server Component lê auth state e mostra login OU avatar+dropdown */}
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
        {/* Toaster global — qualquer Client Component pode chamar toast() */}
        <Toaster />
      </body>
    </html>
  );
}
