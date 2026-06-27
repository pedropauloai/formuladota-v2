"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Pencil } from "lucide-react";
import { setLobbyPassword } from "../actions";

export function MatchPasswordCard({
  lobbyId,
  initialPassword,
  canEdit,
}: {
  lobbyId: string;
  initialPassword: string;
  canEdit: boolean;
}) {
  const [pw, setPw] = useState(initialPassword);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialPassword);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function copy() {
    void navigator.clipboard?.writeText(pw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function save() {
    setMsg(null);
    start(async () => {
      const res = await setLobbyPassword(lobbyId, draft);
      if (res.success) {
        setPw(draft.trim());
        setEditing(false);
      } else {
        setMsg(res.error ?? "Erro.");
      }
    });
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-play-primary/40 bg-bg-elevated p-4">
      <p className="mb-1.5 font-display text-xs uppercase tracking-[0.2em] text-text-muted">
        Senha do lobby Steam
      </p>

      {editing ? (
        <div className="flex flex-col gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={32}
            className="w-full rounded-sm border border-border-subtle bg-bg-surface px-3 py-2 font-mono text-lg tracking-widest text-text-display"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="flex min-h-[40px] items-center rounded-sm border border-play-primary bg-play-primary px-4 font-display text-sm font-bold uppercase tracking-wide text-bg-deep disabled:opacity-60"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(pw);
                setMsg(null);
              }}
              className="flex min-h-[40px] items-center rounded-sm border border-border-subtle px-4 font-body text-sm text-text-muted hover:text-text-body"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl font-bold tracking-[0.3em] text-text-display">
            {pw}
          </span>
          <button
            type="button"
            onClick={copy}
            aria-label="Copiar senha"
            className="flex size-10 items-center justify-center rounded-sm border border-border-subtle text-text-muted transition-colors hover:text-text-body"
          >
            {copied ? <Check size={16} className="text-play-primary" /> : <Copy size={16} />}
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Editar senha"
              className="flex size-10 items-center justify-center rounded-sm border border-border-subtle text-text-muted transition-colors hover:text-text-body"
            >
              <Pencil size={16} />
            </button>
          )}
        </div>
      )}

      {msg && <p className="mt-2 font-mono text-xs text-error">{msg}</p>}

      <p className="mt-3 font-body text-sm text-text-muted">
        O convite chega no seu Dota 2 — é só aceitar. Se não chegar, entre no lobby pela senha acima.
      </p>
    </div>
  );
}
