// Portão da sala: o que a pessoa vê quando ainda não pode entrar (sem login, fora da sala, menor,
// sala encerrada...). Sem login, o botão do Discord traz de volta para a mesma sala.

import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { DoorClosed, LogIn, ShieldAlert } from "lucide-react";
import { signInWithDiscordReturning } from "@/app/login/actions";
import { Link } from "@/i18n/navigation";
import { Panel, plate } from "@/components/v2";

export type PortaoTipo = "login" | "fora" | "expulso" | "encerrada" | "identidade" | "bloqueada" | "menor" | "lotada";

const CHAVES: Record<PortaoTipo, { titulo: string; texto: string }> = {
  login: { titulo: "portaoLoginTitulo", texto: "portaoLoginTexto" },
  fora: { titulo: "portaoForaTitulo", texto: "portaoForaTexto" },
  expulso: { titulo: "portaoExpulsoTitulo", texto: "portaoExpulsoTexto" },
  encerrada: { titulo: "portaoEncerradaTitulo", texto: "portaoEncerradaTexto" },
  identidade: { titulo: "portaoIdentidadeTitulo", texto: "portaoIdentidadeTexto" },
  bloqueada: { titulo: "portaoBloqueadaTitulo", texto: "portaoBloqueadaTexto" },
  menor: { titulo: "portaoMenorTitulo", texto: "portaoMenorTexto" },
  lotada: { titulo: "portaoLotadaTitulo", texto: "portaoLotadaTexto" },
};

export async function Portao({ tipo, next, children }: { tipo: PortaoTipo; next: string; children?: ReactNode }) {
  const t = await getTranslations("sala");
  const chaves = CHAVES[tipo];
  const Icon = tipo === "login" ? LogIn : tipo === "menor" || tipo === "bloqueada" ? ShieldAlert : DoorClosed;
  return (
    <Panel className="mx-auto mt-10 max-w-md space-y-4 p-6 text-center" data-sala-portao={tipo}>
      <Icon className="mx-auto size-10 text-brand-primary" aria-hidden="true" />
      <h1 className="font-display-condensed text-[2.2rem] uppercase leading-none text-text-display">{t(chaves.titulo)}</h1>
      <p className="text-sm leading-relaxed text-text-body">{t(chaves.texto)}</p>
      {tipo === "login" && (
        <form action={signInWithDiscordReturning}>
          <input type="hidden" name="next" value={next} />
          <button type="submit" className={plate({ kind: "cta" })}>
            {t("portaoLoginBotao")}
          </button>
        </form>
      )}
      {tipo === "identidade" && (
        <Link href={`/vincular/steam?next=${encodeURIComponent(next)}`} className={plate({ kind: "cta" })}>
          {t("portaoIdentidadeBotao")}
        </Link>
      )}
      {children}
    </Panel>
  );
}
