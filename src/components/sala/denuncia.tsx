"use client";

// Diálogo de denúncia de uma pessoa ou de uma mensagem do chat: motivo, detalhe opcional e os canais
// públicos para caso grave (ECA Digital, arts. 28 e 29: a denúncia é identificada, sai da conta logada).

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { plate } from "@/components/v2";
import { MOTIVO_TEXTO, type Motivo } from "./textos";

/** Quem ou o que se denuncia: uma pessoa, ou uma mensagem do chat (com o texto, para conferir). */
export type AlvoTela = { tipo: "pessoa"; nome: string } | { tipo: "mensagem"; nome: string; texto: string };

interface Props {
  alvo: AlvoTela | null;
  onClose: () => void;
  onSend: (motivo: Motivo, detalhes: string) => Promise<{ ok: boolean; code?: string }>;
}

export function Denuncia({ alvo, onClose, onSend }: Props) {
  const t = useTranslations("sala");
  const [motivo, setMotivo] = useState<Motivo>("assedio");
  const [detalhes, setDetalhes] = useState("");
  const [estado, setEstado] = useState<"livre" | "enviando" | "enviada" | "erro" | "demais">("livre");

  async function enviar() {
    setEstado("enviando");
    const res = await onSend(motivo, detalhes.trim());
    setEstado(res.ok ? "enviada" : res.code === "denuncias_demais" ? "demais" : "erro");
  }

  return (
    <Dialog.Root open={alvo !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content playSoundOnOpen={false} className="max-w-md space-y-4" data-sala-denuncia="">
        <Dialog.Title>{t(alvo?.tipo === "mensagem" ? "denunciaMensagemTitulo" : "denunciaTitulo", { nome: alvo?.nome ?? "" })}</Dialog.Title>
        <Dialog.Description>{t("denunciaTexto")}</Dialog.Description>
        {alvo?.tipo === "mensagem" && <blockquote className="border-l-2 border-border-strong pl-3 text-sm italic text-text-body">{alvo.texto}</blockquote>}
        {estado === "enviada" ? (
          <p role="status" className="text-sm text-play-primary">{t("denunciaEnviada")}</p>
        ) : (
          <>
            <fieldset className="space-y-2">
              <legend className="text-sm text-text-body">{t("denunciaMotivo")}</legend>
              {(Object.keys(MOTIVO_TEXTO) as Motivo[]).map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm text-text-body">
                  <input type="radio" name="motivo" value={m} checked={motivo === m} onChange={() => setMotivo(m)} />
                  {t(MOTIVO_TEXTO[m])}
                </label>
              ))}
            </fieldset>
            <label className="block space-y-1 text-sm text-text-body">
              <span>{t("denunciaDetalhes")}</span>
              <textarea
                value={detalhes}
                maxLength={500}
                rows={3}
                onChange={(e) => setDetalhes(e.target.value)}
                className="w-full rounded-sm border border-border-strong bg-bg-deep px-3 py-2 text-text-display"
              />
            </label>
            {estado === "erro" && <p role="alert" className="text-sm text-error">{t("denunciaErro")}</p>}
            {estado === "demais" && <p role="alert" className="text-sm text-error">{t("denunciaDemais")}</p>}
            <div className="flex justify-end gap-2">
              <Dialog.Close className={plate({ kind: "ghost", small: true })}>{t("cancelar")}</Dialog.Close>
              <button type="button" disabled={estado === "enviando"} onClick={() => void enviar()} className={plate({ kind: "brand", small: true })} data-sala-denuncia-enviar="">
                {t("denunciaEnviar")}
              </button>
            </div>
          </>
        )}
        <p className="border-t border-border-subtle pt-3 text-xs leading-relaxed text-text-muted">{t("denunciaFora")}</p>
      </Dialog.Content>
    </Dialog.Root>
  );
}
