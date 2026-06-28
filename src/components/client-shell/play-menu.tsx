"use client";

// PlayMenu — "Jogar Dota". 3 estados (persistidos em cookie, sobrevivem à navegação):
//   button    → só o botão "Jogar Dota" na bottom-bar.
//   expanded  → drawer lateral full-height (abre por completo, sem ofuscar o fundo).
//   collapsed → aba fina na borda direita (click reabre). Click FORA do drawer retrai.
//
// Navegação interna: menu (modalidades) → Salas Navegar (lista) → sala (LobbyRoom embedded).
// Criar sala = popup grande centralizado. A view da sala usa um drawer MAIS LARGO.
// Pedro 2026-06-03.

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  ArrowLeft,
  Check,
} from "lucide-react";
import { signInWithDiscord } from "@/app/login/actions";
import {
  enterQueue,
  getQueueStatus,
  leaveQueue,
  type QueueRole,
  type QueueGameMode,
} from "@/app/queue/actions";
import { createClient } from "@/lib/supabase/client";
import { useQueueLiveStats } from "@/lib/realtime/use-queue-live-stats";
import { useQueueStatusRealtime } from "@/lib/realtime/use-queue-status-realtime";
import { PermissionQuizModal } from "@/components/quiz/permission-quiz-modal";
import { setPlayMenuState, type PlayMenuState } from "@/lib/play-menu-preference";
import {
  fetchOpenLobbies,
  fetchLobbyRoom,
  type LobbyListItem,
  type LobbyRoomData,
} from "@/app/lobbies/fetch-actions";
import { LobbyRoom } from "@/app/lobbies/[id]/lobby-room";
import { LobbiesContent } from "@/app/lobbies/lobbies-content";
import { CriarLobbyForm } from "@/app/criar-lobby/criar-lobby-form";

type Modalidade = "competitiva" | "salas" | "pro";
type View = "menu" | "lista" | "sala";

const ROLES: { id: QueueRole; pos: string; key: string }[] = [
  { id: "safelane", pos: "1", key: "roleSafelane" },
  { id: "midlane", pos: "2", key: "roleMidlane" },
  { id: "offlane", pos: "3", key: "roleOfflane" },
  { id: "support", pos: "4", key: "roleSupport" },
  { id: "support_dedicated", pos: "5", key: "roleSupportDedicated" },
];

const GAME_MODES: { id: QueueGameMode; key: string }[] = [
  { id: "all_pick", key: "modeAllPick" },
  { id: "captains_mode", key: "modeCaptains" },
  { id: "random_draft", key: "modeRandomDraft" },
  { id: "single_draft", key: "modeSingleDraft" },
];

interface Props {
  isVisitor: boolean;
  initial: PlayMenuState;
}

export function PlayMenu({ isVisitor, initial }: Props) {
  const router = useRouter();
  const t = useTranslations("playMenu");
  const drawerRef = useRef<HTMLElement>(null);

  // "collapsed" (estado de aba) foi descontinuado → normaliza pra "button" no init.
  const [phase, setPhase] = useState<PlayMenuState["s"]>(
    initial.s === "collapsed" ? "button" : initial.s
  );
  const [view, setView] = useState<View>(initial.v);
  const [active, setActive] = useState<Modalidade>(initial.a);
  const [lobbyId, setLobbyId] = useState<string | null>(initial.l);

  // Competitiva
  const [roles, setRoles] = useState<Set<QueueRole>>(new Set());
  const [gameMode, setGameMode] = useState<QueueGameMode>("all_pick");
  const [error, setError] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [pending, startTransition] = useTransition();
  const [searching, setSearching] = useState(false);
  const [elapsed, setElapsed] = useState(0); // segundos da busca atual (contador na bottom-bar)
  // Partida ativa do usuário (fila matched). Bloqueia nova busca e troca o botão por
  // "Voltar à partida" (navega direto pra /partida/[id] em vez de abrir o drawer).
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  // UUID do user logado — alimenta o realtime de status (filter user_id). null = visitante.
  const [userId, setUserId] = useState<string | null>(null);

  // Salas
  const [lobbies, setLobbies] = useState<LobbyListItem[]>([]);
  const [lobbyData, setLobbyData] = useState<LobbyRoomData | null>(null);
  const [loadingSalas, startSalas] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(false);

  // Persiste o estado no cookie sempre que muda (sobrevive à navegação entre rotas).
  useEffect(() => {
    void setPlayMenuState({ s: phase, v: view, l: lobbyId, a: active });
  }, [phase, view, lobbyId, active]);

  // Ao montar: re-busca a sala aberta (se o cookie apontava pra uma).
  useEffect(() => {
    if (view === "sala" && lobbyId) {
      void fetchLobbyRoom(lobbyId).then((d) => {
        if (d) setLobbyData(d);
        else {
          // Sala sumiu (usuário saiu / foi encerrada) → volta pro menu.
          setView("menu");
          setLobbyId(null);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click FORA do drawer (quando expandido) → fecha pro botão. Se houver lobby ativo,
  // o botão vira "Voltar à sala" (Pedro 2026-06-03 — sem aba retraída).
  // IMPORTANTE: pausado enquanto o popup de Configurações da Sala está aberto — senão
  // cliques nos selects/checkboxes do popup (que ficam fora do drawer) fechariam o menu
  // e travariam a interação com as opções.
  useEffect(() => {
    if (phase !== "expanded" || showCreate || showQuiz) return;
    function onDown(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setPhase("button");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [phase, showCreate, showQuiz]);

  // Ao montar: descobre se o usuário já está em partida (fila matched) — pra mostrar
  // "Voltar à partida" mesmo que ele tenha navegado pra outra tela e voltado ao HUB.
  // Também resolve o userId (pro realtime de status filtrar a própria entry).
  useEffect(() => {
    if (isVisitor) return;
    let active = true;
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (active) setUserId(data.user?.id ?? null);
      });
    void getQueueStatus().then((st) => {
      if (!active) return;
      if (st.status === "matched" && st.matchedLobbyId) {
        setActiveMatchId(st.matchedLobbyId);
      }
    });
    return () => {
      active = false;
    };
  }, [isVisitor]);

  // Sincroniza o status da fila a partir do servidor: matched → redireciona;
  // saiu da fila (cancelada) → encerra a busca. Disparado pelo realtime de status.
  const syncQueueStatus = useCallback(async () => {
    const st = await getQueueStatus();
    if (st.status === "matched" && st.matchedLobbyId) {
      setSearching(false);
      setActiveMatchId(st.matchedLobbyId);
      router.push(`/partida/${st.matchedLobbyId}`);
    } else if (!st.inQueue) {
      setSearching(false);
    }
  }, [router]);

  // PUSH do status da própria entry (substitui o polling de 3s). Qualquer mudança
  // na match_queue do user (partida formada via try_form_match, fila cancelada)
  // refetcha o status. RLS self garante que só recebe push da própria linha.
  useQueueStatusRealtime(userId, syncQueueStatus);

  function toggleRole(r: QueueRole) {
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  // "Qualquer função": marca as 5 de uma vez (fila mais rápida — mais flexível).
  function selectAllRoles() {
    setRoles(new Set(ROLES.map((r) => r.id)));
  }

  function handleBuscar() {
    if (isVisitor) {
      void signInWithDiscord();
      return;
    }
    // Já está em partida → não busca outra; leva de volta pra ela.
    if (activeMatchId) {
      router.push(`/partida/${activeMatchId}`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await enterQueue({ roles: Array.from(roles), gameMode });
      if (!res.success) {
        if (res.code === "need_permission") {
          setShowQuiz(true);
          return;
        }
        setError(res.error);
        return;
      }
      // Entrou na fila. Se ESTE foi o jogador que fechou o X, já vai pra partida.
      if (res.matchedLobbyId) {
        router.push(`/partida/${res.matchedLobbyId}`);
        return;
      }
      // Buscando: retrai o drawer pro estado "button" — a busca passa a viver na
      // bottom-bar (contador + X), liberando a plataforma pra navegação enquanto espera.
      setElapsed(0);
      setSearching(true);
      setPhase("button");
    });
  }

  // Contador de tempo da busca (mm:ss) — o reset pra 0 acontece no handleBuscar
  // (fora do effect, pra não cair na regra react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!searching) return;
    const iv = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [searching]);

  function handleCancelSearch() {
    startTransition(async () => {
      await leaveQueue();
      setSearching(false);
    });
  }

  function openLista() {
    if (isVisitor) {
      void signInWithDiscord();
      return;
    }
    startSalas(async () => {
      setLobbies(await fetchOpenLobbies());
      setView("lista");
    });
  }

  function openSala(id: string) {
    startSalas(async () => {
      const d = await fetchLobbyRoom(id);
      if (d) {
        setLobbyData(d);
        setLobbyId(id);
        setView("sala");
      }
    });
  }

  function refetchSala(): Promise<void> | undefined {
    if (!lobbyId) return;
    // Retorna a Promise: o LobbyRoom AGUARDA o estado novo dentro da transition
    // do optimistic update — reconciliação sem flicker (Pedro 2026-06-11).
    return fetchLobbyRoom(lobbyId).then((d) => {
      if (d) setLobbyData(d);
    });
  }

  const inSala = view === "sala" && !!lobbyData;
  // Há um lobby ativo? (mesmo com o menu fechado → botão vira "Voltar à sala").
  const hasSala = view === "sala" && !!lobbyId;
  // Sala usa um drawer MAIS LARGO (Pedro: visualização maior que o normal).
  // Mobile: largura cheia (w-full) pra não estourar a tela; sm+ volta às larguras fixas.
  const widthCls = inSala
    ? "w-full sm:w-[600px] xl:w-[720px]"
    : "w-full sm:w-[400px] xl:w-[460px]";

  return (
    <>
      {/* Estado BUTTON — durante a busca vira CONTADOR + X (cancelar); senão o
          botão "Jogar Dota" (ou "Voltar à sala" se houver lobby ativo). */}
      {phase === "button" && searching && (
        <div className="pointer-events-auto flex h-14 items-center gap-3 rounded-md border-2 border-play-primary bg-bg-deep px-6 shadow-lg shadow-[var(--color-play-primary-glow)] xl:h-16 xl:px-8 2xl:h-20">
          <Loader2 size={22} className="animate-spin text-play-primary" aria-hidden="true" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-xs uppercase tracking-[0.2em] text-text-muted">
              {t("searching")}
            </span>
            <span className="font-display text-xl font-bold tabular-nums tracking-wider text-text-display xl:text-2xl">
              {mmss(elapsed)}
            </span>
          </span>
          <button
            type="button"
            onClick={handleCancelSearch}
            disabled={pending}
            aria-label={t("cancelSearch")}
            className="ml-1 rounded-sm border border-border-subtle p-2 text-text-muted transition-colors hover:border-error/50 hover:text-error disabled:opacity-60"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      )}
      {/* Em partida (fila matched) → "Voltar à partida": navega direto, não abre o drawer. */}
      {phase === "button" && !searching && activeMatchId && (
        <button
          type="button"
          onClick={() => router.push(`/partida/${activeMatchId}`)}
          className="pointer-events-auto group relative flex h-14 items-center gap-3 overflow-hidden rounded-md border-2 border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover px-8 font-display text-lg font-bold uppercase tracking-[0.25em] text-text-display shadow-lg shadow-[var(--color-play-primary-glow)] transition-all hover:scale-[1.02] xl:h-16 xl:px-12 xl:text-xl 2xl:h-20 2xl:px-16 2xl:text-2xl"
        >
          <ArrowLeft size={22} aria-hidden="true" />
          <span>{t("backToMatch")}</span>
          <span
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform [transition-duration:var(--motion-duration-hero)] group-hover:translate-x-full"
            aria-hidden="true"
          />
        </button>
      )}
      {phase === "button" && !searching && !activeMatchId && (
        <button
          type="button"
          onClick={() => setPhase("expanded")}
          className="pointer-events-auto group relative flex h-14 items-center gap-3 overflow-hidden rounded-md border-2 border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover px-8 font-display text-lg font-bold uppercase tracking-[0.25em] text-text-display shadow-lg shadow-[var(--color-play-primary-glow)] transition-all hover:scale-[1.02] xl:h-16 xl:px-12 xl:text-xl 2xl:h-20 2xl:px-16 2xl:text-2xl"
        >
          {hasSala ? <ArrowLeft size={22} aria-hidden="true" /> : <Search size={22} aria-hidden="true" />}
          <span>{hasSala ? t("backToRoom") : t("play")}</span>
          <span
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform [transition-duration:var(--motion-duration-hero)] group-hover:translate-x-full"
            aria-hidden="true"
          />
        </button>
      )}

      {/* Estado EXPANDED — drawer full-height (sem ofuscar o fundo) */}
      {phase === "expanded" && (
        <aside
          ref={drawerRef}
          role="dialog"
          aria-label={t("play")}
          className={`pointer-events-auto fixed right-0 top-12 bottom-0 z-[var(--z-system)] flex ${widthCls} flex-col border-l border-t border-brand-primary/40 bg-bg-deep shadow-2xl shadow-black/80 animate-in slide-in-from-right duration-200 xl:top-14`}
        >
          <header className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
            {view === "menu" ? (
              <span className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide text-text-display">
                <Swords size={18} className="text-play-primary" aria-hidden="true" />
                {t("play")}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setView(view === "sala" ? "lista" : "menu")}
                className="flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wide text-text-faded hover:text-text-body transition-colors"
              >
                <ArrowLeft size={15} /> {t("back")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setPhase("button")}
              aria-label={t("close")}
              className="rounded-sm p-1 text-text-faded hover:bg-bg-elevated hover:text-text-body transition-colors"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          {view === "menu" && (
            <MenuView
              active={active}
              setActive={setActive}
              roles={roles}
              toggleRole={toggleRole}
              selectAllRoles={selectAllRoles}
              gameMode={gameMode}
              setGameMode={setGameMode}
              isVisitor={isVisitor}
              error={error}
              pending={pending}
              onBuscar={handleBuscar}
              onCriar={() => setShowCreate(true)}
              onNavegar={openLista}
              onPro={() => router.push("/ranked-com-pro")}
              loadingSalas={loadingSalas}
            />
          )}

          {view === "lista" && (
            // Browser de salas unificado (estilo client Dota) — mesma UI da
            // página /lobbies. min-h-0 pro scroll interno da tabela funcionar.
            <div className="min-h-0 flex-1">
              <LobbiesContent
                lobbies={lobbies}
                loading={loadingSalas}
                onSelectLobby={openSala}
                onCreate={() => setShowCreate(true)}
                onRefresh={openLista}
              />
            </div>
          )}

          {view === "sala" && lobbyData && (
            <div className="flex-1 overflow-y-auto">
              <LobbyRoom
                lobby={lobbyData.lobby}
                players={lobbyData.players}
                currentUserId={lobbyData.currentUserId}
                isLeader={lobbyData.isLeader}
                leaderUsername={lobbyData.leaderUsername}
                leaderHero={lobbyData.leaderHero}
                onMutate={refetchSala}
                onEdit={() => {
                  setEditing(true);
                  setShowCreate(true);
                }}
              />
            </div>
          )}
        </aside>
      )}

      {/* Popup CENTRAL — "CONFIGURAÇÕES DA SALA" (ref: configuração lobby.png):
          toma quase todo o viewport, dimmer deixa o chrome visível atrás. */}
      {showCreate && (
        <div className="pointer-events-auto fixed inset-0 z-[var(--z-takeover)] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-sm animate-in fade-in duration-150 sm:p-8">
          <div className="max-h-full w-full max-w-5xl overflow-y-auto rounded-sm border border-border-strong bg-bg-base p-5 shadow-[var(--shadow-cinematic)] animate-in zoom-in-95 duration-150">
            <div className="mb-4 flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="font-display-condensed text-2xl uppercase leading-none text-text-display">
                {t("roomSettings")}
              </h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                aria-label={t("close")}
                className="rounded-sm p-1 text-text-faded hover:bg-bg-elevated hover:text-text-body transition-colors"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <CriarLobbyForm
              editLobbyId={editing && lobbyData ? lobbyData.lobby.id : undefined}
              defaults={
                editing && lobbyData
                  ? { name: lobbyData.lobby.name, gameMode: lobbyData.lobby.gameMode }
                  : undefined
              }
              onClose={() => {
                setShowCreate(false);
                setEditing(false);
              }}
              onCreated={(id) => {
                setShowCreate(false);
                if (editing) {
                  setEditing(false);
                  refetchSala();
                } else {
                  setPhase("expanded");
                  openSala(id);
                }
              }}
            />
          </div>
        </div>
      )}

      <PermissionQuizModal
        open={showQuiz}
        modalidade={t("quizModalidade")}
        onClose={() => setShowQuiz(false)}
        onGranted={() => {
          setShowQuiz(false);
          handleBuscar();
        }}
      />
    </>
  );
}

/* ---------------- Menu (modalidades) ---------------- */

// Funções carentes pra fechar partida cheia: 2 jogadores por função (1 por time).
const ROLE_TARGET = 2;

function MenuView({
  active,
  setActive,
  roles,
  toggleRole,
  selectAllRoles,
  gameMode,
  setGameMode,
  isVisitor,
  error,
  pending,
  onBuscar,
  onCriar,
  onNavegar,
  onPro,
  loadingSalas,
}: {
  active: Modalidade;
  setActive: (m: Modalidade) => void;
  roles: Set<QueueRole>;
  toggleRole: (r: QueueRole) => void;
  selectAllRoles: () => void;
  gameMode: QueueGameMode;
  setGameMode: (m: QueueGameMode) => void;
  isVisitor: boolean;
  error: string | null;
  pending: boolean;
  onBuscar: () => void;
  onCriar: () => void;
  onNavegar: () => void;
  onPro: () => void;
  loadingSalas: boolean;
}) {
  const t = useTranslations("playMenu");

  // Demanda por função AO VIVO (push via queue_live_stats — migration 061). Sem polling.
  const { demand } = useQueueLiveStats();

  // O que falta pra fechar composição (cada função precisa de ROLE_TARGET jogadores).
  const deficits = ROLES.map((r) => ({
    key: r.key,
    missing: ROLE_TARGET - demand[r.id],
  })).filter((d) => d.missing > 0);

  return (
    <>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <Section icon={Swords} title={t("competitiva")} subtitle={t("competitivaSubtitle")} active={active === "competitiva"} onToggle={() => setActive("competitiva")}>
          <p className="mb-2.5 font-body text-sm leading-relaxed text-text-muted">
            {t("competitivaDesc")}
          </p>
          {/* Atalho: marca as 5 funções de uma vez (mais flexível = fila mais rápida). */}
          <button
            type="button"
            onClick={selectAllRoles}
            className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-gold/40 bg-gold/10 px-2.5 py-1.5 font-display text-sm font-bold uppercase tracking-wide text-gold transition-colors hover:bg-gold/20"
          >
            <Check size={14} aria-hidden="true" /> {t("anyRole")}
          </button>
          <ul className="space-y-1">
            {ROLES.map((r) => {
              const on = roles.has(r.id);
              const count = demand[r.id];
              // Função carente: ainda faltam jogadores pra fechar composição. Vira nudge.
              const needed = count < ROLE_TARGET;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => toggleRole(r.id)}
                    title={t("roleDemandTitle", { count })}
                    className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border px-2.5 py-1.5 text-left transition-colors ${
                      on ? "border-brand-primary bg-brand-primary/10" : "border-border-subtle bg-bg-elevated hover:border-brand-primary/50"
                    }`}
                  >
                    <span className={`flex size-5 shrink-0 items-center justify-center rounded-sm font-display text-sm font-bold ${on ? "bg-brand-primary text-bg-deep" : "bg-bg-surface text-text-muted"}`}>
                      {r.pos}
                    </span>
                    <span className="flex-1 truncate font-body text-sm text-text-body">{t(r.key)}</span>
                    {/* "precisa de você": só quando carente e o jogador ainda não marcou. */}
                    {needed && !on && (
                      <span className="shrink-0 font-display text-[0.65rem] font-bold uppercase tracking-wide text-gold">
                        {t("needYouHere")}
                      </span>
                    )}
                    {/* Demanda atual da função (verde = suprida, dourado = falta gente). */}
                    <span className={`flex shrink-0 items-center gap-1 font-display text-sm font-bold tabular-nums ${needed ? "text-gold" : "text-play-primary"}`}>
                      <Users size={12} aria-hidden="true" />
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <select
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value as QueueGameMode)}
            className="mt-2.5 w-full rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated px-2.5 py-1.5 font-body text-sm text-text-body"
            aria-label={t("gameModeLabel")}
          >
            {GAME_MODES.map((m) => (
              <option key={m.id} value={m.id}>{t(m.key)}</option>
            ))}
          </select>
          {/* Falta pra formar (nudge de composição) — ao vivo. */}
          <div className="mt-2.5 space-y-1">
            {deficits.length === 0 ? (
                <p className="flex items-center gap-1.5 font-body text-xs text-play-primary">
                  <span className="inline-block size-1.5 rounded-full bg-play-primary" aria-hidden="true" />
                  {t("compositionReady")}
                </p>
              ) : (
                <p className="font-body text-xs text-text-muted">
                  <span className="font-semibold text-gold">{t("missingToForm")}</span>{" "}
                  {deficits.map((d, i) => (
                    <span key={d.key}>
                      {i > 0 ? ", " : ""}
                      <span className="text-text-body">
                        {d.missing} {t(d.key)}
                      </span>
                    </span>
                  ))}
                </p>
              )}
            <p className="font-body text-xs text-text-faded">{t("moreRolesFaster")}</p>
          </div>
        </Section>

        <Section icon={Users} title={t("salas")} subtitle={t("salasSubtitle")} active={active === "salas"} onToggle={() => setActive("salas")}>
          <p className="mb-2.5 font-body text-sm leading-relaxed text-text-muted">
            {t("salasDesc")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn icon={Plus} label={t("create")} variant="primary" onClick={() => (isVisitor ? void signInWithDiscord() : onCriar())} />
            <ActionBtn icon={Compass} label={t("browse")} variant="secondary" loading={loadingSalas} onClick={onNavegar} />
          </div>
        </Section>

        <Section icon={Crown} title={t("pro")} subtitle={t("proSubtitle")} active={active === "pro"} onToggle={() => setActive("pro")}>
          <p className="mb-2.5 font-body text-sm leading-relaxed text-text-muted">
            {t("proDesc")}
          </p>
          <ActionBtn icon={Crown} label={t("viewPros")} variant="primary" full onClick={() => (isVisitor ? void signInWithDiscord() : onPro())} />
        </Section>
      </div>

      {active === "competitiva" && (
        <div className="border-t border-border-subtle p-3 space-y-1.5">
          {error && (
            <p className="rounded border border-error/30 bg-error/5 px-2.5 py-1.5 font-mono text-sm text-error">{error}</p>
          )}
          {/* Buscar: ao iniciar a busca o drawer retrai e o estado "searching" passa
              a viver na bottom-bar (contador + X). Aqui fica só o gatilho de busca. */}
          <button
            type="button"
            onClick={onBuscar}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover px-4 py-2.5 font-display text-base font-bold uppercase tracking-[0.15em] text-text-display transition-all hover:brightness-110 disabled:opacity-60"
          >
            {pending ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} aria-hidden="true" />}
            {t("searchMatch")}
          </button>
        </div>
      )}
    </>
  );
}

/* ---------------- helpers ---------------- */

// Formata segundos como mm:ss (contador da busca na bottom-bar).
function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
    <section className={`overflow-hidden rounded-[var(--radius-md)] border ${active ? "border-brand-primary/40 bg-bg-elevated/60" : "border-border-subtle bg-bg-elevated/30"}`}>
      <button type="button" onClick={onToggle} aria-expanded={active} className="flex w-full items-center gap-2.5 px-2.5 py-2.5 text-left transition-colors hover:bg-bg-elevated/80">
        <Icon size={16} className={active ? "text-brand-primary" : "text-text-muted"} aria-hidden="true" />
        <span className="flex-1 min-w-0">
          <span className="block font-display text-sm font-bold uppercase tracking-wide text-text-display">{title}</span>
          <span className="block font-body text-sm text-text-faded">{subtitle}</span>
        </span>
        <ChevronDown size={15} className={`shrink-0 text-text-faded transition-transform ${active ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {active && <div className="px-2.5 pb-2.5">{children}</div>}
    </section>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  variant,
  full,
  loading,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  variant: "primary" | "secondary";
  full?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  const cls = `flex ${full ? "w-full" : ""} items-center justify-center gap-2 rounded-[var(--radius-md)] border px-2.5 py-2 font-display text-sm font-bold uppercase tracking-wide transition-colors ${
    variant === "primary"
      ? "border-brand-primary/60 bg-brand-primary/15 text-brand-primary hover:bg-brand-primary/25"
      : "border-border-subtle bg-bg-surface text-text-body hover:border-brand-primary/50"
  }`;
  return (
    <button type="button" onClick={onClick} disabled={loading} className={cls}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} aria-hidden="true" />}
      {label}
    </button>
  );
}
