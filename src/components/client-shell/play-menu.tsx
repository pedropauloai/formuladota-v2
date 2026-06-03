"use client";

// PlayMenu — botão "Jogar Dota" + painel de modalidades que CRESCE A PARTIR do botão
// (canto inferior-direito), com a MESMA largura do botão, espelhando o cliente do Dota 2.
// NÃO ofusca o background (sem backdrop) — o painel é um cartão sólido ancorado no botão.
// Refs: "menu lateral - competitiva.png", "find por role.png", "salas personalizadas.png".
//
// Modalidades (Pedro 2026-06-03):
//   - Competitiva / Busca por função → grupo que o bot convida pro lobby in-house.
//   - Salas Personalizadas → Criar / Navegar lobby.
//   - Ranked com PRO → organiza grupo pra buscar no ranking OFICIAL do Dota.
//
// Visitante vê o painel (vitrine); ações disparam login. Sem permissão → pop-up de quiz.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  Swords,
  Users,
  Crown,
  Plus,
  Compass,
  Loader2,
  Search,
  Play,
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
  isVisitor: boolean;
}

export function PlayMenu({ isVisitor }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Modalidade>("competitiva");
  const [roles, setRoles] = useState<Set<QueueRole>>(new Set());
  const [gameMode, setGameMode] = useState<QueueGameMode>("all_pick");
  const [error, setError] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggleRole(r: QueueRole) {
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  function handleBuscar() {
    if (isVisitor) {
      void signInWithDiscord();
      return;
    }
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
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="pointer-events-auto relative w-[300px] xl:w-[340px]">
      {/* Painel — cresce ACIMA do botão, mesma largura, sem ofuscar o fundo */}
      {open && (
        <div className="absolute bottom-full right-0 mb-2 flex max-h-[68vh] w-full flex-col overflow-hidden rounded-md border border-brand-primary/40 bg-bg-deep/97 shadow-2xl shadow-black/80 animate-in slide-in-from-bottom-2 fade-in duration-150">
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            <Section
              icon={Swords}
              title="Competitiva"
              subtitle="Busca por função"
              active={active === "competitiva"}
              onToggle={() => setActive("competitiva")}
            >
              <p className="mb-2.5 font-body text-sm leading-relaxed text-text-muted">
                Escolha as funções que topa jogar. Formamos o grupo e o bot convida
                todo mundo.
              </p>
              <ul className="space-y-1">
                {ROLES.map((r) => {
                  const on = roles.has(r.id);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => toggleRole(r.id)}
                        className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border px-2.5 py-1.5 text-left transition-colors ${
                          on
                            ? "border-brand-primary bg-brand-primary/10"
                            : "border-border-subtle bg-bg-elevated hover:border-brand-primary/50"
                        }`}
                      >
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded-sm font-display text-sm font-bold ${
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
              <select
                value={gameMode}
                onChange={(e) => setGameMode(e.target.value as QueueGameMode)}
                className="mt-2.5 w-full rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated px-2.5 py-1.5 font-body text-sm text-text-body"
                aria-label="Modo de jogo"
              >
                {GAME_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Section>

            <Section
              icon={Users}
              title="Salas Personalizadas"
              subtitle="Crie ou entre num lobby"
              active={active === "salas"}
              onToggle={() => setActive("salas")}
            >
              <p className="mb-2.5 font-body text-sm leading-relaxed text-text-muted">
                Monte uma sala com suas regras (o bot cria e convida) ou navegue pelas
                salas abertas.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <LinkOrLogin isVisitor={isVisitor} href="/criar-lobby" icon={Plus} label="Criar" variant="primary" />
                <LinkOrLogin isVisitor={isVisitor} href="/lobbies" icon={Compass} label="Navegar" variant="secondary" />
              </div>
            </Section>

            <Section
              icon={Crown}
              title="Ranked com PRO"
              subtitle="Ranking oficial do Dota"
              active={active === "pro"}
              onToggle={() => setActive("pro")}
            >
              <p className="mb-2.5 font-body text-sm leading-relaxed text-text-muted">
                Entre na fila de um PRO. Ele organiza o grupo e vocês sobem MMR juntos no
                ranking oficial. Exige 1 ficha + 1 permissão.
              </p>
              <LinkOrLogin isVisitor={isVisitor} href="/ranked-com-pro" icon={Crown} label="Ver PROs na fila" variant="primary" full />
            </Section>
          </div>

          {/* Buscar Partida — só na competitiva (rodapé do painel, acima do botão base) */}
          {active === "competitiva" && (
            <div className="border-t border-border-subtle p-2 space-y-1.5">
              {error && (
                <p className="rounded border border-error/30 bg-error/5 px-2.5 py-1.5 font-mono text-sm text-error">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={handleBuscar}
                disabled={pending}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover px-4 py-2.5 font-display text-base font-bold uppercase tracking-[0.15em] text-text-display transition-all hover:brightness-110 disabled:opacity-60"
              >
                {pending ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} aria-hidden="true" />}
                Buscar Partida
              </button>
            </div>
          )}
        </div>
      )}

      {/* Botão base "Jogar Dota" — sempre visível, define a largura do menu */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-md border-2 border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover px-6 font-display text-lg font-bold uppercase tracking-[0.25em] text-text-display shadow-lg shadow-[var(--color-play-primary-glow)] transition-all hover:scale-[1.02] xl:h-16 xl:text-xl"
      >
        <Play size={22} fill="currentColor" aria-hidden="true" />
        <span>Jogar Dota</span>
        <ChevronDown
          size={18}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform [transition-duration:var(--motion-duration-hero)] group-hover:translate-x-full"
          aria-hidden="true"
        />
      </button>

      <PermissionQuizModal
        open={showQuiz}
        modalidade="buscar partida"
        onClose={() => setShowQuiz(false)}
        onGranted={() => {
          setShowQuiz(false);
          handleBuscar();
        }}
      />
    </div>
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
        className="flex w-full items-center gap-2.5 px-2.5 py-2.5 text-left transition-colors hover:bg-bg-elevated/80"
      >
        <Icon size={16} className={active ? "text-brand-primary" : "text-text-muted"} aria-hidden="true" />
        <span className="flex-1 min-w-0">
          <span className="block font-display text-sm font-bold uppercase tracking-wide text-text-display">
            {title}
          </span>
          <span className="block font-body text-sm text-text-faded">{subtitle}</span>
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-text-faded transition-transform ${active ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {active && <div className="px-2.5 pb-2.5">{children}</div>}
    </section>
  );
}

function LinkOrLogin({
  isVisitor,
  href,
  icon: Icon,
  label,
  variant,
  full,
}: {
  isVisitor: boolean;
  href: string;
  icon: typeof Plus;
  label: string;
  variant: "primary" | "secondary";
  full?: boolean;
}) {
  const cls = `flex ${full ? "w-full" : ""} items-center justify-center gap-2 rounded-[var(--radius-md)] border px-2.5 py-2 font-display text-sm font-bold uppercase tracking-wide transition-colors ${
    variant === "primary"
      ? "border-brand-primary/60 bg-brand-primary/15 text-brand-primary hover:bg-brand-primary/25"
      : "border-border-subtle bg-bg-surface text-text-body hover:border-brand-primary/50"
  }`;

  if (isVisitor) {
    return (
      <button type="button" onClick={() => void signInWithDiscord()} className={cls}>
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
