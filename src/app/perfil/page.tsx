import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

// Placeholder Phase 1 — confirma login funcional.
// Phase 3 vai expandir com edição de steam_id, role_preferida, histórico.
export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, discord_id, username, avatar_url, email, is_admin, mmr_atual, role_preferida")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-cyan)]">
            perfil
          </p>
          <h1 className="text-4xl font-bold">
            Olá, {profile?.username ?? "imortal"}
          </h1>
        </header>

        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6 space-y-3">
          <Row label="Discord ID" value={profile?.discord_id ?? "—"} mono />
          <Row label="Email" value={profile?.email ?? "—"} />
          <Row label="MMR atual" value={profile?.mmr_atual?.toString() ?? "não informado"} />
          <Row label="Role preferida" value={profile?.role_preferida ?? "não informado"} />
          {profile?.is_admin && (
            <Row label="Acesso" value="Administrador" highlight />
          )}
        </section>

        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
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
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <span
        className={[
          mono ? "font-mono text-xs" : "",
          highlight ? "text-[var(--color-cyan)]" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
