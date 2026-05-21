// Faixa fina no topo da landing — mostra PROs online em tempo real.
// Server Component. Atualiza via revalidate da page parent.
//
// Estados:
//   - 0 PROs com fila aberta: estado vazio + CTA Discord
//   - 1+ PROs com fila aberta: status + vagas + CTA pra logar/jogar

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getProsLiveStatus } from "@/lib/queries/pros";

export async function LivePROStrip() {
  const pros = await getProsLiveStatus();
  const online = pros.filter((p) => p.filaAberta);

  if (online.length === 0) {
    return (
      <div className="border-b border-[var(--color-border)] bg-[var(--color-card)]/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <span className="flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">
            <span
              className="size-2 rounded-full bg-[var(--color-muted-foreground)]/60"
              aria-hidden="true"
            />
            Nenhum PRO online no momento
          </span>
          <a
            href="https://discord.com/invite/v3pSuZhjBE"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-brand-red)] transition-colors hover:text-white"
          >
            Receba aviso no Discord quando abrir
            <ArrowRight size={12} />
          </a>
        </div>
      </div>
    );
  }

  // PRO em destaque = primeiro com fila aberta (guard pra TS)
  const top = online[0];
  if (!top) return null;

  return (
    <div className="border-b border-[var(--color-brand-red)]/30 bg-[var(--color-brand-red)]/10 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Bolinha verde pulsante */}
          <span className="relative flex size-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-sans text-xs font-semibold uppercase tracking-widest text-white">
            {online.length} {online.length === 1 ? "PRO online" : "PROs online"}
            {" · "}
            {top.vagasRestantes} {top.vagasRestantes === 1 ? "vaga" : "vagas"}
          </span>
          <span className="hidden font-sans text-xs text-white/70 sm:inline">
            · {top.username ?? top.slug}
            {top.mmrAtual ? ` · ${top.mmrAtual.toLocaleString("pt-BR")} MMR` : ""}
          </span>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-brand-red)] px-4 py-1.5 font-sans text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-[var(--color-brand-red)]/80"
        >
          Entrar pra jogar agora
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
