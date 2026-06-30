// Aba Draft — ordem de escolhas (e banimentos, se houver) por time.

import Image from "next/image";
import type { DraftPick } from "@/lib/dota/match-objectives";
import { TeamHeader } from "@/components/match/shared";

function PickRow({ p }: { p: DraftPick }) {
  return (
    <li
      className={`flex items-center gap-2.5 px-2 py-1.5 ${p.isPick ? "" : "opacity-50"}`}
      title={p.isPick ? "Escolha" : "Banimento"}
    >
      <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-text-faded">
        {p.order + 1}
      </span>
      {p.heroIcon ? (
        <Image
          src={p.heroIcon}
          alt={p.heroName}
          width={28}
          height={28}
          unoptimized
          className={`size-7 rounded-sm object-cover ${p.isPick ? "" : "grayscale"}`}
        />
      ) : (
        <span className="size-7 rounded-sm bg-bg-elevated" aria-hidden="true" />
      )}
      <span className="font-body text-sm text-text-display">{p.heroName}</span>
      {!p.isPick && (
        <span className="font-display text-[0.65rem] uppercase tracking-wide text-error">Ban</span>
      )}
    </li>
  );
}

function TeamDraft({ picks, team }: { picks: DraftPick[]; team: "radiant" | "dire" }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40 p-3">
      <TeamHeader team={team} />
      {picks.length ? (
        <ul className="divide-y divide-border-subtle/40">
          {picks.map((p, i) => (
            <PickRow key={i} p={p} />
          ))}
        </ul>
      ) : (
        <p className="font-body text-sm text-text-faded">Sem dados de draft.</p>
      )}
    </div>
  );
}

export function DraftPanel({
  radiant,
  dire,
}: {
  radiant: DraftPick[];
  dire: DraftPick[];
}) {
  if (!radiant.length && !dire.length) {
    return (
      <p className="font-body text-sm text-text-faded">
        Esta partida não tem dados de draft (modo sem picks/bans registrados).
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <TeamDraft picks={radiant} team="radiant" />
      <TeamDraft picks={dire} team="dire" />
    </div>
  );
}
