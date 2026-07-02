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
import Image from "next/image";
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
  Play,
  ArrowLeft,
  Check,
  ChevronUp,
} from "lucide-react";
import { signInWithDiscord } from "@/app/login/actions";
import {
  enterQueue,
  getQueueStatus,
  heartbeatQueue,
  leaveQueue,
  updateQueueRoles,
  type QueueRole,
  type QueueGameMode,
} from "@/app/queue/actions";
import {
  enterPartyQueue,
  leavePartyQueue,
  updateMyPartyRoles,
} from "@/actions/party";
import { createClient } from "@/lib/supabase/client";
import { useQueueStatusRealtime } from "@/lib/realtime/use-queue-status-realtime";
import { QueueSearchersPanel } from "@/components/queue/queue-searchers-panel";
import { ShaderSmoke } from "@/components/ui/shader-smoke";
import type { SmokeAsset } from "@/lib/cosmetics";
import { PermissionQuizModal } from "@/components/quiz/permission-quiz-modal";
import { setPlayMenuState, type PlayMenuState } from "@/lib/play-menu-preference";
import { ROLES, GAME_MODES } from "@/lib/queue/constants";
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

// Já estamos numa página de partida? Guarda por PREFIXO (qualquer id: dota_match_id,
// steam_lobby_id ou UUID) — o ready-check e o PlayMenu usam ids diferentes pra MESMA
// partida, e comparar id específico fazia os dois brigarem em loop. Cobre o path com
// ou sem prefixo de locale (ex.: /partida/... e /pt/partida/...).
function onMatchRoute(): boolean {
  return typeof window !== "undefined" && /\/partida\//.test(window.location.pathname);
}

interface Props {
  isVisitor: boolean;
  initial: PlayMenuState;
  /** Em grupo? Buscar coloca TODO o grupo na fila (mesmo time). */
  inParty?: boolean;
  /** Fumaça equipada (cosmético) — cores do shader no card de busca. */
  smokeTheme?: SmokeAsset | null;
}

export function PlayMenu({
  isVisitor,
  initial,
  inParty = false,
  smokeTheme = null,
}: Props) {
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

  // Competitiva — funções/modos RESTAURADOS do cookie (Pedro 2026-07-01): o jogador
  // reencontra a última seleção ao abrir a busca, sem remarcar toda vez.
  const [roles, setRoles] = useState<Set<QueueRole>>(new Set(initial.r ?? []));
  // Multi-modo (Pedro 2026-06-30): marca/desmarca; ao menos 1 ativo. Quem marca os
  // dois entra nas duas filas e sai de ambas ao casar (1 linha por user no banco).
  const [gameModes, setGameModes] = useState<QueueGameMode[]>(
    initial.g && initial.g.length > 0 ? initial.g : ["all_pick"]
  );
  const toggleGameMode = (m: QueueGameMode) =>
    setGameModes((prev) =>
      prev.includes(m)
        ? prev.length > 1
          ? prev.filter((x) => x !== m)
          : prev
        : [...prev, m]
    );
  const [error, setError] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [pending, startTransition] = useTransition();
  const [searching, setSearching] = useState(false);
  const [elapsed, setElapsed] = useState(0); // segundos da busca atual (contador na bottom-bar)
  // Painel "quem está findando" no contador de busca — EXPANDIDO por padrão.
  const [searchPanelOpen, setSearchPanelOpen] = useState(true);
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
  // Inclui funções/modos escolhidos → a próxima busca já vem com a seleção salva.
  useEffect(() => {
    void setPlayMenuState({
      s: phase,
      v: view,
      l: lobbyId,
      a: active,
      r: Array.from(roles),
      g: gameModes,
    });
  }, [phase, view, lobbyId, active, roles, gameModes]);

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
        // Redireciona pra partida — EXCETO se JÁ estamos numa rota /partida/.
        // A guarda é por PREFIXO (qualquer id), não pelo matchedLobbyId específico:
        // o ready-check redireciona pra /partida/<dota_match_id> (ID da Valve), enquanto
        // aqui o id é o UUID do lobby. Comparar só o UUID fazia os dois navegadores
        // brigarem e o usuário ficava em loop entre as duas URLs da MESMA partida.
        if (!onMatchRoute()) {
          router.push(`/partida/${st.matchedLobbyId}`);
        }
      } else if (st.status === "waiting") {
        // FIND PERSISTE NO REFRESH: a busca continua viva no servidor (match_queue
        // waiting). Restaura o estado "searching" e o contador a partir de joinedAt
        // (waitingSeconds vem do servidor) — o tempo segue de onde parou. Só o X
        // (handleCancelSearch → leaveQueue) cancela; refresh/navegação não cancelam.
        setElapsed(st.waitingSeconds);
        setSearching(true);
      }
    });
    return () => {
      active = false;
    };
  }, [isVisitor, router]);

  // Sincroniza o status da fila a partir do servidor: matched → redireciona;
  // saiu da fila (cancelada) → encerra a busca. Disparado pelo realtime de status.
  const syncQueueStatus = useCallback(async () => {
    const st = await getQueueStatus();
    if (st.status === "matched" && st.matchedLobbyId) {
      setSearching(false);
      setActiveMatchId(st.matchedLobbyId);
      // Mesma guarda por prefixo do efeito de mount: se já estamos numa rota
      // /partida/, NÃO re-empurra (senão os heartbeats de liveness re-disparariam
      // este sync e puxariam o usuário do <dota_match_id> de volta pro <UUID> em loop).
      if (!onMatchRoute()) {
        router.push(`/partida/${st.matchedLobbyId}`);
      }
    } else if (st.status === "waiting") {
      // Passivo: outro membro do grupo iniciou a busca → reflete o "buscando"
      // (contador + heartbeat) mesmo sem eu ter clicado.
      setElapsed(st.waitingSeconds);
      setSearching(true);
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
      // EM GRUPO: qualquer membro que buscar coloca TODOS na fila (mesmo time).
      // Persiste as funções escolhidas como as minhas no grupo antes de buscar.
      if (inParty) {
        if (roles.size > 0) await updateMyPartyRoles(Array.from(roles));
        const pres = await enterPartyQueue(gameModes);
        if (!pres.success) {
          setError(pres.error);
          return;
        }
        if (pres.matchedLobbyId) {
          router.push(`/partida/${pres.matchedLobbyId}`);
          return;
        }
        setElapsed(0);
        setSearching(true);
        setSearchPanelOpen(true);
        setPhase("button");
        return;
      }

      const res = await enterQueue({ roles: Array.from(roles), gameModes });
      if (!res.success) {
        if (res.code === "need_permission") {
          setShowQuiz(true);
          return;
        }
        // Servidor barrou: já está em partida (estado do client estava defasado) →
        // ressincroniza pra o botão virar "Voltar à partida" e mostra o motivo.
        if (res.code === "in_match") {
          void syncQueueStatus();
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
      // bottom-bar (contador + painel), liberando a plataforma pra navegação.
      setElapsed(0);
      setSearching(true);
      setSearchPanelOpen(true);
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

  // HEARTBEAT de liveness (migration 063): enquanto busca, prova atividade a cada
  // 15s. Parar de pingar (fechar o app) faz o servidor cancelar a fila em ~45-60s
  // (anti-fantasma). Pinga já no início e ao voltar a aba/conexão. NÃO chama
  // leaveQueue ao desmontar — refresh/navegação mantêm a busca viva.
  useEffect(() => {
    if (!searching) return;
    void heartbeatQueue();
    const iv = setInterval(() => void heartbeatQueue(), 15000);
    const onWake = () => {
      if (document.visibilityState === "visible") void heartbeatQueue();
    };
    window.addEventListener("online", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      clearInterval(iv);
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [searching]);

  function handleCancelSearch() {
    startTransition(async () => {
      // Cancela a fila de forma robusta (fix do bug da "busca presa"): chama AS DUAS
      // — leaveQueue (minha linha) e leavePartyQueue (que no SQL agora cancela minha
      // entry solo OU a party toda). Cobre solo, grupo, e um inParty desatualizado.
      await leaveQueue();
      await leavePartyQueue();
      // Rede de segurança: só encerra a busca na UI se o servidor CONFIRMAR que saí.
      // Sem isso, um cancelamento que errou o alvo escondia o painel e a entry
      // sobrevivente ressuscitava a busca no próximo mount.
      const st = await getQueueStatus();
      if (st.status === "waiting") {
        setError(t("cancelFailed"));
        return;
      }
      setSearching(false);
      setSearchPanelOpen(false);
    });
  }

  // Troca de função enquanto busca (1 função ou todas). Atualiza a MESMA entry na
  // fila (updateQueueRoles) — preserva joined_at e o TEMPO de busca, sem custo de
  // permissão. A nova composição pode fechar partida na hora.
  function applyQueueRoles(next: QueueRole[]) {
    setRoles(new Set(next));
    startTransition(async () => {
      const res = await updateQueueRoles(next);
      if (!res.success) {
        setError(res.error);
        return;
      }
      if (res.matchedLobbyId) {
        setSearching(false);
        setSearchPanelOpen(false);
        router.push(`/partida/${res.matchedLobbyId}`);
      }
      // NÃO reseta o contador: é a mesma entry (update in place) → tempo preservado.
    });
  }

  // Toggle de função DURANTE a busca: marca OU desmarca mantendo as demais (mesma
  // simetria do menu). Nunca deixa a fila sem nenhuma função (mínimo 1).
  function toggleQueueRole(r: QueueRole) {
    const next = new Set(roles);
    if (next.has(r)) {
      if (next.size <= 1) return; // sempre ao menos 1 função na fila
      next.delete(r);
    } else {
      next.add(r);
    }
    applyQueueRoles(Array.from(next));
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
        // Interface ÚNICA: painel "quem está findando" (retrátil) + contador. Fumaça
        // por SHADER atrás (ShaderSmoke) enquanto busca — flagship premium tier-1.
        <div className="pointer-events-auto relative w-[340px] max-w-[calc(100vw-2rem)]">
          <ShaderSmoke
            mid={smokeTheme?.mid ?? "#00C466"}
            hot={smokeTheme?.hot ?? "#e0b64e"}
            intensity={1.3}
            speed={1.8}
            // Tamanho FIXO (não muda ao expandir/retrair) via inline style — invade até
            // ~meio da tela pra esquerda, emanando da base direita. Pedro 2026-07-01.
            className=""
            style={{ left: "-780px", right: "0", bottom: "-2rem", height: "680px" }}
          />
          <div className="relative z-[1] w-full overflow-hidden rounded-md border-2 border-play-primary bg-bg-deep/70 backdrop-blur-md shadow-lg shadow-[var(--color-play-primary-glow)]">
          {searchPanelOpen && (
            <div className="border-b border-border-subtle p-2.5 animate-in slide-in-from-bottom-2 fade-in duration-150">
              <QueueSearchersPanel
                bare
                onToggleRole={toggleQueueRole}
                onPickAll={() => applyQueueRoles(ROLES.map((r) => r.id))}
                myRoles={Array.from(roles)}
              />
            </div>
          )}
          <div className="flex h-11 items-center gap-3 px-4 xl:h-12">
            <Loader2 size={22} className="animate-spin text-play-primary" aria-hidden="true" />
            <span className="flex flex-col leading-tight">
              <span className="font-display text-xs uppercase tracking-[0.2em] text-text-muted">
                {t("searching")}
              </span>
              <span className="font-display text-xl font-bold tabular-nums tracking-wider text-text-display xl:text-2xl">
                {mmss(elapsed)}
              </span>
            </span>
            {/* Retrair/expandir o painel da fila. */}
            <button
              type="button"
              onClick={() => setSearchPanelOpen((o) => !o)}
              aria-label={t("viewQueue")}
              aria-expanded={searchPanelOpen}
              className={`ml-auto rounded-sm border p-2 transition-colors ${
                searchPanelOpen
                  ? "border-play-primary/50 text-play-primary"
                  : "border-border-subtle text-text-muted hover:border-play-primary/50 hover:text-play-primary"
              }`}
            >
              <ChevronUp
                size={18}
                className={`transition-transform ${searchPanelOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={handleCancelSearch}
              disabled={pending}
              aria-label={t("cancelSearch")}
              className="rounded-sm border border-border-subtle p-2 text-text-muted transition-colors hover:border-error/50 hover:text-error disabled:opacity-60"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          </div>
        </div>
      )}
      {/* Em partida (fila matched) → "Voltar à partida": navega direto, não abre o drawer. */}
      {phase === "button" && !searching && activeMatchId && (
        <button
          type="button"
          onClick={() => router.push(`/partida/${activeMatchId}`)}
          className="pointer-events-auto group relative flex h-11 items-center gap-3 overflow-hidden rounded-md border-2 border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover px-8 font-display text-lg font-bold uppercase tracking-[0.25em] text-text-display shadow-lg shadow-[var(--color-play-primary-glow)] transition-all hover:scale-[1.02] xl:h-12 xl:px-12 xl:text-xl 2xl:h-14 2xl:px-16 2xl:text-2xl"
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
          // Respiro lateral do botão (o card de busca encosta na direita; o botão, não).
          // O respiro do fundo vem do container. Inline pra não depender do JIT do
          // Tailwind. Fiel ao dota 2 menu.png. Pedro 2026-07-01.
          style={{ marginRight: "2.5rem" }}
          className="pointer-events-auto group relative flex h-11 items-center gap-3 overflow-hidden rounded-md border-2 border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover px-8 font-display text-lg font-bold uppercase tracking-[0.25em] text-text-display shadow-lg shadow-[var(--color-play-primary-glow)] transition-all hover:scale-[1.02] xl:h-12 xl:px-12 xl:text-xl 2xl:h-14 2xl:px-16 2xl:text-2xl"
        >
          {hasSala ? <ArrowLeft size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
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
              gameModes={gameModes}
              toggleGameMode={toggleGameMode}
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

function MenuView({
  active,
  setActive,
  roles,
  toggleRole,
  selectAllRoles,
  gameModes,
  toggleGameMode,
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
  gameModes: QueueGameMode[];
  toggleGameMode: (m: QueueGameMode) => void;
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

  // Demanda por função e "quem está findando" vivem no QueueSearchersPanel (acima).
  // Aqui a lista de funções é só SELEÇÃO (sem duplicar os números do painel).
  return (
    <>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <Section icon={Swords} title={t("competitiva")} subtitle={t("competitivaSubtitle")} active={active === "competitiva"} onToggle={() => setActive("competitiva")}>
          <p className="mb-2.5 font-body text-sm leading-relaxed text-text-muted">
            {t("competitivaDesc")}
          </p>
          {/* Painel "quem está findando" — mostra o modo que cada um busca. */}
          <QueueSearchersPanel />
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
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => toggleRole(r.id)}
                    className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border px-2.5 py-1.5 text-left transition-colors ${
                      on ? "border-brand-primary bg-brand-primary/10" : "border-border-subtle bg-bg-elevated hover:border-brand-primary/50"
                    }`}
                  >
                    {/* Ícone da função (pos-N, estilo dota2protracker). */}
                    <Image
                      src={`/dota/positions/pos-${r.pos}.png`}
                      alt=""
                      width={20}
                      height={20}
                      className="size-5 shrink-0 object-contain"
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate font-body text-sm text-text-body">{t(r.key)}</span>
                    {/* Marca de selecionado (a demanda vive no painel acima). */}
                    {on && <Check size={15} className="shrink-0 text-brand-primary" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {/* Modos de jogo — MULTI-seleção (marque ao menos 1). Quem marca os dois
              entra nas duas filas. */}
          <div className="mt-2.5 space-y-1.5">
            <span className="font-display text-xs font-semibold uppercase tracking-wide text-text-faded">
              {t("gameModeLabel")}
            </span>
            {GAME_MODES.map((m) => {
              const on = gameModes.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleGameMode(m.id)}
                  aria-pressed={on}
                  className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border px-2.5 py-1.5 text-left transition-colors ${
                    on
                      ? "border-brand-primary bg-brand-primary/10"
                      : "border-border-subtle bg-bg-elevated hover:border-brand-primary/50"
                  }`}
                >
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${
                      on ? "border-brand-primary bg-brand-primary/20" : "border-border-strong"
                    }`}
                  >
                    {on && <Check size={12} className="text-brand-primary" aria-hidden="true" />}
                  </span>
                  <span className="flex-1 truncate font-body text-sm text-text-body">{t(m.key)}</span>
                </button>
              );
            })}
          </div>
          {/* Mais funções marcadas = fila mais rápida (a demanda detalhada está no painel). */}
          <p className="mt-2.5 font-body text-xs text-text-faded">{t("moreRolesFaster")}</p>
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
          {/* MESMO tamanho/estilo do botão "Jogar Dota" (Pedro 2026-07-01): a
              sensação é que o menu abre e o próprio botão troca as palavras. */}
          <button
            type="button"
            onClick={onBuscar}
            disabled={pending}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-md border-2 border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover px-8 font-display text-lg font-bold uppercase tracking-[0.25em] text-text-display shadow-lg shadow-[var(--color-play-primary-glow)] transition-all hover:brightness-110 disabled:opacity-60 xl:h-12 xl:text-xl"
          >
            {pending ? <Loader2 size={22} className="animate-spin" /> : <Play size={22} aria-hidden="true" />}
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
