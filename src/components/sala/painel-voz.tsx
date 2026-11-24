"use client";

// Painel de voz em todas as páginas do site enquanto a pessoa está numa sala (como no Discord): o nome
// da sala, quem está falando, mutar, parar a tela, sair e voltar para a sala. Fora da /sala fica no canto
// de baixo, em cima da party (escolha do PPA em 24/11/2026); na /sala, no pé da coluna de canais.

import { useTranslations } from "next-intl";
import { HeadphoneOff, Headphones, Loader2, LogOut, Mic, MicOff, MonitorOff, Volume2, X } from "lucide-react";
import { LiveDot, panel } from "@/components/v2";
import { Link, usePathname } from "@/i18n/navigation";
import { salaAtiva } from "@/lib/sala/cliente/sala-ativa";
import type { SessaoSala, SessaoSnapshot } from "@/lib/sala/cliente/sessao-sala";
import { useSalaAtiva } from "@/lib/sala/cliente/use-sala-ativa";
import { cn } from "@/lib/utils";
import { SAIDA_TEXTO } from "./textos";

// Em cima da party do mini perfil (que fica em left-4 bottom-4, com 68 px de altura), na mesma largura.
const CANTO = "left-4 bottom-[92px] w-[332px] flex-col gap-2 p-3 2xl:w-[352px]";

function Botao({ titulo, onClick, children, data }: { titulo: string; onClick: () => void; children: React.ReactNode; data: string }) {
  return (
    <button type="button" title={titulo} aria-label={titulo} onClick={onClick} {...{ [data]: "" }} className="rounded-sm p-1.5 text-text-muted hover:bg-bg-deep hover:text-text-display">
      {children}
    </button>
  );
}

function QuemFala({ snap }: { snap: SessaoSnapshot }) {
  const t = useTranslations("sala");
  const nomes = snap.falando.map((id) => snap.pessoas[id]?.nome ?? t("jogador")).slice(0, 2);
  const online = (snap.estado?.membros ?? []).filter((m) => m.online).length;
  return (
    <span className={cn("truncate text-xs", nomes.length ? "text-play-primary" : "text-text-muted")} data-painel-voz-falando={nomes.length}>
      {nomes.length ? t("painelFalando", { nomes: nomes.join(", ") }) : t("painelPessoas", { n: online })}
    </span>
  );
}

function Controles({ snap, sessao }: { snap: SessaoSnapshot; sessao: SessaoSala }) {
  const t = useTranslations("sala");
  const podeFalar = snap.vozNoAr || !!snap.estado?.eu?.podeFalar;
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {snap.audioBloqueado && (
        <Botao titulo={t("ativarSom")} onClick={() => sessao.liberarAudio()} data="data-painel-voz-ativar-som">
          <Volume2 className="size-4 text-gold" />
        </Botao>
      )}
      {podeFalar && (
        <Botao titulo={snap.mutado ? t("desmutar") : t("mutar")} onClick={() => sessao.alternarMudo()} data="data-painel-voz-mudo">
          {snap.mutado ? <MicOff className="size-4 text-error" /> : <Mic className="size-4" />}
        </Botao>
      )}
      <Botao titulo={snap.surdo ? t("religarSom") : t("ensurdecer")} onClick={() => sessao.alternarSurdo()} data="data-painel-voz-surdo">
        {snap.surdo ? <HeadphoneOff className="size-4 text-error" /> : <Headphones className="size-4" />}
      </Botao>
      {snap.compartilhando && (
        <Botao titulo={t("pararTela")} onClick={() => sessao.pararTela()} data="data-painel-voz-parar-tela">
          <MonitorOff className="size-4" />
        </Botao>
      )}
      <Botao titulo={t("sair")} onClick={() => sessao.sair()} data="data-painel-voz-sair">
        <LogOut className="size-4" />
      </Botao>
    </span>
  );
}

export function PainelVoz({ embutido = false }: { embutido?: boolean }) {
  const t = useTranslations("sala");
  const pathname = usePathname();
  const { ativa, snap } = useSalaAtiva();
  // Na /sala a coluna de canais mostra o painel no pé: o do canto some.
  if (!ativa || (!embutido && pathname.startsWith("/sala"))) return null;
  const rota = `/sala/${ativa.meta.roomId}`;
  const saiu = snap.fase === "saiu" || snap.fase === "erro";
  const titulo = (
    <Link href={rota} title={t("painelVoltar")} data-painel-voz-voltar="" className="min-w-0 truncate font-display text-sm font-semibold uppercase tracking-wide text-text-display hover:text-gold">
      {ativa.meta.titulo}
    </Link>
  );
  return (
    <aside
      aria-label={t("painelRotulo")}
      data-painel-voz={snap.fase}
      data-audio-bytes={snap.medidas.audioBytes}
      data-painel-voz-lugar={embutido ? "coluna" : "canto"}
      className={embutido ? "flex w-full flex-col gap-2 rounded-sm bg-bg-deep/60 p-3" : cn(panel("neutral"), "pointer-events-auto fixed z-[var(--z-overlay)] flex max-w-[calc(100vw-2rem)] shadow-lg shadow-black/60", CANTO)}
    >
      <span className="flex min-w-0 items-center gap-2">
        {snap.fase === "na_sala" ? <LiveDot /> : saiu ? null : <Loader2 className="size-3.5 shrink-0 animate-spin text-text-muted" aria-hidden="true" />}
        {titulo}
      </span>
      {snap.fase === "na_sala" ? (
        <span className="flex min-w-0 items-center justify-between gap-2">
          {snap.reconectando ? <span className="truncate text-xs text-gold">{t("reconectando")}</span> : <QuemFala snap={snap} />}
          <Controles snap={snap} sessao={ativa.sessao} />
        </span>
      ) : saiu ? (
        <span className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-xs text-text-muted" data-painel-voz-motivo={snap.motivo ?? ""}>{t(SAIDA_TEXTO[snap.motivo ?? ""] ?? "saidaErro")}</span>
          <Botao titulo={t("painelDispensar")} onClick={() => salaAtiva.dispensar()} data="data-painel-voz-dispensar">
            <X className="size-4" />
          </Botao>
        </span>
      ) : (
        <span className="truncate text-xs text-text-muted">{t("voltandoParaSala")}</span>
      )}
    </aside>
  );
}
