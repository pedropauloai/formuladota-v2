// Tab Conquistas — badges conquistadas pelo user (user_badges + badges).
// user_badges tem SELECT público (migration 014) → funciona pra QUALQUER user
// (perfil próprio /me e perfil público /perfil/u/[id]).

import * as Icons from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

// Cor por tier de badge — mesma gramática de materiais do resto do app.
const TIER_COLOR: Record<number, string> = {
  1: "border-amber-700/40 from-amber-700/10",
  2: "border-slate-400/40 from-slate-400/10",
  3: "border-amber-400/50 from-amber-400/10",
  4: "border-fuchsia-400/50 from-fuchsia-400/10",
};

interface BadgeView {
  id: string;
  name: string;
  description: string;
  icon_lucide: string;
  tier: number;
  earned_at: string | null;
}

export async function TabConquistas({ userId }: { userId: string }) {
  const t = await getTranslations("perfil");
  const supabase = await createClient();

  const { data: userBadges } = await supabase
    .from("user_badges")
    .select("badge_id, earned_at")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  const badgeIds = (userBadges ?? []).map((b) => b.badge_id);
  const { data: badgesData } =
    badgeIds.length > 0
      ? await supabase
          .from("badges")
          .select("id, name, description, icon_lucide, tier")
          .in("id", badgeIds)
      : { data: [] };

  const badgeMap = new Map((badgesData ?? []).map((b) => [b.id, b]));
  const badges: BadgeView[] = (userBadges ?? [])
    .map((ub) => {
      const b = badgeMap.get(ub.badge_id);
      return b ? { ...b, earned_at: ub.earned_at } : null;
    })
    .filter((b): b is BadgeView => b !== null);

  return (
    <div className="pt-6">
      <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
        {t("badgesEarned")} <span className="text-text-faded">({badges.length})</span>
      </h2>
      {badges.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-4">
          {badges.map((b) => (
            <BadgeCard key={b.id} badge={b} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("conquistasEmptyTitle")}
          description={t("conquistasEmptyDesc")}
        />
      )}
    </div>
  );
}

function BadgeCard({ badge }: { badge: BadgeView }) {
  const IconComponent =
    (Icons[badge.icon_lucide as keyof typeof Icons] as
      | React.ComponentType<{ size?: number; className?: string }>
      | undefined) ?? Icons.Trophy;
  const tierCls = TIER_COLOR[badge.tier] ?? TIER_COLOR[1];

  return (
    <Card variant="flat" className={`bg-gradient-to-b ${tierCls} to-bg-deep/60`}>
      <CardContent className="space-y-2">
        <div className="flex items-start justify-between">
          <IconComponent size={20} className="text-text-display" />
          <span className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
            T{badge.tier}
          </span>
        </div>
        <p className="font-display text-sm uppercase tracking-wide text-text-display">
          {badge.name}
        </p>
        <p className="font-display text-sm 2xl:text-base font-semibold text-text-body leading-relaxed">
          {badge.description}
        </p>
        {badge.earned_at && (
          <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
            {new Date(badge.earned_at).toLocaleDateString("pt-BR")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
