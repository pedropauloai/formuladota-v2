"use client";

// Form Client Component pra criar lobby — Phase 5.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createLobby, type CreateLobbyResult } from "./actions";

const FIELD_LABEL =
  "font-mono text-sm uppercase tracking-widest text-text-faded";

const FIELD_INPUT = cn(
  "w-full rounded-[var(--radius-sm)] border border-border-subtle bg-bg-elevated",
  "px-4 py-3 font-body text-text-display",
  "placeholder:text-text-faded",
  "transition-colors duration-[var(--motion-duration-micro)]",
  "focus:border-brand-primary focus:outline-none",
  "focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2"
);

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
      <Card variant="elevated" className="space-y-6 border-success/40 p-8">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-text-display">
          Lobby criado
        </h2>
        <p className="font-body text-text-muted">
          O bot Steam criou o lobby no Dota 2. Compartilhe a senha com os outros 9 jogadores.
        </p>

        <div className="rounded-[var(--radius-sm)] border border-border-subtle bg-bg-deep p-4">
          <p className={FIELD_LABEL}>Senha do lobby</p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <code
              className="font-mono text-2xl text-brand-primary"
              style={{ textShadow: "0 0 16px var(--color-brand-primary-glow)" }}
            >
              {created.password}
            </code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => copyPassword(created.password)}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => router.push("/lobbies")}
        >
          Ver lobbies abertos
        </Button>
      </Card>
    );
  }

  return (
    <form action={handleSubmit}>
      <Card variant="elevated" className="space-y-6 p-8">
        <div className="space-y-2">
          <label htmlFor="name" className={FIELD_LABEL}>
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
            className={FIELD_INPUT}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="gameMode" className={FIELD_LABEL}>
            Modo de jogo
          </label>
          <select
            id="gameMode"
            name="gameMode"
            required
            defaultValue="all_pick"
            className={FIELD_INPUT}
          >
            <option value="all_pick">All Pick</option>
            <option value="captains_mode">Captains Mode</option>
            <option value="random_draft">Random Draft</option>
            <option value="single_draft">Single Draft</option>
          </select>
        </div>

        <p className="font-display text-sm font-medium text-text-muted">
          Senha gerada automaticamente. Servidor South America. 5v5.
        </p>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isPending}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "Bot criando lobby..." : "Criar lobby"}
        </Button>
      </Card>
    </form>
  );
}
