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
          BARRA SUPERIOR — FIXED pra ir realmente de UMA PONTA A OUTRA
          (passa por cima da right-sidebar e do mini-perfil expanded).
          Glassmorphism sutil + altura mínima.
          ────────────────────────────────────────────────────────────── */}
      <div className="fixed top-12 xl:top-14 left-0 right-0 z-[22] flex items-center justify-center px-6 py-1.5 border-b border-brand-primary/20 bg-bg-deep/40 backdrop-blur-xl shadow-md shadow-black/40">
        <ProfileTabs activeTab={activeTab} />
      </div>

      {/* Spacer — compensa altura do submenu fixed pra conteúdo não ficar atrás. */}
      <div className="h-9 shrink-0" aria-hidden="true" />

      {/* Botão Editar Perfil — SÓ aparece quando activeTab === "perfil" (fidelidade Dota 2).
          Fixed logo abaixo do topbar (top-12 xl:top-14), alinhado à direita.
          Quando editing=true, vira "Sair da edição" e mantém visível. */}
      {(activeTab === "perfil" || editing) && (
        <div className="fixed top-12 xl:top-14 right-2 mt-1 z-[25]">
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
      )}

      {/* ──────────────────────────────────────────────────────────────
          CONTEÚDO POR TAB — cada aba tem suas informações próprias.
          Tab Perfil: layout 2-col (ProfileStats à esquerda | ProfileIdentity).
          Outras tabs: full width, sem ProfileStats nem ProfileIdentity.
          ────────────────────────────────────────────────────────────── */}
      {activeTab === "perfil" && (
        <div className="flex flex-col lg:flex-row gap-0 flex-1 min-h-0">
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
          <div className="flex-1 min-w-0">
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
      )}

      {activeTab === "historico" && (
        <div className="flex-1 min-h-0 p-6">
          <TabHistorico />
        </div>
      )}

      {activeTab === "conquistas" && (
        <div className="flex-1 min-h-0 p-6">
          <TabConquistas />
        </div>
      )}

      {activeTab === "conduta" && (
        <div className="flex-1 min-h-0 p-6">
          <TabConduta
            honorRank={honorRank}
            behaviorStatus={profile.behaviorStatus}
            doctrineAcceptedAt={profile.doctrineAcceptedAt}
            commends={null /* V2: RPC get_user_commends */}
            strikes={null /* V2: RPC get_user_strikes */}
          />
        </div>
      )}
    </div>
  );
}
