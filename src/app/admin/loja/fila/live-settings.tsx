"use client";

// Ajustes da live, num popover do topo da mesa (mexe-se pouco neles durante a live): lugares na
// party, o vídeo do YouTube e encerrar. A fila não tem tamanho: quem pagou joga, nesta live ou na
// próxima. Encerrar pede um segundo toque.

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Power, SlidersHorizontal } from "lucide-react";
import type { AdminQueue } from "@/lib/loja/fila/admin";
import { cn } from "@/lib/utils";
import { ajustarVagas, encerrarLive } from "./actions";
import { FILA_SEM_LIMITE } from "@/lib/loja/fila/model";
import { OpButton, POPUP } from "./ui";
import { useAction } from "./use-console";

const FIELD = "h-10 rounded-[var(--radius-button)] border border-white/10 bg-bg-deep px-2.5 text-[15px] text-text-display focus:border-white/25 focus:outline-none";

function CloseLive({ data, onClose }: { data: AdminQueue; onClose: () => void }) {
  const [asking, setAsking] = useState(false);
  const { pending, run } = useAction();
  const live = data.live;
  if (!live || live.status !== "ao_vivo") return null;
  const inParty = data.entries.some((e) => e.state === "na_party");
  const close = (countMatch: boolean) =>
    run({ action: () => encerrarLive(live.id, countMatch, live.matchesDone), success: "Live encerrada. A fila continua vendendo para a próxima.", onDone: onClose });
  return (
    <div className="space-y-2 border-t border-white/10 p-4">
      {!asking ? (
        <OpButton tone="danger" size="sm" icon={<Power size={15} aria-hidden="true" />} onClick={() => setAsking(true)} data-fila-encerrar>
          Encerrar a live
        </OpButton>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-text-muted">
            {inParty ? "Tem gente na party. A partida dela terminou?" : "Encerrar a live? A fila continua vendendo para a próxima."}
          </p>
          <div className="flex flex-wrap gap-2">
            {inParty && (
              <OpButton tone="danger" size="sm" pending={pending} onClick={() => close(true)}>
                Partida terminou, encerrar
              </OpButton>
            )}
            <OpButton tone="danger" size="sm" pending={pending} onClick={() => close(false)} data-fila-encerrar-confirmar>
              {inParty ? "Encerrar sem contar" : "Sim, encerrar"}
            </OpButton>
            <OpButton tone="quiet" size="sm" onClick={() => setAsking(false)}>
              Cancelar
            </OpButton>
          </div>
        </>
      )}
    </div>
  );
}

function Settings({ data, onClose }: { data: AdminQueue; onClose: () => void }) {
  const live = data.live;
  const onAir = live?.status === "ao_vivo";
  const [perMatch, setPerMatch] = useState(live?.seatsPerMatch ?? 4);
  const [youtube, setYoutube] = useState(live?.youtubeVideoId ? `https://youtu.be/${live.youtubeVideoId}` : "");
  const { pending, run } = useAction();
  if (!live) return <p className="p-4 text-[15px] text-text-muted">A fila aberta não está no banco. Abra a live para começar.</p>;
  return (
    <>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3 text-[15px] text-text-body">
          <span>Lugares na party</span>
          <div className="flex rounded-[var(--radius-button)] border border-white/10 p-0.5" role="radiogroup" aria-label="Lugares na party">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={perMatch === n}
                onClick={() => setPerMatch(n)}
                className={cn("size-9 rounded-[4px] text-[15px] tabular-nums", perMatch === n ? "bg-white/[0.1] font-semibold text-text-display" : "text-text-muted hover:text-text-display")}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        {onAir && (
          <label className="block space-y-1.5 text-[15px] text-text-body">
            <span>Link da live no YouTube</span>
            <input type="url" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="Opcional: sem ele, a página mostra a Twitch" className={cn(FIELD, "w-full")} />
          </label>
        )}
        <OpButton
          size="sm"
          pending={pending}
          onClick={() => run({ action: () => ajustarVagas(live.id, FILA_SEM_LIMITE, perMatch, onAir ? youtube : ""), success: "Ajustes salvos.", onDone: onClose })}
        >
          Salvar
        </OpButton>
      </div>
      <CloseLive data={data} onClose={onClose} />
    </>
  );
}

export function LiveSettings({ data }: { data: AdminQueue }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={(next) => setOpen(next)}>
      <Popover.Trigger render={<OpButton tone="quiet" size="sm" icon={<SlidersHorizontal size={15} aria-hidden="true" />} data-fila-ajustes />}>Ajustes da live</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8} className="z-[var(--z-system)]">
          <Popover.Popup className={cn(POPUP, "w-[360px] max-w-[calc(100vw-2rem)] p-0")}>
            {open && <Settings key={data.live?.id ?? "sem-live"} data={data} onClose={() => setOpen(false)} />}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
