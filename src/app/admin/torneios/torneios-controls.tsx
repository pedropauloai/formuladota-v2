"use client";

// Controles admin de torneios: formulário de criação + ações por linha
// (abrir inscrições / gerar chave / cancelar). O reporte de placar acontece no
// detalhe público /torneios/[slug] (botão admin no card do match).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, PlayCircle, GitBranch, Ban } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  createTournament,
  openRegistration,
  generateBracket,
  cancelTournament,
} from "./actions";

const MAX_TEAMS_OPTIONS = [4, 8, 16, 32, 64];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

export function CreateTournamentForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [maxTeams, setMaxTeams] = useState(8);
  const [prizePool, setPrizePool] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [description, setDescription] = useState("");

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slug || slug === slugify(name)) setSlug(slugify(v));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const r = await createTournament({
        name,
        slug,
        maxTeams,
        description: description || undefined,
        prizePool: prizePool ? Number(prizePool) : undefined,
        startsAt: startsAt || undefined,
      });
      if (!r.success) {
        toast({ type: "error", title: r.error });
        return;
      }
      toast({ type: "success", title: "Torneio criado (rascunho)." });
      setName("");
      setSlug("");
      setPrizePool("");
      setStartsAt("");
      setDescription("");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border border-border-subtle bg-bg-base p-5 space-y-4"
    >
      <p className="font-display text-sm font-semibold uppercase tracking-wide text-text-body">
        Criar torneio
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nome">
          <input
            type="text"
            required
            minLength={5}
            maxLength={80}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ex.: Copa FormulaDota #1"
            className={inputCls}
          />
        </Field>
        <Field label="Slug (URL)">
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="copa-formuladota-1"
            className={`${inputCls} font-mono`}
          />
        </Field>
        <Field label="Máx. de times">
          <select
            value={maxTeams}
            onChange={(e) => setMaxTeams(Number(e.target.value))}
            className={inputCls}
          >
            {MAX_TEAMS_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} times
              </option>
            ))}
          </select>
        </Field>
        <Field label="Premiação R$ (opcional)">
          <input
            type="number"
            min={0}
            step="0.01"
            value={prizePool}
            onChange={(e) => setPrizePool(e.target.value)}
            placeholder="0,00"
            className={inputCls}
          />
        </Field>
        <Field label="Início (opcional)">
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Descrição (opcional)">
          <input
            type="text"
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Single-elim, BO3 nas finais..."
            className={inputCls}
          />
        </Field>
      </div>

      <Button
        type="submit"
        variant="cinematic"
        size="md"
        disabled={isPending || name.length < 5 || slug.length < 3}
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        Criar torneio
      </Button>
    </form>
  );
}

export function TournamentRowActions({
  tournamentId,
  status,
  teamCount,
}: {
  tournamentId: string;
  status: string;
  teamCount: number;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (
    fn: () => Promise<{ success: boolean; error?: string }>,
    okMsg: string
  ) => {
    startTransition(async () => {
      const r = await fn();
      if (!r.success) {
        toast({ type: "error", title: r.error ?? "Erro." });
        return;
      }
      toast({ type: "success", title: okMsg });
      router.refresh();
    });
  };

  if (status === "draft") {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => run(() => openRegistration({ tournamentId }), "Inscrições abertas.")}
        >
          <PlayCircle size={13} /> Abrir inscrições
        </Button>
        <CancelButton tournamentId={tournamentId} isPending={isPending} onRun={run} />
      </div>
    );
  }

  if (status === "open") {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="cinematic"
          size="sm"
          disabled={isPending || teamCount < 2}
          title={teamCount < 2 ? "Mínimo 2 times inscritos" : undefined}
          onClick={() => run(() => generateBracket({ tournamentId }), "Chave gerada!")}
        >
          <GitBranch size={13} /> Gerar chave
        </Button>
        <CancelButton tournamentId={tournamentId} isPending={isPending} onRun={run} />
      </div>
    );
  }

  return null;
}

function CancelButton({
  tournamentId,
  isPending,
  onRun,
}: {
  tournamentId: string;
  isPending: boolean;
  onRun: (fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Cancelar este torneio?")) return;
        onRun(() => cancelTournament({ tournamentId }), "Torneio cancelado.");
      }}
      className="text-error"
    >
      <Ban size={13} /> Cancelar
    </Button>
  );
}

const inputCls =
  "w-full rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-sans text-sm text-white placeholder:text-white/30 focus:border-brand-primary focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1 font-sans text-sm font-semibold uppercase tracking-wide text-white/70">
        {label}
      </span>
      {children}
    </label>
  );
}
