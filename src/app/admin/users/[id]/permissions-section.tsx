// Seção "Permissões de partida" do painel /admin/users/[id] (Server Component).
//
// Modelo (migrations 043/044): disponíveis = floor(acertos/5) - consumidas,
// derivado pela RPC available_match_permissions. acertos = tamanho do array
// profiles.doctrine_quiz_progress (IDs de questões corretas do Ritual).
// Doutrinado (doctrine_accepted_at) = acesso ilimitado, não consome.

import { Ticket } from "lucide-react";
import { AdjustPermissionsModal } from "./permission-modals";

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-4 rounded-md border border-border-subtle/50 bg-bg-elevated/20">
      <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
        {label}
      </p>
      <p className="font-display text-3xl tabular-nums text-gold">{value}</p>
      {sub && <p className="font-mono text-sm text-text-faded text-center">{sub}</p>}
    </div>
  );
}

export function PermissionsSection({
  userId,
  username,
  available,
  consumed,
  quizCorrect,
  isDoctrinated,
}: {
  userId: string;
  username: string;
  available: number;
  consumed: number;
  quizCorrect: number;
  isDoctrinated: boolean;
}) {
  const earned = Math.floor(quizCorrect / 5);

  return (
    <section className="rounded-md border border-border-subtle bg-bg-elevated overflow-hidden">
      <div className="border-b border-border-subtle px-5 py-3 flex items-center justify-between">
        <h2 className="font-display text-sm uppercase tracking-widest text-text-display">
          3. Permissões de partida
        </h2>
        <AdjustPermissionsModal
          targetUserId={userId}
          username={username}
          available={available}
        />
      </div>
      <div className="p-5 space-y-4">
        {isDoctrinated && (
          <p className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 font-display text-sm font-semibold text-emerald-400">
            <Ticket size={14} />
            Doutrinado — acesso ilimitado a partidas (não consome permissões).
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Disponíveis" value={available} sub="ganhas − consumidas" />
          <Stat label="Consumidas" value={consumed} sub="contador no perfil" />
          <Stat label="Ganhas no quiz" value={earned} sub="5 acertos = 1 permissão" />
          <Stat label="Acertos no quiz" value={quizCorrect} sub="questões corretas (de 130)" />
        </div>

        <p className="font-mono text-sm text-text-faded">
          Saldo derivado: floor(acertos / 5) − consumidas. Conceder bônus decrementa o
          contador de consumidas (pode ficar negativo = crédito); debitar incrementa.
        </p>
      </div>
    </section>
  );
}
