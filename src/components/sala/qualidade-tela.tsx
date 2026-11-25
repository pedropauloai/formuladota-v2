"use client";

// Escolha da qualidade da tela na hora de compartilhar (decisão do PPA de 23/11/2026), com o consumo
// estimado por hora de cada opção para quem assiste agora (todos recebem a qualidade de quem transmite).

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { plate } from "@/components/v2";
import { gbPerHourPerViewer } from "@/lib/sala/custo";
import { QUALIDADES, QUALITY_IDS } from "@/lib/sala/qualidade";
import type { Quality } from "@/lib/sala/tipos";
import { cn } from "@/lib/utils";

interface Props {
  aberto: boolean;
  espectadores: number;
  onEscolher: (q: Quality) => void;
  onClose: () => void;
}

const NOME: Record<Quality, string> = { leve: "qualidadeLeve", padrao: "qualidadePadrao", alta: "qualidadeAlta", fluida: "qualidadeFluida" };

export function QualidadeTela({ aberto, espectadores, onEscolher, onClose }: Props) {
  const t = useTranslations("sala");
  const format = useFormatter();
  const [escolha, setEscolha] = useState<Quality>("padrao");
  const pessoas = Math.max(1, espectadores);
  const gb = (v: number) => format.number(v, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  return (
    <Dialog.Root open={aberto} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content playSoundOnOpen={false} className="max-w-lg space-y-4" data-sala-qualidade-dialogo="">
        <Dialog.Title>{t("qualidadeTitulo")}</Dialog.Title>
        <Dialog.Description>{t("qualidadeTexto", { pessoas })}</Dialog.Description>
        <fieldset className="space-y-2">
          {QUALITY_IDS.map((q) => {
            const p = QUALIDADES[q];
            const alta = gbPerHourPerViewer(q, "f") * pessoas;
            return (
              <label key={q} className={cn("flex cursor-pointer items-start gap-3 rounded-sm border p-3", escolha === q ? "border-play-primary bg-bg-deep" : "border-border-subtle")}>
                <input type="radio" name="qualidade" value={q} checked={escolha === q} onChange={() => setEscolha(q)} className="mt-1 accent-[var(--color-play-primary)]" data-sala-qualidade={q} />
                <span className="space-y-0.5 text-sm">
                  <span className="block text-text-display">{t(NOME[q], { altura: p.height, quadros: p.fps })}</span>
                  <span className="block text-xs text-text-muted">
                    {t("qualidadeConsumo", { gb: gb(alta) })}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <div className="flex justify-end gap-2">
          <Dialog.Close className={plate({ kind: "ghost", small: true })}>{t("cancelar")}</Dialog.Close>
          <button type="button" onClick={() => onEscolher(escolha)} className={plate({ kind: "cta", small: true })} data-sala-qualidade-confirmar="">
            {t("qualidadeEscolher")}
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
