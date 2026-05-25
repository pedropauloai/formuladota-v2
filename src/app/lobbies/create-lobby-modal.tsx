"use client";

// Modal de criação de lobby — campos: nome, modo, senha, localização, visibilidade.
// Reusa Server Action createLobby existente (/criar-lobby/actions.ts).
// Estrutura inspirada em painéis de configuração de salas de jogos competitivos.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, ChevronDown, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { createLobby } from "@/app/criar-lobby/actions";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateLobbyModal({ open, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const router = useRouter();

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createLobby(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Lobby criado! Senha: ${result.password}`);
      router.push(`/lobbies/${result.lobbyId}`);
    });
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-label="Configurações da sala"
        className="absolute left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-border-subtle bg-gradient-to-b from-[#0c0c0c] to-black shadow-2xl xl:max-w-3xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <h2 className="font-display text-base uppercase tracking-[0.25em] text-white">
            Configurações da sala
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-8 items-center justify-center rounded-md text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form action={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
          {/* Linha 1: Nome + Modo + Senha */}
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Nome da sala">
              <input
                name="name"
                type="text"
                required
                minLength={3}
                maxLength={60}
                placeholder="FORMULADOTA #42"
                className="w-full rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-sans text-sm text-white placeholder:text-white/40 focus:border-brand-primary focus:outline-none"
              />
            </Field>

            <Field label="Modo">
              <SelectInput
                name="gameMode"
                defaultValue="all_pick"
                options={[
                  { value: "all_pick", label: "Escolha livre competitivo" },
                  { value: "captains_mode", label: "Modo capitães" },
                  { value: "random_draft", label: "Seleção aleatória" },
                  { value: "single_draft", label: "Single draft" },
                ]}
              />
            </Field>

            <Field label="Senha da sala">
              <PasswordReadonly />
            </Field>
          </div>

          {/* Linha 2: Localização + Visibilidade */}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Localização do servidor">
              <SelectInput
                name="serverLocation"
                defaultValue="south_america"
                options={[
                  { value: "south_america", label: "América do Sul (Brasil)" },
                  { value: "us_east", label: "EUA Leste" },
                  { value: "us_west", label: "EUA Oeste" },
                ]}
                disabled
              />
            </Field>

            <Field label="Visibilidade da sala">
              <SelectInput
                name="visibility"
                defaultValue="public"
                options={[
                  { value: "public", label: "Pública" },
                  { value: "friends", label: "Apenas amigos" },
                  { value: "private", label: "Privada (link)" },
                ]}
                disabled
              />
            </Field>
          </div>

          {/* Toggle avançado */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-[0.2em] text-white/60 hover:text-white transition-colors"
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
            Configurações avançadas
          </button>

          {showAdvanced && (
            <div className="space-y-4 rounded-md border border-border-subtle bg-black/30 p-5">
              <p className="font-mono text-sm uppercase tracking-widest text-white/40">
                Recursos avançados — V2 (placeholder)
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Espectadores">
                  <SelectInput
                    name="spectators"
                    defaultValue="permitted"
                    disabled
                    options={[
                      { value: "permitted", label: "Permitido" },
                      { value: "blocked", label: "Bloqueado" },
                    ]}
                  />
                </Field>
                <Field label="Atraso transmissão">
                  <SelectInput
                    name="streamDelay"
                    defaultValue="2min"
                    disabled
                    options={[
                      { value: "0", label: "Sem atraso" },
                      { value: "2min", label: "2 minutos" },
                      { value: "5min", label: "5 minutos" },
                    ]}
                  />
                </Field>
                <Field label="Pausas">
                  <SelectInput
                    name="pauses"
                    defaultValue="unlimited"
                    disabled
                    options={[
                      { value: "0", label: "Sem pausas" },
                      { value: "3", label: "3 pausas" },
                      { value: "unlimited", label: "Ilimitadas" },
                    ]}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Footer botões */}
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-5">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="cinematic"
              size="md"
              disabled={isPending}
            >
              {isPending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {isPending ? "Bot criando lobby..." : "Criar sala"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1.5 font-mono text-sm uppercase tracking-widest text-white/50">
        {label}
      </span>
      {children}
    </label>
  );
}

function SelectInput({
  name,
  defaultValue,
  options,
  disabled,
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="w-full appearance-none rounded-md border border-border-subtle bg-black/40 px-3 py-2 pr-8 font-sans text-sm text-white focus:border-brand-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-black">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/40"
        aria-hidden="true"
      />
    </div>
  );
}

function PasswordReadonly() {
  const [reveal, setReveal] = useState(false);
  return (
    <div className="relative">
      <input
        type={reveal ? "text" : "password"}
        readOnly
        value="auto-gerada · 8 caracteres"
        className="w-full rounded-md border border-border-subtle bg-black/30 px-3 py-2 pr-9 font-mono text-sm text-white/60 focus:outline-none"
        aria-label="Senha auto-gerada"
      />
      <button
        type="button"
        onClick={() => setReveal(!reveal)}
        aria-label={reveal ? "Ocultar senha" : "Revelar senha"}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
      >
        {reveal ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
      </button>
    </div>
  );
}
