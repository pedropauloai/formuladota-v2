import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DotaBackdrop } from "@/components/dota/dota-backdrop";

// Tela final pra usuários banidos.
// Sem retorno automático — só revisão manual de admin pode reverter.
export const metadata = { title: "Conta encerrada — FORMULADOTA" };

export default async function BannedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("behavior_status, banned_at, banned_reason, username")
    .eq("id", user.id)
    .single();

  if (profile?.behavior_status !== "banned") {
    redirect("/perfil");
  }

  const formattedBannedAt = profile.banned_at
    ? new Date(profile.banned_at).toLocaleString("pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : null;

  return (
    <main className="relative min-h-screen flex items-center justify-center px-6">
      <DotaBackdrop />
      <div className="relative z-10 w-full max-w-xl space-y-8 rounded-lg border-2 border-[var(--color-danger)] bg-[var(--color-card)]/90 backdrop-blur-sm p-8">
        <header className="space-y-3 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-danger)]">
            conta encerrada
          </p>
          <h1 className="text-3xl font-bold">
            Sua conta foi banida da FORMULADOTA.
          </h1>
        </header>

        {formattedBannedAt && (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">
              banido em
            </p>
            <p className="mt-1 text-base font-medium">{formattedBannedAt}</p>
          </div>
        )}

        {profile.banned_reason && (
          <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">
              motivo
            </p>
            <p className="text-sm">{profile.banned_reason}</p>
          </div>
        )}

        <div className="space-y-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          <p>
            Banimento é a etapa final do sistema progressivo de moderação. Sua
            conta está congelada — você não pode comprar, jogar ou agendar
            sessões.
          </p>
          <p>
            Saldo restante (se houver) será refundado caso a caso, exceto em
            situações de fraude ou preconceito. Vamos entrar em contato para
            tratar isso individualmente.
          </p>
          <p>
            Para contestar este banimento, escreva via{" "}
            <a
              href="https://discord.com/invite/v3pSuZhjBE"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-brand-red)] underline hover:text-white transition"
            >
              Discord oficial
            </a>
            .
          </p>
        </div>

        <div className="border-t border-[var(--color-border)] pt-4 text-center">
          <Link
            href="/codigo-de-conduta"
            className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition"
          >
            código de conduta · referência
          </Link>
        </div>
      </div>
    </main>
  );
}
