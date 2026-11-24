"use client";

// Primeira entrada numa sala de voz: a pessoa marca uma vez "tenho 18 anos ou mais", com as regras da
// sala ao lado (decisão do PPA de 23/11/2026). A marcação fica guardada com a data e a versão do texto.

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { confirmAdult } from "@/app/sala/[id]/actions";
import { Panel, plate } from "@/components/v2";

const REGRAS = ["maioridadeRegra1", "maioridadeRegra2", "maioridadeRegra3", "maioridadeRegra4"] as const;

export function Maioridade({ roomId, next }: { roomId: string; next: string }) {
  const t = useTranslations("sala");
  const [state, action, pending] = useActionState(confirmAdult, null);
  return (
    <Panel className="mx-auto mt-10 max-w-lg space-y-4 p-6" data-sala-portao="maioridade">
      <ShieldCheck className="mx-auto size-10 text-gold" aria-hidden="true" />
      <h1 className="text-center font-display-condensed text-[2.2rem] uppercase leading-none text-text-display">{t("maioridadeTitulo")}</h1>
      <p className="text-sm leading-relaxed text-text-body">{t("maioridadeTexto")}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-text-body">
        {REGRAS.map((chave) => (
          <li key={chave}>{t(chave)}</li>
        ))}
      </ul>
      <form action={action} className="space-y-3">
        <input type="hidden" name="roomId" value={roomId} />
        <input type="hidden" name="next" value={next} />
        <label className="flex items-start gap-2 text-sm text-text-display">
          <input type="checkbox" name="maior" value="sim" required className="mt-0.5 size-4 accent-[var(--color-play-primary)]" data-sala-maior="" />
          <span>{t("maioridadeMarcacao")}</span>
        </label>
        {state && (
          <p role="alert" className="text-sm text-error">
            {t(state.erro === "sem_marcacao" ? "maioridadeSemMarcacao" : "maioridadeErro")}
          </p>
        )}
        <button type="submit" disabled={pending} className={plate({ kind: "cta", block: true })} data-sala-maior-enviar="">
          {t("maioridadeEnviar")}
        </button>
      </form>
    </Panel>
  );
}
