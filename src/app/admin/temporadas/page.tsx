// /admin/temporadas — CRUD seasons. Phase 8 H6.3.

import type { Metadata } from "next";
import { Calendar } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Admin Temporadas — FORMULADOTA" };

export default async function AdminTemporadasPage() {
  const supabase = createServiceClient();
  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .order("started_at", { ascending: false });

  return (
    <div className="p-8 space-y-6">
      <header>
        <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Temporadas
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-text-display">
          Seasons
        </h1>
        <div className="mt-4 brand-divider" />
      </header>

      <div className="space-y-3">
        {(seasons ?? []).map((s) => (
          <Card
            key={s.id}
            variant="flat"
            className={
              s.active
                ? "border-brand-primary/60 bg-brand-primary/5 p-4"
                : "p-4"
            }
          >
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-brand-primary" aria-hidden="true" />
                  <div>
                    <h3 className="font-display text-xl uppercase tracking-wide text-text-display">{s.name}</h3>
                    <p className="font-mono text-sm text-text-muted">
                      Iniciada em {new Date(s.started_at).toLocaleDateString("pt-BR")}
                      {s.ended_at && ` · Encerrada em ${new Date(s.ended_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                </div>
                {s.active && <Badge variant="success">Ativa</Badge>}
              </div>
              {Number(s.prize_pool) > 0 && (
                <p className="mt-4 font-mono text-sm text-text-body">
                  Prize pool: {s.prize_pool_currency} {Number(s.prize_pool).toLocaleString("pt-BR")}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-text-faded">
        Criação/encerramento manual de seasons via Server Actions — V2 expansão.
      </p>
    </div>
  );
}
