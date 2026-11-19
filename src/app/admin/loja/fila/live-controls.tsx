"use client";

// Controle da live na coluna da direita: abrir, encerrar, tamanho da fila, lugares na party e o
// vídeo do YouTube. O mesmo comportamento de antes da mesa de operação.

import { useState } from "react";
import type { AdminQueue } from "@/lib/loja/fila/admin";
import { abrirLive, ajustarVagas, encerrarLive } from "./actions";
import { DANGER, PRIMARY, SECONDARY, type RowAction } from "./rows";

const TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-text-body">
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        className="w-20 rounded-sm border border-border-strong bg-bg-deep px-2 py-1.5 text-right tabular-nums text-text-display"
      />
    </label>
  );
}

function CloseButtons({ liveId, inParty, matchesDone, busy, act }: { liveId: string; inParty: number; matchesDone: number; busy: boolean; act: RowAction }) {
  return (
    <>
      {inParty > 0 && (
        <button
          type="button"
          disabled={busy}
          className={DANGER}
          onClick={() => {
            if (window.confirm("A partida da party terminou? Ela conta para quem estava na party, e a live encerra.")) act("Live encerrada", () => encerrarLive(liveId, true, matchesDone));
          }}
        >
          Partida terminou e encerrar
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        className={DANGER}
        onClick={() => {
          const text = inParty > 0 ? "Encerrar sem contar a partida? Quem estava na party volta para a frente da fila." : "Encerrar a live?";
          if (window.confirm(text)) act("Live encerrada", () => encerrarLive(liveId));
        }}
      >
        {inParty > 0 ? "Encerrar sem contar a partida" : "Encerrar a live"}
      </button>
    </>
  );
}

export function LiveControls({ data, busy, act }: { data: AdminQueue; busy: boolean; act: RowAction }) {
  const live = data.live;
  const inParty = data.entries.filter((e) => e.state === "na_party").length;
  const onAir = live?.status === "ao_vivo";
  const [size, setSize] = useState(live?.queueSize ?? 8);
  const [perMatch, setPerMatch] = useState(live?.seatsPerMatch ?? 4);
  const [youtube, setYoutube] = useState(live?.youtubeVideoId ? `https://youtu.be/${live.youtubeVideoId}` : "");
  const title = onAir ? `Ao vivo desde ${TIME.format(new Date(live.onAirAt ?? live.startsAt))}` : live?.status === "fila" ? "Fora do ar, fila aberta" : "Live fora do ar";
  return (
    <section className="space-y-3 rounded-md border border-border-strong bg-bg-base p-4">
      <h2 className="font-display text-lg uppercase tracking-wide text-text-display">{title}</h2>
      <NumberField label="Tamanho da fila (partidas)" value={size} min={0} max={100} onChange={setSize} />
      <NumberField label="Lugares na party" value={perMatch} min={1} max={4} onChange={setPerMatch} />
      <input
        type="url"
        placeholder="Link da live no YouTube (opcional)"
        value={youtube}
        onChange={(e) => setYoutube(e.target.value)}
        className="w-full rounded-sm border border-border-strong bg-bg-deep px-3 py-2 text-sm text-text-display"
      />
      <div className="flex flex-wrap gap-2">
        {onAir ? (
          <>
            <button type="button" disabled={busy} className={SECONDARY} onClick={() => act("Live atualizada", () => ajustarVagas(live.id, size, perMatch, youtube))}>Salvar</button>
            <CloseButtons liveId={live.id} inParty={inParty} matchesDone={live.matchesDone} busy={busy} act={act} />
          </>
        ) : (
          <>
            <button type="button" disabled={busy} className={PRIMARY} onClick={() => act("Live aberta", () => abrirLive(size, perMatch, youtube))}>Abrir a live</button>
            {live && (
              <button type="button" disabled={busy} className={SECONDARY} onClick={() => act("Fila atualizada", () => ajustarVagas(live.id, size, perMatch, ""))}>
                Salvar o tamanho
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
