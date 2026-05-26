// ProfilePage — orquestrador do conteúdo do /me (Phase 9).
// Layout interno 2 colunas (stats | identidade) + tabs.
//
// ARQUITETURA (BLOCKER #3 fix): hero portrait gigante de background é responsabilidade
// do ClientShell modo immersive (centerHero prop). Este componente renderiza APENAS
// o conteúdo sobre esse background. Sem absolute inset-0, sem portrait absolute fill.
//
// Server Component — sem "use client".

import { Pencil } from "lucide-react";
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
}

export function ProfilePage({ profile, activeTab, dotaRank, honorRank }: Props) {
  const ranqueado = profile.mmr !== null;

  return (
    <div className="relative min-h-full">
      {/* Botão EDITAR PERFIL — canto superior direito (UI-SPEC).
          STUB: disabled até plan 09-08 implementar EditProfileModal. */}
      <div className="absolute top-4 right-4 z-[var(--z-elevated)]">
        <EditProfileTrigger />
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
            avatarUrl={profile.avatarUrl}
            username={profile.username}
            dotaRank={dotaRank}
            honorRank={honorRank}
            ranqueado={ranqueado}
            statusMessage={profile.statusMessage}
            favoriteHeroes={profile.favoriteHeroes}
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

// STUB do trigger — plan 09-08 substituirá por <EditProfileModal> com Dialog
// que envolve este botão como trigger. Por ora: disabled + label EDITAR PERFIL.
function EditProfileTrigger() {
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled
      aria-label="Editar perfil (em breve)"
    >
      <Pencil size={14} aria-hidden="true" />
      EDITAR PERFIL
    </Button>
  );
}
