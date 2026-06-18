// /admin/torneios — gestão de torneios. Criar (draft) → abrir inscrições →
// gerar chave → (reporte de placar no detalhe público /torneios/[slug]).
// Gate: layout /admin valida is_admin; revalidamos aqui (defesa em camadas).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Trophy, Users, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { CreateTournamentForm, TournamentRowActions } from "./torneios-controls";

export const metadata: Metadata = { title: "Admin Torneios — FORMULADOTA" };
export const revalidate = 0;

const STATUS_LABEL: Record<
  string,
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  draft: { label: "Rascunho", variant: "outline" },
  open: { label: "Inscrições abertas", variant: "success" },
  in_progress: { label: "Em andamento", variant: "warning" },
  completed: { label: "Encerrado", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "error" },
};

export default async function AdminTorneiosPage() {
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

  const service = createServiceClient();
  const { data: tournaments } = await service
    .from("tournaments")
    .select("id, slug, name, status, max_teams, format")
    .order("created_at", { ascending: false });

  // Contagem de times inscritos por torneio (1 query, conta em JS).
  const ids = (tournaments ?? []).map((t) => t.id);
  const { data: regs } = ids.length
    ? await service.from("tournament_teams").select("tournament_id").in("tournament_id", ids)
    : { data: [] };
  const countByTournament = new Map<string, number>();
  for (const r of regs ?? []) {
    countByTournament.set(r.tournament_id, (countByTournament.get(r.tournament_id) ?? 0) + 1);
  }

  return (
    <div className="p-8 space-y-6">
      <header>
        <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Torneios
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-text-display">
          Gerenciar torneios
        </h1>
        <div className="mt-4 brand-divider" />
      </header>

      <CreateTournamentForm />

      <div className="space-y-3">
        {(tournaments ?? []).length === 0 && (
          <p className="font-mono text-sm text-text-faded">Nenhum torneio cadastrado.</p>
        )}
        {(tournaments ?? []).map((t) => {
          const status = STATUS_LABEL[t.status] ?? {
            label: t.status,
            variant: "outline" as const,
          };
          const teamCount = countByTournament.get(t.id) ?? 0;
          return (
            <Card key={t.id} variant="flat" className="p-4">
              <CardContent>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <Trophy size={18} className="text-brand-primary shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <h3 className="font-display text-xl uppercase tracking-wide text-text-display truncate">
                        {t.name}
                      </h3>
                      <p className="font-display text-sm font-semibold text-text-body flex items-center gap-2">
                        <Users size={12} aria-hidden="true" /> {teamCount}/{t.max_teams} times
                        <Link
                          href={`/torneios/${t.slug}`}
                          className="inline-flex items-center gap-1 text-brand-primary hover:underline"
                        >
                          <ExternalLink size={12} aria-hidden="true" /> ver
                        </Link>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <TournamentRowActions
                      tournamentId={t.id}
                      status={t.status}
                      teamCount={teamCount}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
