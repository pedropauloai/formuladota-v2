"use client";

// Painel do Pedro para operar a fila durante a live. Atualiza sozinho a cada 5 s (compra nova
// aparece sem recarregar). Os botões grandes funcionam no celular, ao lado do Dota aberto no PC.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminQueue } from "@/lib/loja/fila/admin";
import {
  abrirLive, ajustarVagas, chamarProximo, completarParty, encerrarLive, naoApareceu, partidaTerminou, tirarDaFila,
} from "./actions";
import { DANGER, FinishedList, PRIMARY, PartyRow, SECONDARY, WaitingRow, type RowAction } from "./rows";

const TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const REFRESH_MS = 5000;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-md border border-border-strong bg-bg-base p-4 md:p-5">
      <header className="space-y-1">
        <h2 className="font-display text-xl uppercase tracking-wide text-text-display">{title}</h2>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

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

function LiveControls({ data, busy, act }: { data: AdminQueue; busy: boolean; act: RowAction }) {
  const live = data.live;
  const inParty = data.entries.filter((e) => e.state === "na_party").length;
  const onAir = live?.status === "ao_vivo";
  const [size, setSize] = useState(live?.queueSize ?? 8);
  const [perMatch, setPerMatch] = useState(live?.seatsPerMatch ?? 4);
  const [youtube, setYoutube] = useState(live?.youtubeVideoId ? `https://youtu.be/${live.youtubeVideoId}` : "");
  const open = live ? Math.max(0, live.queueSize - live.occupied) : 0;
  return (
    <Section
      title={onAir ? `Ao vivo desde ${TIME.format(new Date(live.onAirAt ?? live.startsAt))}` : "Live fora do ar"}
      hint={onAir ? `Vagas abertas agora: ${open} (cada partida jogada devolve uma).` : "Abrir a live mostra o vídeo na página da fila e libera a venda na hora."}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Tamanho da fila (partidas)" value={size} min={0} max={100} onChange={setSize} />
        <NumberField label="Lugares na party por partida" value={perMatch} min={1} max={4} onChange={setPerMatch} />
      </div>
      <input
        type="url"
        placeholder="Link da live no YouTube (opcional: sem ele, a página mostra a live do canal)"
        value={youtube}
        onChange={(e) => setYoutube(e.target.value)}
        className="w-full rounded-sm border border-border-strong bg-bg-deep px-3 py-2 text-sm text-text-display"
      />
      <div className="flex flex-wrap gap-2">
        {onAir ? (
          <>
            <button type="button" disabled={busy} className={SECONDARY} onClick={() => act("Live atualizada", () => ajustarVagas(live.id, size, perMatch, youtube))}>Salvar</button>
            {inParty > 0 && (
              <button
                type="button"
                disabled={busy}
                className={DANGER}
                onClick={() => {
                  if (window.confirm("A partida da party terminou? Ela conta para quem estava na party, e a live encerra.")) act("Live encerrada", () => encerrarLive(live.id, true, live.matchesDone));
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
                if (window.confirm(text)) act("Live encerrada", () => encerrarLive(live.id));
              }}
            >
              {inParty > 0 ? "Encerrar sem contar a partida" : "Encerrar a live"}
            </button>
          </>
        ) : (
          <button type="button" disabled={busy} className={PRIMARY} onClick={() => act("Live aberta", () => abrirLive(size, perMatch, youtube))}>Abrir a live</button>
        )}
      </div>
    </Section>
  );
}

export function AdminQueuePanel({ data }: { data: AdminQueue }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  const act: RowAction = (label, action) =>
    startTransition(async () => {
      const result = await action();
      setNotice(result.ok ? { ok: true, text: label } : { ok: false, text: result.error ?? "Não deu certo." });
      router.refresh();
    });

  const live = data.live;
  const onAir = live?.status === "ao_vivo";
  const party = data.entries.filter((e) => e.state === "na_party");
  const waiting = data.entries.filter((e) => e.state === "aguardando");

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-8">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl uppercase tracking-wide text-text-display">Fila da party</h1>
        <a href="/party" target="_blank" rel="noopener noreferrer" className="text-sm text-text-muted underline-offset-2 hover:underline">ver a página pública</a>
      </header>
      {notice && (
        <p role="status" className={`rounded-sm border p-2 text-sm ${notice.ok ? "border-play-primary/40 text-play-primary" : "border-error/40 text-error"}`}>{notice.text}</p>
      )}
      <LiveControls key={live?.id ?? "sem-live"} data={data} busy={busy} act={act} />
      <Section title={`Na party agora (${party.length} de ${live?.seatsPerMatch ?? 4})`} hint="Convide pelo ID do Dota. Depois da partida, marque quem jogou.">
        {party.length > 0 && (
          <ul className="divide-y divide-border-subtle">
            {party.map((e) => (
              <PartyRow key={e.id} entry={e} busy={busy} act={act} noShow={naoApareceu} />
            ))}
          </ul>
        )}
        {onAir && live && (
          <div className="flex flex-wrap gap-2 pt-1">
            {party.length > 0 && (
              <button type="button" disabled={busy} className={PRIMARY} onClick={() => act("Partida marcada", () => partidaTerminou(live.id, live.matchesDone))}>
                Partida {live.matchesDone + 1} terminou: todos jogaram
              </button>
            )}
            <button type="button" disabled={busy || waiting.length === 0} className={SECONDARY} onClick={() => act("Chamado", () => chamarProximo(live.id))}>Chamar o próximo</button>
            <button type="button" disabled={busy || waiting.length === 0} className={SECONDARY} onClick={() => act("Party completa", () => completarParty(live.id))}>Completar a party</button>
          </div>
        )}
        {!onAir && <p className="text-sm text-text-muted">Abra a live para chamar a fila.</p>}
      </Section>
      <Section title={`Fila (${waiting.length})`} hint="Ordem do pagamento. Quem não aparece volta para o fim sem perder a vaga.">
        {waiting.length === 0 ? (
          <p className="text-sm text-text-muted">Ninguém esperando.</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {waiting.map((e) => (
              <WaitingRow key={e.id} entry={e} busy={busy || !onAir} act={act} callThis={(id) => chamarProximo(live?.id ?? "", id)} remove={tirarDaFila} />
            ))}
          </ul>
        )}
      </Section>
      <Section title="Jogaram nas últimas 12 horas">
        <FinishedList items={data.finished} />
      </Section>
    </div>
  );
}
