// Página só de membros vista por visitante: em vez de voltar mudo para a home, explica e oferece o
// login com o Discord, que traz de volta para a mesma página. O OAuth só começa no clique (o gate
// do middleware não dispara login sozinho: isso já quebrou o PKCE do login de verdade).

import { getTranslations } from "next-intl/server";
import { LogIn, UserRound } from "lucide-react";
import { ClientShell } from "@/components/client-shell/shell";
import { signInWithDiscordReturning } from "@/app/login/actions";

export async function MemberOnly({ next, currentRoute }: { next: string; currentRoute: string }) {
  const t = await getTranslations("memberOnly");
  return (
    <ClientShell currentRoute={currentRoute}>
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <UserRound className="mb-4 size-10 text-brand-primary" aria-hidden="true" />
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-text-display">{t("profileTitle")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-body">{t("profileText")}</p>
        <form action={signInWithDiscordReturning} className="mt-6">
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md border-2 border-play-primary bg-play-primary px-6 py-3 font-display text-base font-bold uppercase tracking-[0.2em] text-bg-deep transition-all hover:brightness-110"
          >
            <LogIn size={18} aria-hidden="true" />
            {t("enter")}
          </button>
        </form>
      </div>
    </ClientShell>
  );
}
