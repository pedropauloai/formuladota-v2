/**
 * DevLayout — Route group (dev) gating
 *
 * Retorna 404 em produção. Apenas acessível em desenvolvimento local.
 * DF8.3 — dev-only design system browser.
 */

import { notFound } from "next/navigation";

export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <>{children}</>;
}
