// ProfilePage — orquestrador do conteúdo do /me (Phase 9).
// Layout interno 2 colunas (stats | identidade) + tabs.
//
// ARQUITETURA (BLOCKER #3 fix): hero portrait gigante de background é responsabilidade
// do ClientShell modo immersive (centerHero prop). Este componente renderiza APENAS
// o conteúdo sobre esse background. Sem absolute inset-0, sem portrait absolute fill.
//
// EDIÇÃO INLINE (refator 2026-05-26 — Pedro pediu sem modal):
//   - editing=true ativado via searchParams `?edit=1` (controlado por /me/page.tsx)
//   - Botão "EDITAR PERFIL" vira Link `?edit=1`; quando editing=true vira "SAIR DA EDIÇÃO" /me
//   - ProfileIdentity recebe `editing` prop e mostra controles inline em vez do modo leitura
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
    <div className="relative min-h-full">
      {/* Botão EDITAR PERFIL / SAIR DA EDIÇÃO — canto superior direito (D-11).
          Edição inline via ?edit=1 (sem modal — refator 2026-05-26). */}
      <div className="absolute top-4 right-4 z-[var(--z-elevated)]">
        {editing ? (
          <Link href="/me">
            <Button variant="secondary" size="md">
              <X size={14} aria-hidden="true" />
              Sair da edição
            </Button>
          </Link>
        ) : (
          <Link href="/me?edit=1">
            <Button variant="cinematic" size="md">
              <Pencil size={14} aria-hidden="true" />
              Editar Perfil
            </Button>
          </Link>
        )}
      </div>

      {/* Layout interno 2-col (stats | identidade) + tabs no center-col do ClientShell.
          Hero portrait fullscreen está atrás de tudo via ClientShell.centerHero.
          Mobile: empilha verticalmente (flex-col → flex-row em lg+). */}
      <div className="flex flex-col lg:flex-row gap-0 min-h-full">
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

        <div className="flex-1 flex flex-col">
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

          {/* Tabs + conteúdo da tab ativa */}
          <div className="px-6 pb-6">
            <ProfileTabs activeTab={activeTab} />
            <div className="mt-6">
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
        </div>
      </div>
    </div>
  );
}
