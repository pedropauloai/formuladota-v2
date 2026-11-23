"use client";

// O topo da party diz o próximo passo da live e tem o único botão verde da mesa, sempre no mesmo
// lugar: abrir a live, completar a party ou marcar a partida que terminou. A frase ao lado diz o que
// vai acontecer, com os nomes de quem entra.

import { useState, type ReactNode } from "react";
import { Play, UsersRound } from "lucide-react";
import type { AdminQueue } from "@/lib/loja/fila/admin";
import { nextStep, stepStatus } from "@/lib/loja/fila/mesa";
import { abrirLive } from "./actions";
import { MatchEndButton } from "./match-end";
import { OpButton, SectionTitle } from "./ui";
import { useAction } from "./use-console";

function OpenLive({ data }: { data: AdminQueue }) {
  const [youtube, setYoutube] = useState("");
  const open = useAction();
  const live = data.live;
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        open.run({ action: () => abrirLive(live?.queueSize ?? 20, live?.seatsPerMatch ?? 4, youtube), success: "Live aberta. A party já pode chamar a fila." });
      }}
    >
      <input
        type="url"
        value={youtube}
        onChange={(e) => setYoutube(e.target.value)}
        placeholder="Link da live no YouTube (opcional)"
        aria-label="Link da live no YouTube (opcional)"
        className="h-14 w-80 rounded-[var(--radius-button)] border border-white/10 bg-bg-deep px-3 text-[15px] text-text-display placeholder:text-text-faded focus:border-white/25 focus:outline-none"
      />
      <OpButton type="submit" tone="go" size="xl" pending={open.pending} icon={<Play size={18} aria-hidden="true" />} data-fila-abrir-live>
        Abrir a live
      </OpButton>
    </form>
  );
}

interface PartyHeaderProps {
  data: AdminQueue;
  fill: ReturnType<typeof useAction>;
  onFill: () => void;
  matchEndOpen: boolean;
  setMatchEndOpen: (open: boolean) => void;
}

export function PartyHeader({ data, fill, onFill, matchEndOpen, setMatchEndOpen }: PartyHeaderProps) {
  const live = data.live;
  const party = data.entries.filter((e) => e.state === "na_party");
  const seats = Math.min(4, Math.max(1, live?.seatsPerMatch ?? 4));
  const step = nextStep(data);
  const [lead, rest] = stepStatus(data, step);
  const endButton = (primary: boolean): ReactNode =>
    live && <MatchEndButton live={live} party={party} tone={primary ? "go" : "neutral"} size={primary ? "xl" : "md"} open={matchEndOpen} onOpenChange={setMatchEndOpen} />;

  return (
    <header className="flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-white/[0.06] px-5 py-4" data-fila-passo={step}>
      <div className="min-w-[18rem] max-w-3xl flex-1">
        <SectionTitle>
          Party <span className="tabular-nums text-gold">{Math.min(party.length, seats)}/{seats}</span>
        </SectionTitle>
        <p className="mt-2 text-[15px] leading-relaxed text-text-muted [text-wrap:pretty]">
          <b className="font-semibold text-text-display">{lead}</b> {rest}
        </p>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {step === "abrir" && <OpenLive data={data} />}
        {step === "completar" && party.length > 0 && endButton(false)}
        {step === "completar" && (
          <OpButton tone="go" size="xl" kbd="C" pending={fill.pending} onClick={onFill} icon={<UsersRound size={18} aria-hidden="true" />} data-fila-completar>
            Completar a party
          </OpButton>
        )}
        {step === "terminar" && endButton(true)}
      </div>
    </header>
  );
}
