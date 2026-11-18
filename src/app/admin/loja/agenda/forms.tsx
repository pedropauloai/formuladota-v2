"use client";

// Formulários do painel da agenda. Cada um chama a ação de servidor, mostra o erro e recarrega.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  adicionarJanela,
  bloquearPeriodo,
  cancelarLive,
  marcarLive,
  mudarAgendamento,
  removerBloqueio,
  removerJanela,
  salvarEntrega,
  type AdminResult,
} from "./actions";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const input = "rounded-sm border border-border-strong bg-bg-deep px-2.5 py-1.5 text-sm text-text-display focus:border-brand-primary focus:outline-none";

function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<AdminResult>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result.ok) {
        after?.();
        router.refresh();
      } else setError(result.error);
    });
  return { error, pending, run };
}

function ErrorLine({ error }: { error: string | null }) {
  return error ? <p role="alert" className="text-xs text-error">{error}</p> : null;
}

export function AddWindowForm() {
  const { error, pending, run } = useAction();
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("19:00");
  const [end, setEnd] = useState("22:00");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className={input} aria-label="Dia da semana">
          {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={input} aria-label="Começa" />
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={input} aria-label="Termina" />
        <Button type="button" variant="primary" size="sm" loading={pending} onClick={() => run(() => adicionarJanela(weekday, start, end))}>Adicionar horário</Button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

export function BlockForm() {
  const { error, pending, run } = useAction();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={input} aria-label="Começa" />
        <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={input} aria-label="Termina" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} placeholder="Motivo (só você vê)" className={input} />
        <Button type="button" variant="primary" size="sm" loading={pending} onClick={() => run(() => bloquearPeriodo(start, end, reason), () => setReason(""))}>Bloquear</Button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

export function LiveForm() {
  const { error, pending, run } = useAction();
  const [date, setDate] = useState("");
  const [start, setStart] = useState("21:00");
  const [end, setEnd] = useState("23:59");
  const [party, setParty] = useState(4);
  const [replay, setReplay] = useState(2);
  const [notes, setNotes] = useState("");
  const submit = () =>
    run(() => marcarLive({ start: `${date}T${start}`, end: `${date}T${end}`, partySeats: party, replaySeats: replay, notes }), () => setNotes(""));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} aria-label="Dia da live" />
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={input} aria-label="Começa" />
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={input} aria-label="Termina" />
        <label className="flex items-center gap-1.5 text-xs text-text-muted">Vagas na party<input type="number" min={0} max={100} value={party} onChange={(e) => setParty(Number(e.target.value))} className={`${input} w-16`} /></label>
        <label className="flex items-center gap-1.5 text-xs text-text-muted">Replays<input type="number" min={0} max={100} value={replay} onChange={(e) => setReplay(Number(e.target.value))} className={`${input} w-16`} /></label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} placeholder="Recado para quem compra (opcional)" className={`${input} min-w-[220px] flex-1`} />
        <Button type="button" variant="primary" size="sm" loading={pending} disabled={!date} onClick={submit}>Marcar live</Button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

type RowAction = "remover-janela" | "remover-bloqueio" | "cancelar-live" | "concluir" | "cancelar-horario";

const ROW_ACTIONS: Record<RowAction, { label: string; act: (id: string) => Promise<AdminResult> }> = {
  "remover-janela": { label: "Remover", act: removerJanela },
  "remover-bloqueio": { label: "Remover", act: removerBloqueio },
  "cancelar-live": { label: "Cancelar live", act: cancelarLive },
  concluir: { label: "Concluir", act: (id) => mudarAgendamento(id, "concluido") },
  "cancelar-horario": { label: "Cancelar", act: (id) => mudarAgendamento(id, "cancelado") },
};

export function RowButton({ id, action }: { id: string; action: RowAction }) {
  const { error, pending, run } = useAction();
  const { label, act } = ROW_ACTIONS[action];
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button type="button" variant="ghost" size="sm" loading={pending} onClick={() => run(() => act(id))}>{label}</Button>
      <ErrorLine error={error} />
    </span>
  );
}

export function DeliveryForm({ orderId, url, note }: { orderId: string; url: string; note: string }) {
  const { error, pending, run } = useAction();
  const [link, setLink] = useState(url);
  const [text, setText] = useState(note);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://link do vídeo" className={`${input} min-w-[240px] flex-1`} />
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Recado para o comprador (opcional)" className={`${input} min-w-[240px] flex-1`} />
        <Button type="button" variant="primary" size="sm" loading={pending} onClick={() => run(() => salvarEntrega(orderId, link, text))}>Entregar</Button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}
