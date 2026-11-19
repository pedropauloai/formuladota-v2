"use client";

// Detalhe de quem o Pedro clicou na party ou na fila: identidade grande, ID do Dota, perfil da
// Steam, origem, histórico na fila e as ações raras (chamar fora da ordem, tirar da fila).

import { ExternalLink, X } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import type { AdminQueueEntry } from "@/lib/loja/fila/admin";
import { chamarProximo, naoApareceu, tirarDaFila } from "./actions";
import { CopyId, DANGER, MatchesStepper, OriginBadge, SECONDARY, since, type RowAction } from "./rows";

const DAY_TIME = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-subtle py-1.5 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="text-right text-text-display">{children}</span>
    </div>
  );
}

function origin(entry: AdminQueueEntry): string {
  if (entry.courtesy) return "você pôs na fila (cortesia)";
  if (entry.battlepass) return "assinante do Battlepass";
  if (entry.boughtOffline) return "comprou fora da live";
  return entry.carriedOver ? "comprou numa live anterior" : "comprou nesta live";
}

export function EntryDetail({ entry, liveId, onAir, busy, act, onClose }: {
  entry: AdminQueueEntry;
  liveId: string | null;
  onAir: boolean;
  busy: boolean;
  act: RowAction;
  onClose: () => void;
}) {
  const inParty = entry.state === "na_party";
  return (
    <aside className="space-y-4 rounded-md border border-gold/50 bg-bg-base p-4" aria-label={`Detalhes de ${entry.name}`}>
      <header className="flex items-start gap-3">
        <UserAvatar src={entry.avatarUrl ?? undefined} alt={entry.name} fallback={entry.name.slice(0, 2).toUpperCase()} size="lg" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-base font-semibold text-text-display">{entry.name}</p>
          {entry.steamPersona && <p className="truncate text-xs text-text-muted">Steam: {entry.steamPersona}</p>}
          <OriginBadge entry={entry} />
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar os detalhes" className="text-text-muted hover:text-text-display">
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <div className="flex flex-wrap items-center gap-2">
        {entry.dotaFriendId && <CopyId id={entry.dotaFriendId} large />}
        {entry.steamProfileUrl && (
          <a href={entry.steamProfileUrl} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
            Perfil Steam <ExternalLink size={13} aria-hidden="true" />
          </a>
        )}
      </div>
      <div>
        <Fact label="Agora">{inParty ? `na party, partida ${Math.min(entry.played + 1, entry.matches)} de ${entry.matches}` : `${entry.position}º da fila`}</Fact>
        <Fact label="Como entrou">{origin(entry)}</Fact>
        <Fact label="Entrou na fila">{DAY_TIME.format(new Date(entry.queuedAt))} ({since(entry.queuedAt)})</Fact>
        <Fact label="Última vez na party">{entry.lastTurnAt ? `${DAY_TIME.format(new Date(entry.lastTurnAt))} (${since(entry.lastTurnAt)})` : "nunca jogou"}</Fact>
        <Fact label="Não apareceu">{entry.noShows > 0 ? `${entry.noShows}x` : "nenhuma vez"}</Fact>
        <Fact label="Partidas">
          <MatchesStepper entry={entry} busy={busy} act={act} />
        </Fact>
      </div>
      <div className="flex flex-wrap gap-2">
        {inParty ? (
          <button type="button" disabled={busy} className={SECONDARY} onClick={() => act("Não apareceu", () => naoApareceu(entry.id))}>Não apareceu</button>
        ) : (
          <button type="button" disabled={busy || !onAir || !liveId} className={SECONDARY} onClick={() => liveId && act("Chamado", () => chamarProximo(liveId, entry.id))}>
            Chamar agora, fora da ordem
          </button>
        )}
        {!inParty && (
          <button
            type="button"
            disabled={busy}
            className={DANGER}
            onClick={() => {
              if (window.confirm(`Tirar ${entry.name} da fila? O reembolso, se houver, é à parte, no Mercado Pago.`)) {
                act("Tirado da fila", () => tirarDaFila(entry.id));
                onClose();
              }
            }}
          >
            Tirar da fila
          </button>
        )}
      </div>
    </aside>
  );
}
