import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DotaBackdrop } from "@/components/dota/dota-backdrop";
import { Card, CardContent } from "@/components/ui/card";

// Tela final pra usuários banidos.
// Sem retorno automático — só revisão manual de admin pode reverter.
// Refatorado V2.5 (DF8.4 cleanup — 2026-05-24):
//   - <Card variant="elevated"> + tokens V2.5 (text-error, text-text-*, border-border-*)
//   - Fluxo de gate intacto (redirect /perfil se não-banido)
export const metadata = { title: "Conta encerrada — FORMULADOTA" };

export default async function BannedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/"); // sem auth, manda pro HUB visitor (login via header)
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
      <Card
        variant="elevated"
        className="relative z-10 w-full max-w-xl space-y-8 border-2 border-error backdrop-blur-sm"
      >
        <CardContent className="space-y-8">
          <header className="space-y-3 text-center">
            <p className="font-display text-sm uppercase tracking-[0.4em] text-error">
              conta encerrada
            </p>
            <h1 className="font-display text-3xl uppercase tracking-tight text-text-display">
              Sua conta foi banida da FORMULADOTA.
            </h1>
          </header>

          {formattedBannedAt && (
            <div className="rounded-md border border-border-subtle bg-bg-deep p-4 text-center">
              <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-muted">
                banido em
              </p>
              <p className="mt-1 text-base font-medium text-text-display">
                {formattedBannedAt}
              </p>
            </div>
          )}

          {profile.banned_reason && (
            <div className="space-y-2 rounded-md border border-border-subtle bg-bg-base p-4">
              <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-muted">
                motivo
              </p>
              <p className="text-sm text-text-body">{profile.banned_reason}</p>
            </div>
          )}

          <div className="space-y-3 text-sm leading-relaxed text-text-muted">
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
                className="text-brand-primary underline hover:text-text-display transition-colors"
              >
                Discord oficial
              </a>
              .
            </p>
          </div>

          <div className="border-t border-border-subtle pt-4 text-center">
            <Link
              href="/codigo-de-conduta"
              className="font-display font-semibold text-sm uppercase tracking-wide text-text-muted hover:text-text-display transition-colors"
            >
              código de conduta · referência
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
