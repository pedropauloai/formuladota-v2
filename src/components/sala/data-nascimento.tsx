"use client";

// Formulário da data de nascimento, pedida uma vez na primeira entrada numa sala de voz.

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import { declareBirthDate, type NascimentoState } from "@/app/sala/[id]/actions";
import { Panel, plate } from "@/components/v2";

const ERRO: Record<NonNullable<NascimentoState>["erro"], string> = {
  invalida: "nascimentoInvalida",
  ja_informada: "nascimentoJaInformada",
  falhou: "nascimentoErro",
};

export function DataNascimento({ roomId }: { roomId: string }) {
  const t = useTranslations("sala");
  const [state, action, pending] = useActionState(declareBirthDate, null);
  return (
    <Panel className="mx-auto mt-10 max-w-md space-y-4 p-6" data-sala-portao="nascimento">
      <CalendarDays className="mx-auto size-10 text-gold" aria-hidden="true" />
      <h1 className="text-center font-display-condensed text-[2.2rem] uppercase leading-none text-text-display">{t("nascimentoTitulo")}</h1>
      <p className="text-sm leading-relaxed text-text-body">{t("nascimentoTexto")}</p>
      <form action={action} className="space-y-3">
        <input type="hidden" name="roomId" value={roomId} />
        <label className="block space-y-1 text-sm text-text-body">
          <span>{t("nascimentoCampo")}</span>
          <input
            type="date"
            name="nascimento"
            required
            min="1900-01-01"
            className="w-full rounded-sm border border-border-strong bg-bg-deep px-3 py-2 text-text-display"
          />
        </label>
        {state && (
          <p role="alert" className="text-sm text-error">
            {t(ERRO[state.erro])}
          </p>
        )}
        <button type="submit" disabled={pending} className={plate({ kind: "cta", block: true })}>
          {t("nascimentoEnviar")}
        </button>
      </form>
    </Panel>
  );
}
