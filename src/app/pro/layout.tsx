// /pro — Layout gate Server Component.
//
// Valida sessão + status PRO ativo antes de renderizar qualquer rota /pro/*.
// Redireciona:
//   - Não autenticado → /login (ClientShell server-side faz o redirect)
//   - Autenticado sem pro_promotion ativa → /me?msg=not_a_pro
//   - PRO ativo ou pausado → renderiza children com ClientShell (sidebar esquerda oculta)

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gate 1: autenticação
  if (!user) {
    redirect("/");
  }

  // Gate 2 (corrigido 2026-06-12): o cockpit é gestão de FILA — quem tem
  // registro de coach entra (Pedro/founder tem coach sem pro_promotion;
  // o gate antigo por promotion o expulsava do próprio painel).
  const [{ data: promotion }, { data: coach }] = await Promise.all([
    supabase
      .from("pro_promotions")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["active", "paused"])
      .maybeSingle(),
    supabase
      .from("coaches")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  if (!promotion && !coach) {
    // Nem PRO promovido nem coach — sem painel
    redirect("/me?msg=not_a_pro");
  }

  // PRO ativo ou pausado: renderiza painel PRO com left sidebar oculta
  // (painel PRO tem sidebar interna própria, igual ao admin)
  return (
    <ClientShell currentRoute="/pro" hideLeftSidebar>
      <div className="flex h-full">
        {/* Sidebar interna do painel PRO */}
        <aside className="w-56 border-r border-border-subtle bg-black/60 backdrop-blur-sm p-5 hidden md:block">
          <p className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
            Painel PRO
          </p>
          <nav className="space-y-1 text-sm">
            <ProNavLink href="/pro" label="Visao Geral" />
            <ProNavLink href="/pro#alunos" label="Meus Alunos" />
            <ProNavLink href="/pro#revenue" label="Revenue" />
          </nav>
        </aside>
        <div className="flex-1 overflow-x-auto">{children}</div>
      </div>
    </ClientShell>
  );
}

function ProNavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center rounded-md px-3 py-2 font-sans text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors"
    >
      {label}
    </a>
  );
}
