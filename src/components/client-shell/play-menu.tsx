"use client";

// PlayMenu — menu lateral de modalidades, espelhando o cliente do Dota 2 (ref:
// "menu lateral - competitiva.png", "find por role.png", "menu lateral - salas
// personalizadas.png"). Abre ao clicar em "Jogar Dota" na bottom-bar.
//
// Modalidades (Pedro 2026-06-03):
//   - Competitiva / Busca por função → forma um grupo que o bot convida pro lobby
//     in-house (busca geral, match_queue). [bot Steam pluga aqui depois]
//   - Salas Personalizadas → Criar / Navegar lobby (bot cria a sala e convida).
//   - Ranked com PRO → organiza o grupo pra buscar no ranking OFICIAL do Dota.
//
// Visitante deslogado VÊ o menu (vitrine); as ações disparam login Discord.
// Sem permissão de partida → abre o PermissionQuizModal (5 perguntas).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  X,
  ChevronDown,
  Swords,
  Users,
  Crown,
  Plus,
  Compass,
  Loader2,
  Search,
} from "lucide-react";
import { signInWithDiscord } from "@/app/login/actions";
import { enterQueue, type QueueRole, type QueueGameMode } from "@/app/queue/actions";
import { PermissionQuizModal } from "@/components/quiz/permission-quiz-modal";

type Modalidade = "competitiva" | "salas" | "pro";

const ROLES: { id: QueueRole; pos: string; label: string }[] = [
  { id: "safelane", pos: "1", label: "Segura (Carry)" },
  { id: "midlane", pos: "2", label: "Meio (Mid)" },
  { id: "offlane", pos: "3", label: "Offlane" },
  { id: "support", pos: "4", label: "Suporte" },
  { id: "support_dedicated", pos: "5", label: "Suporte dedicado" },
];

const GAME_MODES: { id: QueueGameMode; label: string }[] = [
  { id: "all_pick", label: "Escolha livre" },
  { id: "captains_mode", label: "Modo Capitães" },
  { id: "random_draft", label: "Seleção aleatória" },
  { id: "single_draft", label: "Escolha única" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  isVisitor: boolean;
}

export function PlayMenu({ open, onClose, isVisitor }: Props) {
  const [active, setActive] = useState<Modalidade>("competitiva");
  const [roles, setRoles] = useState<Set<QueueRole>>(new Set());
  const [gameMode, setGameMode] = useState<QueueGameMode>("all_pick");
  const [error, setError] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function requireLogin(): boolean {
    if (isVisitor) {
      void signInWithDiscord();
      return true;
    }
    return false;
  }

  function toggleRole(r: QueueRole) {
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  function handleBuscar() {
    if (requireLogin()) return;
    setError(null);
    startTransition(async () => {
      const res = await enterQueue({
        roles: roles.size > 0 ? [...roles] : ["midlane"],
        gameMode,
      });
      if (!res.success) {
        if (res.code === "need_permission") {
          setShowQuiz(true);
          return;
        }
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[var(--z-modal)] bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Jogar Dota — modalidades"
        className="fixed right-0 top-0 bottom-0 z-[calc(var(--z-modal)+1)] flex w-[340px] xl:w-[380px] flex-col border-l border-brand-primary/40 bg-bg-deep/95 backdrop-blur-xl shadow-2xl shadow-black/80 animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <div className="flex items-center gap-2">
            <Swords size={18} className="text-play-primary" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold uppercase tracking-wide text-text-display">
              Jogar Dota
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-sm p-1 text-text-faded hover:bg-bg-elevated hover:text-text-body transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {/* Modalidades */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {/* Competitiva — busca por função */}
          <Section
            icon={Swords}
            title="Competitiva"
            subtitle="Busca por função"
            active={active === "competitiva"}
            onToggle={() => setActive("competitiva")}
          >
            <p className="mb-3 font-body text-sm leading-relaxed text-text-muted">
              Escolha as funções que topa jogar. Formamos um grupo e o bot convida
              todo mundo pro lobby.
            </p>
            <ul className="space-y-1.5">
              {ROLES.map((r) => {
                const on = roles.has(r.id);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className={`flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors ${
                        on
                          ? "border-brand-primary bg-brand-primary/10"
                          : "border-border-subtle bg-bg-elevated hover:border-brand-primary/50"
                      }`}
                    >
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-sm font-display text-sm font-bold ${
                          on ? "bg-brand-primary text-bg-deep" : "bg-bg-surface text-text-muted"
                        }`}
                      >
                        {r.pos}
                      </span>
                      <span className="font-body text-sm text-text-body">{r.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3">
              <label className="mb-1 block font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
                Modo de jogo
              </label>
              <select
                value={gameMode}
                onChange={(e) => setGameMode(e.target.value as QueueGameMode)}
                className="w-full rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated px-3 py-2 font-body text-sm text-text-body"
              >
                {GAME_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </Section>

          {/* Salas personalizadas — lobby criar/navegar */}
          <Section
            icon={Users}
            title="Salas Personalizadas"
            subtitle="Crie ou entre num lobby"
            active={active === "salas"}
            onToggle={() => setActive("salas")}
          >
            <p className="mb-3 font-body text-sm leading-relaxed text-text-muted">
              Monte uma sala com suas regras (o bot cria e convida), ou navegue
              pelas salas abertas da comunidade.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <LinkOrLogin
                isVisitor={isVisitor}
                href="/criar-lobby"
                onLogin={() => void signInWithDiscord()}
                icon={Plus}
                label="Criar"
                variant="primary"
              />
              <LinkOrLogin
                isVisitor={isVisitor}
                href="/lobbies"
                onLogin={() => void signInWithDiscord()}
                icon={Compass}
                label="Navegar"
                variant="secondary"
              />
            </div>
          </Section>

          {/* Ranked com PRO — fila oficial */}
          <Section
            icon={Crown}
            title="Ranked com PRO"
            subtitle="Suba MMR no ranking oficial"
            active={active === "pro"}
            onToggle={() => setActive("pro")}
          >
            <p className="mb-3 font-body text-sm leading-relaxed text-text-muted">
              Entre na fila de um PRO da Fórmula. Ele organiza o grupo e vocês
              sobem MMR juntos no <strong className="text-text-body">ranking
              oficial do Dota</strong>. Exige 1 ficha + 1 permissão.
            </p>
            <LinkOrLogin
              isVisitor={isVisitor}
              href="/ranked-com-pro"
              onLogin={() => void signInWithDiscord()}
              icon={Crown}
              label="Ver PROs na fila"
              variant="primary"
              full
            />
          </Section>
        </div>

        {/* Rodapé — Buscar Partida (só na competitiva) */}
        {active === "competitiva" && (
          <div className="border-t border-border-subtle p-4 space-y-2">
            {error && (
              <p className="rounded border border-error/30 bg-error/5 px-3 py-2 font-mono text-sm text-error">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleBuscar}
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover px-6 py-3 font-display text-lg font-bold uppercase tracking-[0.2em] text-text-display shadow-[var(--color-play-primary-glow)] transition-all hover:scale-[1.01] disabled:opacity-60"
            >
              {pending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Search size={20} aria-hidden="true" />
              )}
              Buscar Partida
            </button>
          </div>
        )}
      </aside>

      <PermissionQuizModal
        open={showQuiz}
        modalidade="buscar partida"
        onClose={() => setShowQuiz(false)}
        onGranted={() => {
          setShowQuiz(false);
          handleBuscar();
        }}
      />
    </>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  active,
  onToggle,
  children,
}: {
  icon: typeof Swords;
  title: string;
  subtitle: string;
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[var(--radius-md)] border ${
        active ? "border-brand-primary/40 bg-bg-elevated/60" : "border-border-subtle bg-bg-elevated/30"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={active}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-bg-elevated/80"
      >
        <Icon
          size={18}
          className={active ? "text-brand-primary" : "text-text-muted"}
          aria-hidden="true"
        />
        <span className="flex-1 min-w-0">
          <span className="block font-display text-sm font-bold uppercase tracking-wide text-text-display">
            {title}
          </span>
          <span className="block font-body text-sm text-text-faded">{subtitle}</span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-text-faded transition-transform ${active ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {active && <div className="px-3 pb-3">{children}</div>}
    </section>
  );
}

function LinkOrLogin({
  isVisitor,
  href,
  onLogin,
  icon: Icon,
  label,
  variant,
  full,
}: {
  isVisitor: boolean;
  href: string;
  onLogin: () => void;
  icon: typeof Plus;
  label: string;
  variant: "primary" | "secondary";
  full?: boolean;
}) {
  const cls = `flex ${full ? "w-full" : ""} items-center justify-center gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 font-display text-sm font-bold uppercase tracking-wide transition-colors ${
    variant === "primary"
      ? "border-brand-primary/60 bg-brand-primary/15 text-brand-primary hover:bg-brand-primary/25"
      : "border-border-subtle bg-bg-surface text-text-body hover:border-brand-primary/50"
  }`;

  if (isVisitor) {
    return (
      <button type="button" onClick={onLogin} className={cls}>
        <Icon size={14} aria-hidden="true" />
        {label}
      </button>
    );
  }
  return (
    <Link href={href} className={cls}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </Link>
  );
}
