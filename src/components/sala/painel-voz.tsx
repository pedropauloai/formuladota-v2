"use client";

// Painel de voz em todas as páginas do site enquanto a pessoa está numa sala (como no Discord): o nome
// da sala, quem está nela (com o anel verde em quem fala), mutar, ensurdecer, as configurações de voz,
// parar a tela, sair e voltar para a sala. Fora da /sala fica no canto de baixo, em cima da party
// (escolha do PPA em 24/11/2026); na /sala, no pé da coluna de canais.

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { HeadphoneOff, Headphones, Loader2, LogOut, Mic, MicOff, MonitorOff, Settings, Volume2, X } from "lucide-react";
import { LiveDot, panel } from "@/components/v2";
import { Link, usePathname } from "@/i18n/navigation";
import { AVISO_MICROFONE, falhou } from "@/lib/sala/cliente/microfone";
import { salaAtiva } from "@/lib/sala/cliente/sala-ativa";
import type { SessaoSala, SessaoSnapshot } from "@/lib/sala/cliente/sessao-sala";
import { medidorVoz } from "@/lib/sala/cliente/medidor-voz";
import { useSeguirMovido } from "@/lib/sala/cliente/seguir-movido";
import { useSalaAtiva } from "@/lib/sala/cliente/use-sala-ativa";
import { cn } from "@/lib/utils";
import { anelFala } from "./anel-fala";
import { ConfigVoz } from "./config-voz";
import { FotoNaSala } from "./identidade";
import { SAIDA_TEXTO } from "./textos";

// Rostos que cabem numa linha do painel; o resto vira "+N".
const MAX_ROSTOS = 8;

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

/** Quem está na sala agora, na ordem da sala (sem pular de lugar), com o anel em quem fala. */
function Presentes({ snap }: { snap: SessaoSnapshot }) {
  const t = useTranslations("sala");
  const online = (snap.estado?.membros ?? []).filter((m) => m.online);
  if (!online.length) return null;
  const resto = online.length - MAX_ROSTOS;
  return (
    <ul className="flex min-w-0 items-center gap-2.5 px-1 py-1" data-painel-voz-presentes={online.length}>
      {online.slice(0, MAX_ROSTOS).map((m) => {
        const nome = snap.pessoas[m.userId]?.nome ?? t("jogador");
        const falando = snap.falando.includes(m.userId) && !m.mutado;
        return (
          <li key={m.userId} data-painel-voz-rosto={m.userId} data-sala-falando={falando ? "sim" : "nao"}>
            <FotoNaSala userId={m.userId} nome={nome} avatarUrl={snap.pessoas[m.userId]?.avatarUrl} tamanho="xs" className={anelFala(falando)} />
          </li>
        );
      })}
      {resto > 0 && <li className="text-xs text-text-muted">+{resto}</li>}
    </ul>
  );
}

function Controles({ snap, sessao, onConfig }: { snap: SessaoSnapshot; sessao: SessaoSala; onConfig: () => void }) {
  const t = useTranslations("sala");
  const podeFalar = snap.vozNoAr || !!snap.estado?.eu?.podeFalar;
  // O microfone que não abriu fica dourado, com o motivo no título; o clique tenta de novo.
  const semSinal = !snap.vozNoAr && falhou(snap.microfone);
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {snap.audioBloqueado && (
        <Botao titulo={t("ativarSom")} onClick={() => sessao.liberarAudio()} data="data-painel-voz-ativar-som">
          <Volume2 className="size-4 text-gold" />
        </Botao>
      )}
      {podeFalar && (
        <Botao titulo={semSinal ? t(AVISO_MICROFONE[snap.microfone] ?? "microfoneSemSinal") : snap.mutado ? t("desmutar") : t("mutar")} onClick={() => sessao.alternarMudo()} data="data-painel-voz-mudo">
          {semSinal ? <MicOff className="size-4 text-gold" /> : snap.mutado ? <MicOff className="size-4 text-error" /> : <Mic className="size-4" />}
        </Botao>
      )}
      <Botao titulo={snap.surdo ? t("religarSom") : t("ensurdecer")} onClick={() => sessao.alternarSurdo()} data="data-painel-voz-surdo">
        {snap.surdo ? <HeadphoneOff className="size-4 text-error" /> : <Headphones className="size-4" />}
      </Botao>
      <Botao titulo={t("configVozTitulo")} onClick={onConfig} data="data-painel-voz-config">
        <Settings className="size-4" />
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
  useSeguirMovido(ativa, snap);
  // O que processa a voz no ar (rnnoise, porta ou cru), para as provas conferirem o filtro.
  const filtro = useSyncExternalStore(medidorVoz.subscribe, medidorVoz.estado, () => null);
  const [config, setConfig] = useState(false);
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
      data-sala-filtro={filtro ?? ""}
      data-audio-bytes={snap.medidas.audioBytes}
      data-painel-voz-lugar={embutido ? "coluna" : "canto"}
      className={embutido ? "flex w-full flex-col gap-2 rounded-sm bg-bg-deep/60 p-3" : cn(panel("neutral"), "pointer-events-auto fixed z-[var(--z-overlay)] flex max-w-[calc(100vw-2rem)] shadow-lg shadow-black/60", CANTO)}
    >
      <span className="flex min-w-0 items-center gap-2">
        {snap.fase === "na_sala" ? <LiveDot /> : saiu ? null : <Loader2 className="size-3.5 shrink-0 animate-spin text-text-muted" aria-hidden="true" />}
        {titulo}
      </span>
      {snap.fase === "na_sala" ? (
        <>
          <Presentes snap={snap} />
          <span className="flex min-w-0 items-center justify-between gap-2">
            {snap.reconectando ? <span className="truncate text-xs text-gold">{t("reconectando")}</span> : <QuemFala snap={snap} />}
            <Controles snap={snap} sessao={ativa.sessao} onConfig={() => setConfig(true)} />
          </span>
        </>
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
      <ConfigVoz aberto={config} onClose={() => setConfig(false)} />
    </aside>
  );
}
