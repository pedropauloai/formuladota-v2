// /perfil — dentro do ClientShell (mesma estética do dashboard).
// Mostra dados do user logado, saldo de fichas, e botão sair.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { getPreviewModeActive } from "@/lib/auth/preview-mode";
import { getMyFichaBalance } from "@/lib/queries/fichas";
import { ClientShell } from "@/components/client-shell/shell";

export const metadata = {
  title: "Perfil — FORMULADOTA",
};

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, previewActive, fichaBalance] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, discord_id, username, avatar_url, email, is_admin, mmr_atual, role_preferida")
      .eq("id", user.id)
      .single(),
    getPreviewModeActive(),
    getMyFichaBalance(user.id),
  ]);
  const showAsAdmin = profile?.is_admin === true && !previewActive;

  return (
    <ClientShell currentRoute="/perfil">
      <div className="flex h-full overflow-hidden">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 overflow-y-auto p-6 xl:p-8">
          <header className="space-y-2">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
              Perfil
            </p>
            <h1 className="font-display text-3xl uppercase tracking-tight text-white">
              Olá, {profile?.username ?? "imortal"}
            </h1>
            <div className="brand-divider" />
          </header>

          <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)]/80 backdrop-blur-sm p-6 space-y-3">
            <Row label="Discord ID" value={profile?.discord_id ?? "—"} mono />
            <Row label="Email" value={profile?.email ?? "—"} />
            <Row
              label="Saldo de fichas"
              value={showAsAdmin ? "∞ admin" : `${fichaBalance}`}
              highlight
            />
            <Row label="MMR atual" value={profile?.mmr_atual?.toString() ?? "não informado"} />
            <Row label="Role preferida" value={profile?.role_preferida ?? "não informado"} />
            {showAsAdmin && (
              <Row label="Acesso" value="Administrador" highlight />
            )}
          </section>

          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-[var(--color-border)] px-4 py-2 font-sans text-xs uppercase tracking-widest text-white/60 hover:text-white transition"
            >
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </ClientShell>
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="font-sans text-xs uppercase tracking-widest text-white/50">
        {label}
      </span>
      <span
        className={[
          "text-white",
          mono ? "font-mono text-xs" : "font-sans text-sm",
          highlight ? "text-emerald-300" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
