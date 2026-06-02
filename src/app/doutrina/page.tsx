import { DotaBackdrop } from "@/components/dota/dota-backdrop";
import { RitualDoutrina } from "./RitualDoutrina";

// Ritual de Doutrinacao gamificado (niveis 0->6).
// Rota standalone pra revisao. A integracao com o gate de onboarding e a
// persistencia no banco (XP/niveis) entram apos validacao + aprovacao de migration.
export const metadata = {
  title: "Ritual de Doutrinação — FORMULADOTA",
};

export default function DoutrinaPage() {
  return (
    <main className="relative min-h-screen">
      <DotaBackdrop />
      <div className="relative z-10">
        <RitualDoutrina />
      </div>
    </main>
  );
}
