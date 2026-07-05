// og:image do placar — card estilo Stratz gerado por HTML→PNG (Satori/next-og).
// Quando o link /partida/historico/<id> é postado no Discord, ele desdobra neste card.
// Também é a imagem usada no embed do canal 📊 resultados.

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { getMatchCardData, type MatchCardPlayer } from "@/lib/dota/match-card";

export const runtime = "nodejs";
export const alt = "Placar da partida — FORMULADOTA";
export const size = { width: 1000, height: 440 };
export const contentType = "image/png";

const BASE = "https://www.formuladota.com";
const C = {
  bg: "#0B0C0F",
  panel: "#111317",
  green: "#00C466",
  red: "#C42121",
  gold: "#E6B800",
  text: "#E8EAED",
  muted: "#9AA0A8",
  faded: "#5A606A",
};

function row(p: MatchCardPlayer, side: "radiant" | "dire") {
  const deltaColor = p.mmrDelta == null ? C.muted : p.mmrDelta >= 0 ? C.green : C.red;
  const deltaText = p.mmrDelta == null ? "" : `${p.mmrDelta >= 0 ? "+" : ""}${p.mmrDelta}`;
  return (
    <div
      key={`${side}-${p.name}-${p.heroName}`}
      style={{ display: "flex", alignItems: "center", height: 58, gap: 10 }}
    >
      {p.heroIcon ? (
        <img src={p.heroIcon} width={46} height={46} style={{ borderRadius: 4 }} />
      ) : (
        <div style={{ display: "flex", width: 46, height: 46, borderRadius: 4, background: C.faded }} />
      )}
      <img src={`${BASE}/icons/dota-ranks/${p.rank}.png`} width={34} height={34} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {p.isMvp && (
            <div
              style={{
                display: "flex",
                fontSize: 15,
                color: C.bg,
                background: C.gold,
                borderRadius: 3,
                padding: "0 5px",
                fontWeight: 700,
              }}
            >
              MVP
            </div>
          )}
          <div
            style={{
              display: "flex",
              overflow: "hidden",
              maxWidth: 210,
              fontSize: 22,
              fontWeight: 700,
              color: C.text,
              whiteSpace: "nowrap",
            }}
          >
            {p.name}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 15, color: C.muted }}>
          {(p.pos ? `Pos ${p.pos} · ` : "") + p.heroName}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 20, color: C.text, fontWeight: 700, width: 92, justifyContent: "flex-end" }}>
        {p.kills}/{p.deaths}/{p.assists}
      </div>
      <div style={{ display: "flex", fontSize: 19, color: deltaColor, fontWeight: 700, width: 56, justifyContent: "flex-end" }}>
        {deltaText}
      </div>
    </div>
  );
}

function column(players: MatchCardPlayer[], side: "radiant" | "dire", win: boolean | null) {
  const isGreen = side === "radiant";
  const color = isGreen ? C.green : C.red;
  const label = isGreen ? "ILUMINADOS" : "TEMIDOS";
  const result = win == null ? "" : (isGreen ? win : !win) ? "VITÓRIA" : "DERROTA";
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color, letterSpacing: 1 }}>{label}</div>
        {result && (
          <div style={{ display: "flex", fontSize: 15, fontWeight: 700, color: result === "VITÓRIA" ? color : C.faded }}>
            {result}
          </div>
        )}
      </div>
      {players.map((p) => row(p, side))}
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [card, ubuntu400, ubuntu700] = await Promise.all([
    getMatchCardData(id),
    readFile(new URL("./_fonts/ubuntu-400.woff", import.meta.url)),
    readFile(new URL("./_fonts/ubuntu-700.woff", import.meta.url)),
  ]);

  const fonts = [
    { name: "Ubuntu", data: ubuntu400, weight: 400 as const, style: "normal" as const },
    { name: "Ubuntu", data: ubuntu700, weight: 700 as const, style: "normal" as const },
  ];

  if (!card) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            background: C.bg,
            color: C.text,
            fontSize: 40,
            fontWeight: 700,
          }}
        >
          FORMULADOTA
        </div>
      ),
      { ...size, fonts },
    );
  }

  const rWin = card.radiantWin;
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: C.bg,
          fontFamily: "Ubuntu",
          padding: 28,
        }}
      >
        {/* Header: logo + FORMULADOTA ... placar + duração/data */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={`${BASE}/brand/formuladota-mark.png`} width={44} height={44} style={{ borderRadius: 4 }} />
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: 2 }}>
              FORMULADOTA
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 34, fontWeight: 700 }}>
              <div style={{ display: "flex", color: rWin ? C.green : C.muted }}>{card.radiantScore}</div>
              <div style={{ display: "flex", color: C.faded }}>:</div>
              <div style={{ display: "flex", color: rWin === false ? C.red : C.muted }}>{card.direScore}</div>
            </div>
            <div style={{ display: "flex", fontSize: 14, color: C.muted, gap: 8 }}>
              {card.durationMin != null ? `${card.durationMin} min` : ""}
              {card.dateStr ? ` · ${card.dateStr}` : ""}
            </div>
          </div>
        </div>

        {/* Corpo: dois times */}
        <div style={{ display: "flex", flex: 1, gap: 24 }}>
          {column(card.radiant, "radiant", rWin)}
          <div style={{ display: "flex", width: 1, background: "#22252B" }} />
          {column(card.dire, "dire", rWin)}
        </div>

        {/* Rodapé */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8, fontSize: 14, color: C.faded }}>
          formuladota.com/partida/historico/{card.dotaMatchId}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
