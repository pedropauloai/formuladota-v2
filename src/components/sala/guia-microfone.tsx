"use client";

// Guias do microfone (R22), no modelo do Google Meet. Com o aviso do navegador aberto, a página escurece
// (sem prender clique) e uma seta empurra na direção do aviso. Com o site bloqueado, a barra de endereço
// desenhada com o ícone que abre as permissões em cada navegador e o controle do microfone. Com o sistema
// barrando, o caminho do Windows ou do macOS e o atalho que abre a tela certa. O navegador vem de navegador.ts.

import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { ArrowUp, ArrowUpLeft, ChevronDown, ChevronRight, Lock, Mic, MicOff, RotateCw, SlidersHorizontal, X } from "lucide-react";
import { plate } from "@/components/v2";
import { esteNavegador, iconeDoSite, ondeAvisa, type IconeDoSite, type Navegador } from "@/lib/sala/cliente/navegador";
import { cn } from "@/lib/utils";

const NOME: Record<Navegador, string> = {
  chrome: "Google Chrome", edge: "Microsoft Edge", opera: "Opera", brave: "Brave Browser", firefox: "Firefox", safari: "Safari", outro: "",
};

/** Com o aviso de permissão do navegador aberto: a página escurece e a seta aponta para ele. À esquerda, a seta
 *  fica à direita dos 450 px que o aviso do Chrome, do Edge e do Firefox ocupa, para não ficar embaixo dele. */
export function AvisoDoNavegador() {
  const t = useTranslations("sala");
  const [{ navegador }] = useState(esteNavegador);
  const lado = ondeAvisa(navegador);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      role="status"
      aria-live="assertive"
      aria-label={t("microfonePedindo")}
      data-sala-microfone="pedindo"
      data-sala-guia-aviso={lado}
      data-sala-navegador={navegador}
      className="fd-guia-escurece pointer-events-none fixed inset-0 z-[var(--z-takeover)] bg-black/75"
    >
      {lado === "centro" ? (
        <div className="absolute left-1/2 top-40 flex -translate-x-1/2 flex-col items-center gap-3">
          <ArrowUp className="fd-guia-seta-cima size-24 text-play-primary" strokeWidth={3} aria-hidden="true" />
          <p className="font-display text-5xl font-semibold uppercase tracking-wide text-text-display">{t("microfonePermitir")}</p>
        </div>
      ) : (
        <div className="absolute left-[30rem] top-8 flex items-start gap-3">
          <ArrowUpLeft className="fd-guia-seta size-24 shrink-0 text-play-primary" strokeWidth={3} aria-hidden="true" />
          <p className="mt-20 font-display text-5xl font-semibold uppercase tracking-wide text-text-display">{t("microfonePermitir")}</p>
        </div>
      )}
    </div>,
    document.body
  );
}

/** Um passo numerado do guia: a ordem dos cliques importa. */
function Passo({ n, className }: { n: number; className?: string }) {
  return <span className={cn("grid size-6 place-items-center rounded-full bg-play-primary font-display text-base font-bold text-bg-deep", className)}>{n}</span>;
}

/** O controle do microfone na janelinha de permissões de cada navegador. */
function ControleDoNavegador({ icone }: { icone: Exclude<IconeDoSite, "safari"> }) {
  const t = useTranslations("sala");
  if (icone === "ajustes") {
    return (
      <span className="relative h-5 w-9 shrink-0 rounded-full bg-play-primary">
        <span className="absolute right-0.5 top-0.5 size-4 rounded-full bg-white" />
      </span>
    );
  }
  if (icone === "cadeado") {
    return (
      <span className="flex items-center gap-1 rounded-sm border border-play-primary px-2 py-0.5 text-play-primary">
        {t("microfonePermitirRotulo")}
        <ChevronDown className="size-3.5" />
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-text-muted">
      {t("microfoneBloqueadoRotulo")}
      <span className="grid size-6 place-items-center rounded-sm text-text-display ring-2 ring-play-primary">
        <X className="size-3.5" />
      </span>
    </span>
  );
}

/** A barra de endereço desenhada: o ícone ao lado do endereço (1) e o microfone na janelinha que ele abre (2).
 *  Deitada (dentro da sala, abaixo dos controles), os dois passos ficam numa linha só. */
function BarraDesenhada({ icone, deitada }: { icone: Exclude<IconeDoSite, "safari">; deitada: boolean }) {
  const t = useTranslations("sala");
  const Icone = icone === "cadeado" ? Lock : icone === "microfone" ? MicOff : SlidersHorizontal;
  const colunas = deitada ? "grid-cols-[1.5rem_auto_1.5rem_auto]" : "grid-cols-[1.5rem_minmax(0,1fr)]";
  return (
    <figure className={cn("grid select-none items-center gap-x-3 gap-y-2", colunas)} aria-label={t("microfoneNegadoPassos")}>
      <Passo n={1} />
      <div className="flex min-w-0 items-center gap-2.5 rounded-full border border-border-subtle bg-bg-base py-1.5 pl-1.5 pr-4" aria-hidden="true">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bg-elevated text-text-display ring-2 ring-play-primary">
          <Icone className="size-4" />
        </span>
        <span className="truncate text-sm text-text-muted">www.formuladota.com.br/sala</span>
      </div>
      <Passo n={2} className={cn(deitada && "ml-3")} />
      <div className="w-fit min-w-64 rounded-md border border-border-subtle bg-bg-elevated px-3 py-2.5 shadow-lg shadow-black/50" aria-hidden="true">
        <div className="flex items-center justify-between gap-6 text-sm text-text-display">
          <span className="flex items-center gap-2">
            <Mic className="size-4" />
            {t("microfoneRotulo")}
          </span>
          <ControleDoNavegador icone={icone} />
        </div>
      </div>
    </figure>
  );
}

/** Um caminho de telas, uma depois da outra (Windows, macOS, Safari). */
function Caminho({ texto, data }: { texto: string; data: string }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-sm" data-sala-caminho={data}>
      {texto.split(" › ").map((parte, i) => (
        <li key={parte} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3.5 text-text-muted" aria-hidden="true" />}
          <span className="rounded-sm border border-border-subtle bg-bg-deep px-2 py-1 text-text-display">{parte}</span>
        </li>
      ))}
    </ol>
  );
}

function TentarDeNovo({ onTentar, className }: { onTentar: () => void; className?: string }) {
  const t = useTranslations("sala");
  return (
    <button type="button" onClick={onTentar} data-sala-microfone-tentar="" className={cn(plate({ kind: "ghost", small: true }), "inline-flex items-center gap-1.5", className)}>
      <RotateCw className="size-3.5" aria-hidden="true" />
      {t("tentarDeNovo")}
    </button>
  );
}

function Titulo({ texto }: { texto: string }) {
  return (
    <p className="flex items-center gap-2 text-sm font-semibold text-text-display">
      <MicOff className="size-4 shrink-0 text-error" aria-hidden="true" />
      {texto}
    </p>
  );
}

interface GuiaProps {
  onTentar: () => void;
  /** Dentro da sala, abaixo dos controles: numa linha (ou duas), para caber sem rolar a página. */
  deitado?: boolean;
}

/** O site está bloqueado no navegador: onde clicar para permitir. A sala volta sozinha quando a permissão muda. */
export function GuiaBloqueado({ onTentar, deitado = false }: GuiaProps) {
  const t = useTranslations("sala");
  const [{ navegador }] = useState(esteNavegador);
  const icone = iconeDoSite(navegador);
  return (
    <div
      className={deitado ? "flex flex-wrap items-center gap-x-6 gap-y-2" : "space-y-3"}
      data-sala-microfone="negado"
      data-sala-guia-bloqueado={icone}
      data-sala-navegador={navegador}
    >
      <Titulo texto={t("microfoneNegado")} />
      {icone === "safari" ? <Caminho texto={t("microfoneCaminhoSafari")} data="safari" /> : <BarraDesenhada icone={icone} deitada={deitado} />}
      <TentarDeNovo onTentar={onTentar} className={cn(deitado && "ml-auto")} />
    </div>
  );
}

const ATALHO = {
  windows: "ms-settings:privacy-microphone",
  mac: "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
} as const;

/** O navegador liberou, mas o Windows ou o macOS barram: o caminho e o atalho que abre a tela certa. Deitado,
 *  o título e os botões numa linha e o caminho embaixo. */
export function GuiaSistema({ onTentar, deitado = false }: GuiaProps) {
  const t = useTranslations("sala");
  const [{ navegador, sistema }] = useState(esteNavegador);
  const caminho = cn(deitado && "order-last basis-full");
  return (
    <div className={deitado ? "flex flex-wrap items-center gap-x-6 gap-y-2" : "space-y-3"} data-sala-microfone="sistema" data-sala-guia-sistema={sistema}>
      <Titulo texto={t(sistema === "windows" ? "microfoneSistemaWindows" : sistema === "mac" ? "microfoneSistemaMac" : "microfoneSistema")} />
      {sistema === "windows" && (
        <div className={caminho}>
          <Caminho texto={t("microfoneCaminhoWindows")} data="windows" />
        </div>
      )}
      {sistema === "mac" && (
        <div className={caminho}>
          <Caminho texto={t("microfoneCaminhoMac", { navegador: NOME[navegador] || t("microfoneNavegador") })} data="mac" />
        </div>
      )}
      <div className={cn("flex flex-wrap items-center gap-2", deitado && "ml-auto")}>
        {sistema !== "outro" && (
          <a href={ATALHO[sistema]} data-sala-sistema-abrir="" className={plate({ kind: "cta", small: true })}>
            {t(sistema === "windows" ? "microfoneAbrirWindows" : "microfoneAbrirMac")}
          </a>
        )}
        <TentarDeNovo onTentar={onTentar} />
      </div>
    </div>
  );
}
