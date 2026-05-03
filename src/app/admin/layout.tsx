// Layout /admin — guard server-side via is_admin().
// Phase 8 H6.

import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Calendar, Gamepad2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/perfil");
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <aside className="w-64 border-r border-[var(--color-border)] bg-[var(--color-card)] p-6 hidden md:block">
        <p className="mb-6 font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
          Admin
        </p>
        <nav className="space-y-1">
          <AdminNavLink href="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <AdminNavLink href="/admin/users" icon={Users} label="Users" />
          <AdminNavLink href="/admin/temporadas" icon={Calendar} label="Temporadas" />
          <AdminNavLink href="/admin/lobbies" icon={Gamepad2} label="Lobbies" />
        </nav>
      </aside>
      <main className="flex-1 overflow-x-auto">{children}</main>
    </div>
  );
}

function AdminNavLink({ href, icon: Icon, label }: { href: string; icon: typeof LayoutDashboard; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-3 py-2 font-sans text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)] transition-colors"
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </Link>
  );
}
