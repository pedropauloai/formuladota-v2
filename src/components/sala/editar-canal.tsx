"use client";

// Editar o canal pelo botão direito na árvore: o nome e, no canal de voz, o limite de pessoas. Usa as
// mesmas ações do painel /admin/salas, que conferem que é o admin.

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { mudarLimiteDoCanal, renomearCanal } from "@/app/admin/salas/actions";
import { Dialog } from "@/components/ui/dialog";
import { plate } from "@/components/v2";
import type { CanalItem } from "@/lib/sala/canais";

const campo = "h-9 w-full rounded-sm border border-border-subtle bg-bg-deep px-2 text-sm text-text-display";

export function EditarCanal({ c, onFechar, onSalvo }: { c: CanalItem; onFechar: () => void; onSalvo: () => void }) {
  const t = useTranslations("sala");
  const [nome, setNome] = useState(c.titulo);
  const [limite, setLimite] = useState(c.lugares ?? 0);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const comLimite = c.lugares !== null;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const novoNome = nome.trim();
    const passos = [
      novoNome !== c.titulo ? () => renomearCanal(c.id, novoNome) : null,
      comLimite && limite !== c.lugares ? () => mudarLimiteDoCanal(c.id, limite) : null,
    ];
    for (const passo of passos) {
      if (!passo) continue;
      const r = await passo();
      if (!r.ok) {
        setErro(r.erro);
        setSalvando(false);
        return;
      }
    }
    onSalvo();
  }

  return (
    <Dialog.Root open onOpenChange={(aberto) => !aberto && onFechar()}>
      <Dialog.Content playSoundOnOpen={false} className="max-w-sm" data-editar-canal={c.id}>
        <Dialog.Title>{t("menuEditarCanal")}</Dialog.Title>
        <form onSubmit={(e) => void salvar(e)} className="mt-5 space-y-4">
          <label className="block space-y-1.5 text-sm text-text-body">
            <span>{t("editarCanalNome")}</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={200} required className={campo} data-editar-canal-nome="" />
          </label>
          {comLimite && (
            <label className="block space-y-1.5 text-sm text-text-body">
              <span>{t("editarCanalLimite")}</span>
              <input type="number" min={2} max={200} value={limite} onChange={(e) => setLimite(Number(e.target.value))} required className={campo} data-editar-canal-limite="" />
            </label>
          )}
          {erro && <p role="alert" className="text-xs text-error">{erro}</p>}
          <div className="flex justify-end gap-2">
            <Dialog.Close className={plate({ kind: "ghost", small: true })}>{t("cancelar")}</Dialog.Close>
            <button type="submit" disabled={salvando || !nome.trim()} className={plate({ kind: "cta", small: true })} data-editar-canal-salvar="">
              {t("salvar")}
            </button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
