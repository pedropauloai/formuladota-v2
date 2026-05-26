// ProfilePage — orquestrador do conteúdo do /me (Phase 9 — refator 2026-05-26).
//
// LAYOUT (Pedro pediu fidelidade Dota 2):
//   ┌─────────────────────────────────────────────────────────────────┐
//   │ TABS [Perfil/Histórico/Conquistas/Conduta]      [EDITAR PERFIL] │ ← topo
//   ├─────────────────────────────────────────────────────────────────┤
//   │ STATS │ IDENTIDADE (avatar+nome+medalhas+status+heróis)        │ ← 2-col
//   │ 280px │ flex-1                                                 │
//   ├─────────────────────────────────────────────────────────────────┤
//   │ [conteúdo da tab ativa — full width]                            │
//   └─────────────────────────────────────────────────────────────────┘
//
// Tabs no TOPO (não dentro de uma coluna) — igual Dota 2 client real.
// Hero portrait gigante de background fica atrás de tudo (ClientShell.centerHero).
//
// EDIÇÃO INLINE: editing=true via searchParams ?edit=1 → ProfileIdentity mostra
// controles inline em vez do modo leitura. Botão "EDITAR PERFIL" vira "SAIR".
//
// Server Component — sem "use client". Controles editáveis ficam em
// inline-edit-controls.tsx (Client Component carregado condicionalmente).

import Link from "next/link";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileStats } from "./profile-stats";
import { ProfileIdentity } from "./profile-identity";
import { ProfileTabs, type ProfileTab } from "./profile-tabs";
import { TabPerfil } from "./tab-perfil";
import { TabHistorico } from "./tab-historico";
import { TabConquistas } from "./tab-conquistas";
import { TabConduta } from "./tab-conduta";
import type { ProfileForMe } from "@/lib/queries/profile";
import type { DotaRank } from "@/components/ui/dota-rank-medal";
import type { HonorRank } from "@/components/ui/honor-rank-medal";

interface Props {
  profile: ProfileForMe;
  activeTab: ProfileTab;
  dotaRank: DotaRank;
  honorRank: HonorRank;
  editing: boolean;
}

export function ProfilePage({ profile, activeTab, dotaRank, honorRank, editing }: Props) {
  const ranqueado = profile.mmr !== null;

  return (
    <div className="relative flex flex-col min-h-full">
      {/* ──────────────────────────────────────────────────────────────
          BARRA SUPERIOR — Tabs CENTRALIZADAS, encostada no topbar.
          Shadow escura pra contraste com hero portrait de background.
          (fidelidade Dota 2 client — botão Editar Perfil NÃO pertence aqui)
          ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center px-6 py-3 border-b border-border-subtle/60 bg-bg-deep/60 backdrop-blur-sm shadow-lg shadow-black/60">
        <ProfileTabs activeTab={activeTab} />
      </div>

      {/* Botão Editar Perfil — FIXED logo abaixo do topbar (top-12/14 = 48-56px,
          a altura do topbar h-12 xl:h-14), alinhado à direita.
          FORA do submenu de tabs (sobreposto via z-overlay).
          Contraste visual: cinematic brand vermelho sobre o submenu escuro. */}
      <div className="fixed top-12 xl:top-14 right-2 mt-1 z-[var(--z-overlay)]">
        {editing ? (
          <Link href="/me">
            <Button variant="secondary" size="sm">
              <X size={12} aria-hidden="true" />
              Sair da edição
            </Button>
          </Link>
        ) : (
          <Link href="/me?edit=1">
            <Button variant="cinematic" size="sm">
              <Pencil size={12} aria-hidden="true" />
              Editar Perfil
            </Button>
          </Link>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────────
          LAYOUT 2-COL — stats à esquerda | identidade à direita
          (sem tabs aqui — foram pra cima)
          ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-0">
        <ProfileStats
          avatarUrl={profile.avatarUrl}
          username={profile.username}
          dotaRank={dotaRank}
          honorRank={honorRank}
          mmr={profile.mmr}
          partidas={profile.partidas}
          vitorias={profile.vitorias}
          derrotas={profile.derrotas}
        />

        <div className="flex-1">
          <ProfileIdentity
            userId={profile.userId}
            avatarUrl={profile.avatarUrl}
            username={profile.username}
            dotaRank={dotaRank}
            honorRank={honorRank}
            ranqueado={ranqueado}
            statusMessage={profile.statusMessage}
            favoriteHeroes={profile.favoriteHeroes}
            heroPortraitSlug={profile.heroPortraitSlug}
            editing={editing}
          />
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────
          CONTEÚDO DA TAB ATIVA — full width abaixo das 2 colunas
          ────────────────────────────────────────────────────────────── */}
      <div className="px-6 pb-6 mt-4">
        {activeTab === "perfil" && <TabPerfil />}
        {activeTab === "historico" && <TabHistorico />}
        {activeTab === "conquistas" && <TabConquistas />}
        {activeTab === "conduta" && (
          <TabConduta
            honorRank={honorRank}
            behaviorStatus={profile.behaviorStatus}
            doctrineAcceptedAt={profile.doctrineAcceptedAt}
            commends={null /* V2: RPC get_user_commends */}
            strikes={null /* V2: RPC get_user_strikes */}
          />
        )}
      </div>
    </div>
  );
}
