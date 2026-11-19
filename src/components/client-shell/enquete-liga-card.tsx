"use client";

// Enquete da Liga do FORMULADOTA na coluna direita, no lugar do Top do ranking (flag enquete_liga).
// Um clique vota e dá para trocar. O resultado só aparece depois do voto, para não puxar a resposta.

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { panel, plate } from "@/components/v2";
import { votarNaEnqueteLiga, type ErroDoVoto } from "@/actions/enquete";
import {
  META_LIGA,
  RESPOSTAS,
  aplicarVoto,
  progressoDaMeta,
  type EnqueteEstado,
  type Resposta,
} from "@/lib/enquete/liga";
import { CardHeader } from "./sidebar-card-header";

// Resposta escolhida acesa como a aba de filtro do kit: texto claro e a linha vermelha por baixo.
const ESCOLHIDA =
  "aria-pressed:border-brand-primary/70 aria-pressed:text-text-display aria-pressed:shadow-[inset_0_-2px_0_var(--color-brand-primary)]";

export function EnqueteLigaCard({ initial }: { initial: EnqueteEstado }) {
  const t = useTranslations("shell.enqueteLiga");
  const [estado, setEstado] = useState(initial);
  const [erro, setErro] = useState<ErroDoVoto | null>(null);
  const [pending, startTransition] = useTransition();

  const votar = (resposta: Resposta) => {
    if (pending || estado.minha === resposta) return;
    const anterior = estado;
    setErro(null);
    setEstado(aplicarVoto(anterior, resposta));
    startTransition(async () => {
      const resultado = await votarNaEnqueteLiga({ resposta });
      if (!resultado.ok) {
        setEstado(anterior);
        setErro(resultado.erro);
        return;
      }
      if (resultado.estado) setEstado(resultado.estado);
    });
  };

  return (
    <article data-enquete="liga" className={cn(panel("neutral"), "overflow-hidden")}>
      <CardHeader icon={Swords} title={t("question")} />
      <div className="space-y-3 p-3" aria-busy={pending}>
        <div role="group" aria-label={t("question")} className="grid grid-cols-3 gap-2">
          {RESPOSTAS.map((r) => (
            <button
              key={r}
              type="button"
              data-resposta={r}
              aria-pressed={estado.minha === r}
              onClick={() => votar(r)}
              className={cn(plate({ kind: "ghost", small: true }), "w-full px-2", ESCOLHIDA)}
            >
              {t(`answers.${r}`)}
            </button>
          ))}
        </div>
        {estado.minha && <Resultado estado={estado} />}
        {erro && (
          <p role="alert" className="font-body text-xs text-error">
            {t(`errors.${erro}`)}
          </p>
        )}
      </div>
    </article>
  );
}

function Resultado({ estado }: { estado: EnqueteEstado }) {
  const t = useTranslations("shell.enqueteLiga");
  return (
    <div data-enquete-sim={estado.sim} className="space-y-1.5">
      <p className="font-body text-sm text-text-body">
        <span className="font-display font-bold tabular-nums text-gold">{estado.sim}</span>{" "}
        {t("simCount", { count: estado.sim })}
      </p>
      <div
        role="progressbar"
        aria-label={t("goal", { meta: META_LIGA })}
        aria-valuemin={0}
        aria-valuemax={META_LIGA}
        aria-valuenow={Math.min(estado.sim, META_LIGA)}
        aria-valuetext={t("progress", { sim: estado.sim, meta: META_LIGA })}
        className="h-1.5 overflow-hidden rounded-sm bg-bg-deep ring-1 ring-inset ring-border-subtle"
      >
        <div
          className="h-full bg-gold transition-[width] [transition-duration:var(--motion-duration-standard)] [transition-timing-function:var(--motion-ease-soft-landing)] motion-reduce:transition-none"
          style={{ width: `${progressoDaMeta(estado.sim)}%` }}
        />
      </div>
      <p className="font-body text-xs text-text-muted">{t("goal", { meta: META_LIGA })}</p>
      {estado.talvez !== null && estado.nao !== null && (
        <p data-enquete-admin className="font-body text-xs text-text-faded">
          {t("adminTotals", { talvez: estado.talvez, nao: estado.nao })}
        </p>
      )}
    </div>
  );
}
