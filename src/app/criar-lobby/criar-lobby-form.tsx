"use client";

// Form de criar sala — estilo "Configurações da Sala" do cliente Dota 2
// (ref: configuração lobby.png). Persiste o que o schema suporta (nome, modo, senha);
// as configs avançadas (servidor, visibilidade, regras, bots) são VISUAIS por ora — o
// bot Steam vai consumi-las quando deployado.
//
// [CRIAR SALA] = verde play (compromisso positivo), desabilitado até nome válido.
// [CANCELAR] = ghost. Seções em Teko condensed (font-display-condensed).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, ChevronDown, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { createLobby, updateLobbySettings, type CreateLobbyResult } from "./actions";

interface FormProps {
  /** Quando embedded num modal/painel: ao criar, dispara onCreated em vez de mostrar
   *  a tela de senha com navegação. Cancelar dispara onClose. */
  onCreated?: (lobbyId: string) => void;
  onClose?: () => void;
  /** Quando setado, o form EDITA a sala existente em vez de criar uma nova. */
  editLobbyId?: string;
  defaults?: { name?: string; gameMode?: string };
}

export function CriarLobbyForm({ onCreated, onClose, editLobbyId, defaults }: FormProps = {}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ lobbyId: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  // Nome controlado só pra habilitar o CTA (validação visual; Zod valida no server).
  const [name, setName] = useState(defaults?.name ?? "");
  const router = useRouter();

  const nameValid = name.trim().length >= 3;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result: CreateLobbyResult = editLobbyId
        ? await updateLobbySettings(formData)
        : await createLobby(formData);
      if (!result.success) {
        toast({ type: "error", title: result.error });
        return;
      }
      toast({ type: "success", title: editLobbyId ? "Configurações salvas!" : "Sala criada!" });
      // Embedded (modal): fecha e abre a sala no painel. Standalone: tela de senha.
      if (onCreated) {
        onCreated(result.lobbyId);
        return;
      }
      setCreated({ lobbyId: result.lobbyId, password: result.password });
    });
  }

  async function copyPassword(pwd: string) {
    await navigator.clipboard.writeText(pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (created) {
    return (
      <div className="rounded-sm border border-success/40 bg-bg-elevated/60 p-6 space-y-5">
        <h2 className="font-display-condensed text-3xl uppercase leading-none text-text-display">
          Sala criada
        </h2>
        <p className="font-body text-sm text-text-muted">
          Compartilhe a senha com os outros jogadores. Quando o bot Steam estiver no ar,
          ele cria a sala no Dota e convida automaticamente.
        </p>
        <div className="rounded-sm border border-border-subtle bg-bg-deep p-4">
          <p className="font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
            Senha da sala
          </p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <code className="font-mono text-2xl tabular-nums text-gold">
              {created.password}
            </code>
            <Button type="button" variant="secondary" size="sm" onClick={() => copyPassword(created.password)}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="cinematic" size="md" className="flex-1" onClick={() => router.push(`/lobbies/${created.lobbyId}`)}>
            Entrar na sala
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={() => router.push("/lobbies")}>
            Ver salas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {editLobbyId && <input type="hidden" name="lobbyId" value={editLobbyId} />}
      {/* Bloco principal — grid denso */}
      <div className="rounded-sm border border-border-subtle bg-bg-elevated/40 p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nome da partida">
            <input
              name="name"
              type="text"
              required
              minLength={3}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="FORMULADOTA #42"
              className={INPUT}
            />
          </Field>
          <Field label="Modo">
            <select name="gameMode" defaultValue={defaults?.gameMode ?? "all_pick"} className={INPUT}>
              <option value="all_pick">Escolha livre competitivo</option>
              <option value="captains_mode">Modo Capitães</option>
              <option value="random_draft">Seleção aleatória</option>
              <option value="single_draft">Escolha única</option>
            </select>
          </Field>
          <Field label="Senha da sala">
            <div className="relative">
              <input
                name="password"
                type={showPwd ? "text" : "password"}
                maxLength={20}
                placeholder="(gerada se vazia)"
                className={INPUT}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-faded hover:text-text-body"
                aria-label={showPwd ? "Ocultar" : "Mostrar"}
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Localização do servidor">
            <select className={INPUT} defaultValue="sa">
              <option value="sa">América do Sul</option>
              <option value="us-e">Leste dos EUA</option>
            </select>
          </Field>
          <Field label="Visibilidade da sala">
            <select className={INPUT} defaultValue="publica">
              <option value="publica">Pública</option>
              <option value="amigos">Amigos</option>
              <option value="privada">Privada</option>
            </select>
          </Field>
          <div className="flex flex-col justify-end gap-1.5 pb-1">
            <Checkbox label="Ativar trapaças" />
            <Checkbox label="Seleção imortal" />
          </div>
        </div>
      </div>

      {/* CONFIGURAÇÕES AVANÇADAS — expansível */}
      <div className="rounded-sm border border-border-subtle bg-bg-elevated/40">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          aria-expanded={advanced}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
        >
          <ChevronDown
            size={16}
            className={`text-gold transition-transform ${advanced ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
          <span className="font-display-condensed text-lg uppercase tracking-wide text-text-display">
            Configurações avançadas
          </span>
        </button>
        {advanced && (
          <div className="grid gap-5 border-t border-border-subtle p-4 md:grid-cols-3">
            <fieldset className="space-y-2.5">
              <legend className="mb-1 font-display-condensed text-lg uppercase tracking-wide text-gold">
                Competitivo
              </legend>
              <SelectField label="Prioridade de seleção" options={["Manual", "Aleatória"]} />
              <SelectField label="Equipe inicial" options={["Aleatória", "Os Iluminados", "Os Temidos"]} />
              <SelectField label="Penalidades" options={["Nenhuma", "Padrão"]} />
            </fieldset>
            <fieldset className="space-y-2.5">
              <legend className="mb-1 font-display-condensed text-lg uppercase tracking-wide text-gold">
                Regras de jogo
              </legend>
              <SelectField label="Espectadores" options={["Permitido", "Não permitido"]} />
              <SelectField label="Atraso da Dota TV" options={["2 minutos", "5 minutos", "Sem atraso"]} />
              <SelectField label="Pausas" options={["Ilimitadas", "Limitadas"]} />
              <SelectField label="Formato" options={["Partida única", "Melhor de 3"]} />
            </fieldset>
            <fieldset className="space-y-2.5">
              <legend className="mb-1 font-display-condensed text-lg uppercase tracking-wide text-gold">
                Config. de bots
              </legend>
              <Checkbox label="Preencher vagas com bots" />
              <SelectField label="Dificuldade" options={["Passivos", "Fáceis", "Normais", "Difíceis"]} />
            </fieldset>
          </div>
        )}
      </div>

      {/* Rodapé — [CRIAR SALA] verde play (desabilitado até nome válido) + [CANCELAR] ghost */}
      <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => (onClose ? onClose() : router.push("/lobbies"))}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="cinematic"
          size="md"
          loading={isPending}
          disabled={isPending || !nameValid}
          title={nameValid ? undefined : "Dê um nome à sala (mínimo 3 caracteres)"}
        >
          {isPending
            ? editLobbyId
              ? "Salvando..."
              : "Criando sala..."
            : editLobbyId
              ? "Salvar configurações"
              : "Criar sala"}
        </Button>
      </div>
    </form>
  );
}

const INPUT =
  "w-full rounded-[var(--radius-sm)] border border-border-subtle bg-bg-elevated px-3 py-2 font-body text-sm text-text-display placeholder:text-text-faded transition-colors focus:border-brand-primary focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
        {label}
      </span>
      {children}
    </label>
  );
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <Field label={label}>
      <select className={INPUT} defaultValue={options[0]}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Checkbox({ label }: { label: string }) {
  return (
    <label className="flex items-center gap-2 font-body text-sm text-text-body">
      <input type="checkbox" className="size-4 rounded-sm accent-brand-primary" />
      {label}
    </label>
  );
}
