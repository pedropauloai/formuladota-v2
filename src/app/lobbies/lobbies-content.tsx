"use client";

// LobbiesContent — browser de salas no estilo do cliente Dota 2
// (ref: lobbys criados.png): header "SALAS DE DOTA" Teko + [ATUALIZAR] →
// tabela densa (NOME/VAGAS/MODO/REGIÃO, linhas ~36px) → FILTRAR SALAS →
// rodapé [CRIAR SALA] + [ENTRAR NA SALA] (desabilitado até selecionar).
// Click seleciona (border-l brand); double-click entra direto.
// Renderizado dentro do drawer "Jogar Dota" ou painel lateral.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RefreshCw, Plus, LogIn, Compass } from "lucide-react";
import { CreateLobbyModal } from "./create-lobby-modal";
import { LobbyFilters } from "./lobby-filters";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { LobbyListItem } from "./fetch-actions";

// Modos de jogo → chave de tradução (resolve no render via t()).
const GAME_MODE_KEYS: Record<string, string> = {
  all_pick: "modeAllPick",
  captains_mode: "modeCaptainsMode",
  random_draft: "modeRandomDraft",
  single_draft: "modeSingleDraft",
};

interface LobbiesContentProps {
  lobbies: LobbyListItem[];
  /** Callback ao selecionar/entrar numa sala. Se omitido, usa router.push. */
  onSelectLobby?: (id: string) => void;
  /** Callback ao clicar "Criar sala". Se omitido, abre CreateLobbyModal interno. */
  onCreate?: () => void;
  /** Callback do [ATUALIZAR]. Se omitido, usa router.refresh. */
  onRefresh?: () => void;
  /** Spinner no [ATUALIZAR] enquanto re-busca. */
  loading?: boolean;
}

export function LobbiesContent({
  lobbies,
  onSelectLobby,
  onCreate,
  onRefresh,
  loading = false,
}: LobbiesContentProps) {
  const router = useRouter();
  const t = useTranslations("lobbies");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState("all");
  const [filterRegion, setFilterRegion] = useState("brasil");
  const [search, setSearch] = useState("");
  const channelId = useId();

  // PUSH: salas abertas mudam (criada/encerrada/configurada) → refetcha a lista.
  // Usa onRefresh do caller (drawer Jogar Dota) ou router.refresh (página standalone).
  // ref pro callback: evita re-assinar quando o caller recria onRefresh por render.
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    refreshRef.current = onRefresh ?? (() => router.refresh());
  }, [onRefresh, router]);
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`lobbies-browser-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lobbies",
          filter: "status=eq.open",
        },
        () => refreshRef.current()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelId]);

  const filtered = useMemo(() => {
    return lobbies.filter((l) => {
      if (filterMode !== "all" && l.game_mode !== filterMode) return false;
      if (search && !l.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [lobbies, filterMode, search]);

  const enter = (id: string) => {
    if (onSelectLobby) onSelectLobby(id);
    else router.push(`/lobbies/${id}`);
  };

  const handleCreate = () => {
    if (onCreate) onCreate();
    else setShowCreate(true);
  };

  // Labels de modo resolvidos (key → texto traduzido) p/ tabela e filtros.
  const modeLabels = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(GAME_MODE_KEYS).map(([dbKey, transKey]) => [
          dbKey,
          t(transKey),
        ])
      ),
    [t]
  );

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Header — título Teko + contagem + ATUALIZAR */}
        <header className="flex items-center justify-between border-b border-border-subtle bg-bg-base px-3 py-2">
          <div className="flex items-baseline gap-2">
            <h1 className="font-display-condensed text-xl uppercase leading-none text-text-display">
              {t("browserTitle")}
            </h1>
            <span className="font-display text-sm 2xl:text-base tabular-nums text-text-faded">
              {t("openCount", { count: filtered.length })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => (onRefresh ? onRefresh() : router.refresh())}
            disabled={loading}
            className="inline-flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-widest text-text-faded hover:text-text-body transition-colors disabled:opacity-60"
          >
            <RefreshCw
              size={11}
              className={loading ? "animate-spin" : ""}
              aria-hidden="true"
            />
            {t("refresh")}
          </button>
        </header>

        {/* Tabela densa */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 border-b border-border-subtle bg-bg-elevated">
              <tr>
                <Th>{t("colName")}</Th>
                <Th align="center">{t("colSlots")}</Th>
                <Th>{t("colMode")}</Th>
                <Th>{t("colRegion")}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-12 text-center">
                    <Compass
                      size={24}
                      className="mx-auto mb-2 text-text-faded"
                      aria-hidden="true"
                    />
                    <p className="font-display-condensed text-lg uppercase tracking-wide text-text-muted">
                      {t("emptyTitle")}
                    </p>
                    <p className="mt-0.5 font-body text-sm 2xl:text-base text-text-faded">
                      {t("emptyBody")}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((lobby) => {
                  const isSel = selected === lobby.id;
                  const hasVaga = lobby.player_count < lobby.max_players;
                  return (
                    <tr
                      key={lobby.id}
                      onClick={() => setSelected(lobby.id)}
                      onDoubleClick={() => enter(lobby.id)}
                      aria-selected={isSel}
                      className={`h-9 cursor-pointer border-b border-border-subtle/60 transition-colors ${
                        isSel ? "bg-brand-primary/10" : "hover:bg-bg-elevated/60"
                      }`}
                    >
                      {/* border-l-2 fica na 1ª célula (border em <tr> é não-confiável) */}
                      <Td
                        className={`border-l-2 ${
                          isSel ? "border-brand-primary" : "border-transparent"
                        }`}
                      >
                        <span className="block max-w-[170px] truncate font-body text-sm 2xl:text-base text-text-display">
                          {lobby.name}
                        </span>
                        {lobby.status === "in_progress" && (
                          <span className="font-display text-sm font-semibold uppercase tracking-wide text-warning">
                            {t("statusInGame")}
                          </span>
                        )}
                      </Td>
                      <Td align="center">
                        <span
                          className={`font-display text-sm 2xl:text-base tabular-nums ${
                            hasVaga ? "text-gold" : "text-error"
                          }`}
                        >
                          {lobby.player_count}/{lobby.max_players}
                        </span>
                      </Td>
                      <Td>
                        <span className="block max-w-[110px] truncate font-body text-sm 2xl:text-base text-text-muted">
                          {modeLabels[lobby.game_mode] ?? lobby.game_mode}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-body text-sm 2xl:text-base text-text-muted">
                          {t("regionBrazil")}
                        </span>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FILTRAR SALAS — compacto (extraído pra lobby-filters.tsx) */}
        <LobbyFilters
          region={filterRegion}
          onRegionChange={setFilterRegion}
          mode={filterMode}
          onModeChange={setFilterMode}
          search={search}
          onSearchChange={setSearch}
          modeLabels={modeLabels}
        />

        {/* Rodapé — CRIAR SALA + ENTRAR NA SALA */}
        <div className="space-y-2 border-t border-border-subtle bg-bg-base p-3">
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-border-strong bg-bg-elevated px-4 py-2 font-display text-sm font-semibold uppercase tracking-[0.2em] text-text-body hover:bg-bg-surface transition-colors"
          >
            <Plus size={14} aria-hidden="true" />
            {t("createLobby")}
          </button>
          <Button
            type="button"
            variant="cinematic"
            size="md"
            onClick={() => selected && enter(selected)}
            disabled={!selected}
            className="w-full tracking-[0.25em]"
          >
            <LogIn size={15} aria-hidden="true" />
            {t("enterLobby")}
          </Button>
        </div>
      </div>

      <CreateLobbyModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <th
      className={`px-3 py-1.5 font-display text-sm font-semibold uppercase tracking-[0.15em] text-text-faded ${
        align === "center" ? "text-center" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-1 ${align === "center" ? "text-center" : "text-left"} ${className}`}
    >
      {children}
    </td>
  );
}

