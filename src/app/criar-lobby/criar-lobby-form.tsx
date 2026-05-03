"use client";

// Form Client Component pra criar lobby — Phase 5.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { createLobby, type CreateLobbyResult } from "./actions";

export function CriarLobbyForm() {
  const [isPending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ lobbyId: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result: CreateLobbyResult = await createLobby(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCreated({ lobbyId: result.lobbyId, password: result.password });
      toast.success("Lobby criado!");
    });
  };

  const copyPassword = async (pwd: string) => {
    await navigator.clipboard.writeText(pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (created) {
    return (
      <div className="rounded-md border border-[var(--color-success)]/40 bg-[var(--color-card)] p-8 space-y-6">
        <h2 className="font-display text-2xl uppercase tracking-wide text-[var(--color-foreground)]">
          Lobby criado
        </h2>
        <p className="font-sans text-[var(--color-muted-foreground)]">
          O bot Steam criou o lobby no Dota 2. Compartilhe a senha com os outros 9 jogadores.
        </p>

        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-4">
          <p className="font-sans text-xs uppercase tracking-widest text-[var(--color-text-faded)]">
            Senha do lobby
          </p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <code className="font-mono text-2xl text-[var(--color-brand-red)]">{created.password}</code>
            <button
              onClick={() => copyPassword(created.password)}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:border-[var(--color-brand-red)] transition-colors"
              type="button"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>

        <button
          onClick={() => router.push("/lobbies")}
          className="w-full rounded-md border border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-[var(--color-foreground)] hover:bg-[var(--color-brand-red)] transition-colors"
        >
          Ver lobbies abertos
        </button>
      </div>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-8 space-y-6"
    >
      <div className="space-y-2">
        <label htmlFor="name" className="font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-text)]">
          Nome do lobby
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={3}
          maxLength={60}
          placeholder="Ex: FORMULADOTA #42"
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 font-sans text-[var(--color-foreground)] placeholder:text-[var(--color-text-faded)] focus:border-[var(--color-brand-red)] focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="gameMode" className="font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-text)]">
          Modo de jogo
        </label>
        <select
          id="gameMode"
          name="gameMode"
          required
          defaultValue="all_pick"
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 font-sans text-[var(--color-foreground)] focus:border-[var(--color-brand-red)] focus:outline-none"
        >
          <option value="all_pick">All Pick</option>
          <option value="captains_mode">Captains Mode</option>
          <option value="random_draft">Random Draft</option>
          <option value="single_draft">Single Draft</option>
        </select>
      </div>

      <p className="font-sans text-xs text-[var(--color-text-faded)]">
        Senha gerada automaticamente. Servidor South America. 5v5.
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-brand-red)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending && <Loader2 size={16} className="animate-spin" />}
        {isPending ? "Bot criando lobby..." : "Criar lobby"}
      </button>
    </form>
  );
}
