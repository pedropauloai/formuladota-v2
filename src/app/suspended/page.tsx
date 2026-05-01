import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Tela mostrada para usuários com behavior_status='suspended'.
// Usuário não consegue acessar partidas/sessões/compras até suspended_until passar.
export const metadata = { title: "Conta suspensa — Fórmula Dota" };

export default async function SuspendedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("behavior_status, suspended_until, username")
    .eq("id", user.id)
    .single();

  // Se não está suspenso ou já passou o prazo, não fica preso aqui.
  if (
    profile?.behavior_status !== "suspended" ||
    (profile.suspended_until && new Date(profile.suspended_until) < new Date())
  ) {
    redirect("/perfil");
  }

  const { data: lastWarning } = await supabase
    .from("user_warnings")
    .select("severity, principle_violated, antipattern_violated, notes, issued_at, suspension_days")
    .eq("user_id", user.id)
    .eq("severity", "suspensao")
    .order("issued_at", { ascending: false })
    .limit(1)
    .single();

  const formattedUntil = profile.suspended_until
    ? new Date(profile.suspended_until).toLocaleString("pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : null;

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-xl space-y-8 rounded-lg border-2 border-[var(--color-warning)] bg-[var(--color-card)] p-8">
        <header className="space-y-3 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-warning)]">
            conta suspensa
          </p>
          <h1 className="text-3xl font-bold">
            {profile.username ?? "Imortal"}, sua conta está temporariamente suspensa.
          </h1>
        </header>

        {formattedUntil && (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] p-4 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">
              suspensão até
            </p>
            <p className="mt-1 text-xl font-bold text-[var(--color-warning)]">
              {formattedUntil}
            </p>
          </div>
        )}

        {lastWarning && (
          <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">
              motivo registrado
            </p>
            <p className="text-sm">
              {lastWarning.antipattern_violated
                ? `Anti-padrão #${lastWarning.antipattern_violated}`
                : `Violação do princípio #${lastWarning.principle_violated}`}
            </p>
            {lastWarning.notes && (
              <p className="text-sm italic text-[var(--color-muted-foreground)]">
                “{lastWarning.notes}”
              </p>
            )}
          </div>
        )}

        <div className="space-y-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          <p>
            Durante a suspensão, você não pode comprar pacotes, agendar
            partidas ou abrir sessões. Após o prazo, sua conta volta automaticamente
            ao status normal.
          </p>
          <p>
            Se você acredita que houve erro,{" "}
            <a
              href="https://discord.com/invite/v3pSuZhjBE"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-cyan)] underline hover:text-glow-cyan transition"
            >
              entre em contato via Discord oficial
            </a>{" "}
            — Pedro revisa cada caso pessoalmente.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <Link
            href="/codigo-de-conduta"
            className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition"
          >
            código de conduta
          </Link>
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-widest text-[var(--color-cyan)] hover:text-glow-cyan transition"
          >
            ← home
          </Link>
        </div>
      </div>
    </main>
  );
}
