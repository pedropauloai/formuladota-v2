// Layout /admin — guard server-side via is_admin().
// Usa ClientShell (top-bar + bottom-bar consistentes) com hideLeftSidebar=true
// pra dar espaço pra sidebar admin (Dashboard, Users, Temporadas, Lobbies).

import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Calendar, Gamepad2, Radio, Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { getPreviewModeActive } from "@/lib/auth/preview-mode";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, previewActive] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single(),
    getPreviewModeActive(),
  ]);

  // Admin em preview mode: bloqueia acesso à área admin (deve usar toggle pra voltar)
  if (!profile?.is_admin || previewActive) {
    redirect("/dashboard");
  }

  return (
    <ClientShell currentRoute="/admin" hideLeftSidebar>
      <div className="flex h-full">
        {/* Admin sidebar interna (substitui left sidebar do user) */}
        <aside className="w-60 border-r border-[var(--color-border)] bg-black/60 backdrop-blur-sm p-5 hidden md:block">
          <p className="mb-5 font-sans text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-brand-red)]">
            Admin
          </p>
          <nav className="space-y-1">
            <AdminNavLink href="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <AdminNavLink href="/admin/pros" icon={Radio} label="PROs" />
            <AdminNavLink href="/admin/users" icon={Users} label="Users" />
            <AdminNavLink href="/admin/fichas" icon={Coins} label="Fichas" />
            <AdminNavLink href="/admin/temporadas" icon={Calendar} label="Temporadas" />
            <AdminNavLink href="/admin/lobbies" icon={Gamepad2} label="Lobbies" />
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
      className="flex items-center gap-3 rounded-md px-3 py-2 font-sans text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors"
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </Link>
  );
}
