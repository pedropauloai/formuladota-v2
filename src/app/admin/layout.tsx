// Layout /admin — guard server-side via is_admin().
// Usa ClientShell (top-bar + bottom-bar consistentes) com hideLeftSidebar=true
// pra dar espaço pra sidebar admin (Dashboard, Users, Temporadas, Lobbies).

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LayoutDashboard, Users, Calendar, Gamepad2, Radio, Coins, Trophy, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { getPreviewModeActive } from "@/lib/auth/preview-mode";
import { getFeatureFlags } from "@/lib/queries/feature-flags";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profile }, previewActive, flags] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single(),
    getPreviewModeActive(),
    getFeatureFlags(),
  ]);

  // Admin em preview mode: bloqueia acesso à área admin (deve usar toggle pra voltar)
  if (!profile?.is_admin || previewActive) {
    redirect("/dashboard");
  }

  // Fichas + PROs pertencem ao mundo ranked-com-pro (fora de prioridade). Com a flag
  // OFF, somem da navegação — AUTORITATIVO: escondido até pro admin (as rotas também
  // redirecionam). Ligar a flag restaura tudo; nada é apagado do banco.
  const rankedOn = flags.ranked_com_pro;

  const t = await getTranslations("misc2");

  return (
    <ClientShell currentRoute="/admin" hideLeftSidebar>
      <div className="flex h-full">
        {/* Admin sidebar interna (substitui left sidebar do user) */}
        <aside className="w-60 border-r border-border-subtle bg-bg-base/60 backdrop-blur-sm p-5 hidden md:block">
          <p className="mb-5 font-sans text-sm font-semibold uppercase tracking-[0.25em] text-brand-primary">
            {t("navAdmin")}
          </p>
          <nav className="space-y-1">
            <AdminNavLink href="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
            {rankedOn && <AdminNavLink href="/admin/pros" icon={Radio} label="PROs" />}
            <AdminNavLink href="/admin/users" icon={Users} label="Users" />
            {rankedOn && <AdminNavLink href="/admin/fichas" icon={Coins} label={t("navFichas")} />}
            <AdminNavLink href="/admin/temporadas" icon={Calendar} label={t("navTemporadas")} />
            <AdminNavLink href="/admin/torneios" icon={Trophy} label={t("navTorneios")} />
            <AdminNavLink href="/admin/lobbies" icon={Gamepad2} label="Lobbies" />
            <AdminNavLink href="/admin/partidas" icon={History} label="Partidas" />
          </nav>
        </aside>
        <div className="flex-1 overflow-x-auto">{children}</div>
      </div>
    </ClientShell>
  );
}

function AdminNavLink({ href, icon: Icon, label }: { href: string; icon: typeof LayoutDashboard; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-3 py-2 font-sans text-sm font-medium text-text-body hover:bg-bg-elevated hover:text-text-display transition-colors"
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </Link>
  );
}
