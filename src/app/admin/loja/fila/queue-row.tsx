"use client";

// Uma pessoa da fila: posição, nome, origem, partidas, faltas e a vez no revezamento. À direita, o
// ID do Dota (para adicionar antes da vez) e o menu, que também põe na party fora da ordem quando há
// lugar livre. Numa troca, o ID dá lugar ao dourado "Entrar no lugar". Clicar na linha abre os
// detalhes ali mesmo.

import { ArrowUpToLine, ExternalLink, LogOut, Minus, Plus, Replace } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import type { AdminQueueEntry } from "@/lib/loja/fila/admin";
import { cn } from "@/lib/utils";
import { chamarProximo, tirarDaFila, tirarDaParty } from "./actions";
import { ajustarPartidas } from "./cortesia-actions";
import { trocarJogador } from "./mesa-actions";
import { ActionMenu, type MenuAction } from "./action-menu";
import { CopyId, OpButton, OriginPill, since } from "./ui";
import { useAction } from "./use-console";

const DAY_TIME = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const NEW_MS = 5 * 60 * 1000;

export interface RowContext {
  liveId: string | null;
  /** Live no ar e lugar livre na party. */
  canPut: boolean;
  /** Quem sai da party, numa troca. */
  swapFor: AdminQueueEntry | null;
  onSwapDone: () => void;
  now: number;
}

function rowActions(entry: AdminQueueEntry, ctx: RowContext, run: ReturnType<typeof useAction>["run"]): MenuAction[] {
  const left = entry.matches - entry.played;
  const { liveId } = ctx;
  const put: MenuAction[] =
    ctx.canPut && liveId
      ? [
          {
            key: "party",
            label: "Pôr na party agora",
            hint: "No lugar livre, fora da ordem da fila.",
            icon: <ArrowUpToLine size={16} />,
            testId: "por-na-party",
            run: () => run({ action: () => chamarProximo(liveId, entry.id), success: `${entry.name} entrou na party.`, undo: () => tirarDaParty(entry.id) }),
          },
        ]
      : [];
  // A vaga do dia não tem saldo de partidas: joga a live inteira no revezamento.
  const adjust: MenuAction[] = entry.dayPass
    ? []
    : [
        { key: "mais", label: "Dar mais uma partida", icon: <Plus size={16} />, separatorBefore: put.length > 0, disabled: entry.matches >= 20, testId: "mais-partida", run: () => run({ action: () => ajustarPartidas(entry.id, 1), success: `${entry.name}: ${left + 1} partidas a jogar.` }) },
        { key: "menos", label: "Tirar uma partida", icon: <Minus size={16} />, disabled: left <= 1, testId: "menos-partida", run: () => run({ action: () => ajustarPartidas(entry.id, -1), success: `${entry.name}: ${left - 1} partida${left - 1 === 1 ? "" : "s"} a jogar.` }) },
      ];
  const before = put.length + adjust.length > 0;
  return [
    ...put,
    ...adjust,
    ...(entry.steamProfileUrl ? [{ key: "steam", label: "Perfil na Steam", icon: <ExternalLink size={16} />, href: entry.steamProfileUrl, separatorBefore: before }] : []),
    {
      key: "fila",
      label: "Tirar da fila",
      hint: "Sai de vez. Reembolso, se houver, é no Mercado Pago.",
      confirm: `Confirmar: tirar ${entry.name}`,
      icon: <LogOut size={16} />,
      tone: "danger",
      separatorBefore: !entry.steamProfileUrl && before,
      testId: "tirar-da-fila",
      run: () => run({ action: () => tirarDaFila(entry.id), success: `${entry.name} saiu da fila.` }),
    },
  ];
}

/** Numa troca, quem entra no lugar de quem sai da party. */
function SwapButton({ entry, ctx }: { entry: AdminQueueEntry; ctx: RowContext }) {
  const { pending, run } = useAction();
  const { liveId, swapFor } = ctx;
  if (!liveId || !swapFor) return null;
  return (
    <OpButton
      tone="target"
      size="sm"
      pending={pending}
      icon={<Replace size={15} aria-hidden="true" />}
      onClick={() =>
        run({
          action: () => trocarJogador(liveId, swapFor.id, entry.id),
          success: `${entry.name} entrou no lugar de ${swapFor.name}.`,
          undo: () => trocarJogador(liveId, entry.id, swapFor.id),
          onDone: ctx.onSwapDone,
        })
      }
      data-fila-entrar-no-lugar
    >
      Entrar no lugar
    </OpButton>
  );
}

function Details({ entry, now }: { entry: AdminQueueEntry; now: number }) {
  const how = entry.courtesy ? "Cortesia sua" : entry.battlepass ? "Assinante do Battlepass" : entry.boughtOffline ? "Comprou fora da live" : entry.carriedOver ? "Comprou numa live anterior" : "Comprou nesta live";
  const facts: [string, string][] = [
    ["Entrou na fila", `${DAY_TIME.format(new Date(entry.queuedAt))} (${since(entry.queuedAt, now)})`],
    ["Como entrou", how],
    ["Última vez na party", entry.lastTurnAt ? `${DAY_TIME.format(new Date(entry.lastTurnAt))} (${since(entry.lastTurnAt, now)})` : "Nunca jogou"],
    [
      "Partidas",
      entry.dayPass
        ? `vaga do dia, ${entry.played > 0 ? `jogou ${entry.played} hoje` : "ainda não jogou hoje"}`
        : `${entry.matches - entry.played === 1 ? "falta 1" : `faltam ${entry.matches - entry.played}`} de ${entry.matches}`,
    ],
    ["Nome no Dota", entry.steamPersona ?? "Sem Steam vinculada"],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 pb-4 pl-[6.25rem] pr-4 text-sm" suppressHydrationWarning>
      {facts.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-text-muted">{label}</dt>
          <dd className="truncate text-text-display first-letter:uppercase">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function QueueRow({ entry, ctx, expanded, onToggle }: { entry: AdminQueueEntry; ctx: RowContext; expanded: boolean; onToggle: () => void }) {
  const { run } = useAction();
  const left = entry.matches - entry.played;
  const isNew = ctx.now - Date.parse(entry.queuedAt) < NEW_MS;
  return (
    <li className={cn("border-b border-white/[0.05] last:border-b-0", expanded && "bg-white/[0.03]")} data-fila-linha={entry.id}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${entry.name}, ${entry.position}º da fila`}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onToggle();
          }
        }}
        className="grid cursor-pointer grid-cols-[2rem_2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-white/[0.035] focus-visible:bg-white/[0.05]"
      >
        <span className="text-right font-display-condensed text-[1.75rem] leading-none tabular-nums text-text-faded">{entry.position}</span>
        <UserAvatar src={entry.avatarUrl ?? undefined} alt="" fallback={entry.name.slice(0, 2).toUpperCase()} size="md" />
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="truncate text-[15px] font-medium leading-5 text-text-display">{entry.name}</span>
            {isNew && <span className="shrink-0 rounded-sm bg-gold/15 px-1.5 text-sm font-semibold leading-5 text-gold">novo</span>}
          </p>
          <p className="mt-0.5 flex items-center gap-x-2.5 overflow-hidden whitespace-nowrap text-sm leading-5 text-text-muted" suppressHydrationWarning>
            <OriginPill entry={entry} />
            {entry.dayPass ? (
              <span data-fila-vaga-do-dia>
                {entry.played > 0 ? (
                  <>
                    jogou <b className="font-semibold text-text-body">{entry.played}</b> hoje
                  </>
                ) : (
                  "vaga do dia"
                )}
              </span>
            ) : (
              <span>
                <b className="font-semibold text-text-body">{left}</b> a jogar
              </span>
            )}
            <span className={cn("truncate", !entry.lastTurnAt && "text-play-primary")}>{entry.lastTurnAt ? `jogou ${since(entry.lastTurnAt, ctx.now)}` : "nunca jogou"}</span>
          </p>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {ctx.swapFor ? <SwapButton entry={entry} ctx={ctx} /> : entry.dotaFriendId && <CopyId id={entry.dotaFriendId} className="hidden sm:inline-flex" />}
          <ActionMenu label={`Ações de ${entry.name}`} actions={rowActions(entry, ctx, run)} />
        </div>
      </div>
      {expanded && <Details entry={entry} now={ctx.now} />}
    </li>
  );
}
