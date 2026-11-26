"use client";

// O microfone na entrada da sala (R22), no modelo do Google Meet. Sem resposta no navegador, o botão
// "Ativar microfone": o clique é que abre o aviso dele. Com o aviso aberto, o guia que aponta para ele.
// Liberado, o microfone em uso (dá para trocar ali), a barra ao vivo e o sinal de funcionando quando a voz
// passa da porta por 300 ms. Bloqueado no navegador ou no sistema, o guia de cada um. Liberado depois pelo
// ícone do endereço, abre sozinho.

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Mic, RotateCw } from "lucide-react";
import { plate } from "@/components/v2";
import { aparelhoOuPadrao, CONFIG_PADRAO, configVoz } from "@/lib/sala/cliente/config-voz";
import { AVISO_MICROFONE, passoDaEntrada, permissaoDoMicrofone, vigiarPermissao, type PassoDaEntrada, type Permissao } from "@/lib/sala/cliente/microfone";
import { cn } from "@/lib/utils";
import { BarraDeNivel } from "./barra-nivel";
import { useAparelhos } from "./config-voz";
import { AvisoDoNavegador, GuiaBloqueado, GuiaSistema } from "./guia-microfone";
import { useMicrofoneDeTeste, type TesteDoMicrofone } from "./use-microfone-de-teste";

export interface Checagem {
  passo: PassoDaEntrada;
  teste: TesteDoMicrofone;
  /** "Ativar microfone" e "Tentar de novo": abre (de novo) o microfone de teste. */
  ativar: () => void;
}

/** O estado do microfone na entrada; desligado (sala em que a pessoa entra para ouvir), não consulta nem abre nada. */
export function useChecagemDoMicrofone(ativo: boolean): Checagem {
  const cfg = useSyncExternalStore(configVoz.subscribe, configVoz.get, () => CONFIG_PADRAO);
  const [permissao, setPermissao] = useState<Permissao | null | "carregando">("carregando");
  const [ligado, setLigado] = useState(false);
  const [vez, setVez] = useState(0);
  const teste = useMicrofoneDeTeste(ativo && ligado, cfg.microfone, vez);
  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    void (async () => {
      const agora = await permissaoDoMicrofone();
      if (!vivo) return;
      setPermissao(agora);
      // Já liberado antes: a checagem abre sozinha.
      if (agora === "granted") setLigado(true);
    })();
    // Liberado pelo ícone do endereço (ou no aviso): abre de novo, sem clique.
    const soltar = vigiarPermissao((p) => {
      setPermissao(p);
      if (p !== "granted") return;
      setLigado(true);
      setVez((v) => v + 1);
    });
    return () => {
      vivo = false;
      soltar();
    };
  }, [ativo]);
  const passo = passoDaEntrada({ permissao, ligado, aberto: teste.aberto, falha: teste.falha });
  const ativar = () => {
    setLigado(true);
    setVez((v) => v + 1);
  };
  return { passo, teste, ativar };
}

function MicrofoneEmUso({ teste }: { teste: TesteDoMicrofone }) {
  const t = useTranslations("sala");
  const cfg = useSyncExternalStore(configVoz.subscribe, configVoz.get, () => CONFIG_PADRAO);
  const { entradas } = useAparelhos(true);
  const microfone = aparelhoOuPadrao(entradas.map((d) => d.deviceId), cfg.microfone);
  return (
    <div className="space-y-1.5" data-sala-checagem-microfone={teste.nome ?? ""}>
      <div className="flex items-center gap-3">
        <Mic className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
        <select
          value={microfone ?? ""}
          onChange={(e) => configVoz.set({ microfone: e.target.value || null })}
          aria-label={t("microfone")}
          className="h-9 min-w-0 flex-1 truncate rounded-sm border border-border-subtle bg-bg-deep px-2 text-sm text-text-display"
          data-sala-checagem-trocar=""
        >
          <option value="">{teste.nome ?? t("padraoDoSistema")}</option>
          {entradas.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || t("aparelhoSemNome", { n: i + 1 })}</option>)}
        </select>
        <span
          className={cn("flex shrink-0 items-center gap-1.5 text-sm font-semibold text-play-primary transition-opacity duration-200", teste.funcionando.ok ? "opacity-100" : "opacity-0")}
          data-sala-microfone-funcionando={teste.funcionando.ok ? "sim" : "nao"}
          aria-live="polite"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {teste.funcionando.ok && t("microfoneFuncionando")}
        </span>
      </div>
      <BarraDeNivel medida={teste.medida} />
    </div>
  );
}

/** O cartão do microfone na entrada, para cada passo. */
export function ChecagemDoMicrofone({ checagem }: { checagem: Checagem }) {
  const t = useTranslations("sala");
  const { passo, teste, ativar } = checagem;
  return (
    <section className="text-left" data-sala-checagem={passo}>
      {passo === "pergunta" && (
        <button type="button" onClick={ativar} data-sala-microfone-ativar="" className={cn(plate({ kind: "cta", block: true, large: true }), "inline-flex items-center justify-center gap-2")}>
          <Mic className="size-5" aria-hidden="true" />
          {t("microfoneAtivar")}
        </button>
      )}
      {(passo === "carregando" || passo === "abrindo" || passo === "pedindo") && (
        <p className="flex h-12 items-center justify-center text-text-muted">
          <Loader2 className="size-5 animate-spin" aria-label={t("microfone")} />
        </p>
      )}
      {passo === "pedindo" && <AvisoDoNavegador />}
      {passo === "ok" && <MicrofoneEmUso teste={teste} />}
      {passo === "negado" && <GuiaBloqueado onTentar={ativar} />}
      {passo === "sistema" && <GuiaSistema onTentar={ativar} />}
      {(passo === "sem_aparelho" || passo === "falhou") && (
        <div className="flex flex-wrap items-center gap-3" data-sala-microfone={passo}>
          <p className="min-w-0 flex-1 text-sm text-gold">{t(AVISO_MICROFONE[passo] ?? "microfoneFalhou")}</p>
          <button type="button" onClick={ativar} data-sala-microfone-tentar="" className={cn(plate({ kind: "ghost", small: true }), "inline-flex items-center gap-1.5")}>
            <RotateCw className="size-3.5" aria-hidden="true" />
            {t("tentarDeNovo")}
          </button>
        </div>
      )}
    </section>
  );
}
