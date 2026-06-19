// /admin/temporadas — CRUD de seasons (migration 012).
// Criar (inativa) + ativar/desativar (1 ativa por vez, unique no banco) +
// encerrar (ended_at, irreversível). Actions admin-gated em ./actions.ts.
//
// Gate: layout /admin valida is_admin; revalidamos aqui (defesa em camadas).

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateSeasonForm, SeasonRowActions } from "./season-controls";

export const metadata = { title: "Admin Temporadas — FORMULADOTA" };
export const revalidate = 0;

export default async function AdminTemporadasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) redirect("/dashboard");

  const t = await getTranslations("misc2");
  const service = createServiceClient();
  const { data: seasons } = await service
    .from("seasons")
    .select("id, name, started_at, ended_at, prize_pool, prize_pool_currency, active")
    .order("started_at", { ascending: false });

  return (
    <div className="p-8 space-y-6">
      <header>
        <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
          {t("seasonsEyebrow")}
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-text-display">
          Seasons
        </h1>
        <div className="mt-4 brand-divider" />
      </header>

      <CreateSeasonForm />

      <div className="space-y-3">
        {(seasons ?? []).length === 0 && (
          <p className="font-mono text-sm text-text-faded">{t("seasonsEmpty")}</p>
        )}
        {(seasons ?? []).map((s) => (
          <Card
            key={s.id}
            variant="flat"
            className={s.active ? "border-brand-primary/60 bg-brand-primary/5 p-4" : "p-4"}
          >
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Calendar size={18} className="text-brand-primary shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <h3 className="font-display text-xl uppercase tracking-wide text-text-display truncate">
                      {s.name}
                    </h3>
                    <p className="font-display text-sm font-semibold text-text-body">
                      {t("seasonStartedOn", { date: new Date(s.started_at).toLocaleDateString("pt-BR") })}
                      {s.ended_at &&
                        t("seasonEndedOn", { date: new Date(s.ended_at).toLocaleDateString("pt-BR") })}
                    </p>
                    {Number(s.prize_pool) > 0 && (
                      <p className="mt-1 font-mono text-sm tabular-nums text-gold">
                        {t("seasonPrizePool", {
                          currency: s.prize_pool_currency,
                          value: Number(s.prize_pool).toLocaleString("pt-BR"),
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {s.active && <Badge variant="success">{t("seasonBadgeActive")}</Badge>}
                  {s.ended_at && !s.active && <Badge variant="secondary">{t("seasonBadgeEnded")}</Badge>}
                  <SeasonRowActions
                    seasonId={s.id}
                    seasonName={s.name}
                    active={s.active}
                    ended={Boolean(s.ended_at)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
