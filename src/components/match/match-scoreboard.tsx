"use client";

// Placar pós-jogo de uma partida FormulaDota — estilo cliente Dota 2 / Dotabuff.
// Recebe os jogadores já resolvidos (identidade + herói + itens) e renderiza os dois
// times com TODAS as estatísticas de match_players. Denso e compacto por decisão de
// design (cliente real). É client component porque o pai (match-detail) é client — os
// rótulos vêm do i18n via useTranslations (hook client).

import Image from "next/image";
import { useTranslations } from "next-intl";
import { itemImageUrl } from "@/lib/queries/items";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { MvpBadge } from "@/components/ui/mvp-badge";
import { UserHoverCard } from "@/components/profile/user-hover-card";
import { SeasonRankMedal } from "@/components/ui/season-rank-medal";
import { type PlayerRole } from "@/lib/mmr";

export interface ScoreboardPlayer {
  userId: string | null;
  name: string;
  avatar: string | null;
  profileHref: string | null;
  heroName: string;
  heroPortrait: string | null;
  /** Nível DO HERÓI na partida (in-game). */
  level: number;
  /** Nível DA CONTA FormulaDota (identidade) — badge no anel de XP. */
  accountLevel: number;
  /** Progresso 0..1 do nível da conta — preenche o anel de XP. */
  accountXpPct: number;
  /** MMR FormulaDota da temporada (identidade). null = sem MMR ainda. */
  mmr: number | null;
  /** Colocação 1-based na season — medalha de leaderboard (#N) igual ao /ranking. */
  position: number | null;
  /** Função detectada por net worth (core/support) — perfil de avaliação do perf. */
  role: PlayerRole;
  /** Posição 1-5 (rank de net worth no time) — ícone da role específica. */
  positionSlot: number;
  kills: number;
  deaths: number;
  assists: number;
  lastHits: number;
  denies: number;
  gpm: number;
  xpm: number;
  netWorth: number;
  heroDamage: number;
  towerDamage: number;
  heroHealing: number;
  /** Participação em teamfights (0..1) — coluna "Lutas %". */
  teamfightPct: number | null;
  /** Delta de MMR desta partida (+/-). null = não ranqueado (ex.: pré-temporada). */
  mmrChange: number | null;
  /** 6 slots de inventário (ids; 0 = vazio). */
  inventory: number[];
  /** Item neutro (id; null = nenhum). */
  neutral: number | null;
}

// Formata números grandes (18234 → "18.2k"). Mantém legibilidade no placar denso.
function fmtK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// Um slot de item (ícone ou caixa vazia). Itens NÃO são avatar → não seguem a
// regra do rounded-sm de usuário, mas mantemos rounded-sm pra coerência visual.
function ItemSlot({ id, neutral = false }: { id: number | null; neutral?: boolean }) {
  const url = itemImageUrl(id);
  const ring = neutral ? "ring-1 ring-gold/50" : "";
  if (!url) {
    return (
      <span
        className={`block h-[22px] w-[30px] shrink-0 rounded-sm border border-border-subtle/60 bg-bg-surface ${ring}`}
        aria-hidden="true"
      />
    );
  }
  return (
    <Image
      src={url}
      alt=""
      width={30}
      height={22}
      unoptimized
      className={`h-[22px] w-[30px] shrink-0 rounded-sm object-cover ${ring}`}
    />
  );
}

function ItemRow({ inventory, neutral }: { inventory: number[]; neutral: number | null }) {
  const slots = [...inventory];
  while (slots.length < 6) slots.push(0);
  return (
    <div className="flex items-center gap-0.5">
      {slots.slice(0, 6).map((id, i) => (
        <ItemSlot key={i} id={id || null} />
      ))}
      <span className="mx-0.5 h-4 w-px bg-border-subtle/60" aria-hidden="true" />
      <ItemSlot id={neutral} neutral />
    </div>
  );
}

// Cabeçalho de coluna — uppercase condensado, alinhado à direita pros números.
// `title` vira tooltip nativo (ex.: "Lutas %" explica que é participação em teamfight).
function Th({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <th
      title={title}
      className={`px-2 py-2 text-right font-display text-[0.65rem] font-bold uppercase tracking-wide text-text-faded ${title ? "cursor-help" : ""} ${className}`}
    >
      {children}
    </th>
  );
}

// Ícone da POSIÇÃO específica (1-5 pela ordem de net worth no time) — a role que o
// jogador estava jogando. Pos 1-3 = core, 4-5 = suporte (mesmo corte do perf score).
const POSITION_LABEL: Record<number, string> = {
  1: "Posição 1 (safelane / carry)",
  2: "Posição 2 (meio)",
  3: "Posição 3 (offlane)",
  4: "Posição 4 (suporte)",
  5: "Posição 5 (suporte dedicado)",
};
export function RoleIcon({
  slot,
  className = "",
  size = 16,
  label,
}: {
  slot: number;
  className?: string;
  size?: number;
  /** Rótulo (alt/title) já traduzido. Consumidores fora do placar podem omitir
      — cai no fallback PT de POSITION_LABEL até serem ligados ao i18n. */
  label?: string;
}) {
  const s = Math.min(5, Math.max(1, slot));
  const text = label ?? POSITION_LABEL[s] ?? `Posição ${s}`;
  return (
    <Image
      src={`/dota/positions/pos-${s}.png`}
      alt={text}
      title={text}
      width={size}
      height={size}
      unoptimized
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

function PlayerCell({
  p,
  isMvp = false,
  posLabel,
}: {
  p: ScoreboardPlayer;
  isMvp?: boolean;
  /** Rótulo da posição já traduzido (pos1..pos5). */
  posLabel?: string;
}) {
  const inner = (
    <span className="flex items-center gap-2.5">
      {/* Herói: imagem OFICIAL do CDN (landscape) + nível do herói na partida. */}
      <span className="relative shrink-0">
        {p.heroPortrait ? (
          <Image
            src={p.heroPortrait}
            alt={p.heroName}
            title={p.heroName}
            width={64}
            height={36}
            unoptimized
            className="h-9 w-16 rounded-sm object-cover"
          />
        ) : (
          <span className="block h-9 w-16 rounded-sm bg-bg-elevated" aria-hidden="true" />
        )}
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-sm bg-bg-base px-1 font-display text-[0.6rem] font-bold tabular-nums text-gold ring-1 ring-border-subtle">
          {p.level}
        </span>
      </span>
      {/* Identidade: avatar com anel de XP + NÍVEL da conta (não o do herói).
          O selo de MVP NÃO fica sobre a foto — vai ao lado do nome (abaixo). */}
      <span className="relative isolate shrink-0">
        <XpAvatarRing
          src={p.avatar ?? undefined}
          alt={p.name}
          fallback={p.name.slice(0, 2).toUpperCase()}
          level={p.accountLevel}
          pct={p.accountXpPct}
          size={32}
        />
      </span>
      {/* Medalha do RANK FormulaDota — MESMA do /ranking (variante de leaderboard + #N
          pela colocação na season), entre a foto e o nome. */}
      {p.mmr != null && (
        <SeasonRankMedal mmr={p.mmr} position={p.position} size="md" className="shrink-0" />
      )}
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 truncate font-body text-sm font-medium text-text-display">
          {p.name}
          {/* MVP — selo SVG único, ao lado do nome (não sobre a foto). */}
          {isMvp && <MvpBadge inline width={30} />}
        </span>
        {/* Herói + ícone da posição (role específica) + MMR FormulaDota (identidade). */}
        <span className="flex items-center gap-1.5 truncate font-display text-[0.7rem] uppercase tracking-wide text-text-muted">
          <RoleIcon slot={p.positionSlot} size={15} label={posLabel} />
          {p.heroName}
          {p.mmr != null && (
            <span className="ml-0.5 text-gold tabular-nums">{p.mmr} MMR</span>
          )}
        </span>
      </span>
    </span>
  );

  // Hover rico (medalhas + winrate + presença) e link pro perfil — igual ao resto
  // do app. Substitui o <Link> simples que não abria hover.
  if (p.userId) {
    return (
      <UserHoverCard userId={p.userId} className="inline-flex transition-opacity hover:opacity-80">
        {inner}
      </UserHoverCard>
    );
  }
  return inner;
}

// Delta de MMR da partida: +N verde (ganhou) / -N vermelho (perdeu) / "—" se não
// ranqueado (pré-temporada ou jogador de fora da plataforma).
function MmrCell({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <td className="px-2 py-2.5 text-right font-mono text-sm tabular-nums text-text-faded">—</td>
    );
  }
  const pos = value >= 0;
  return (
    <td
      className={`px-2 py-2.5 text-right font-display text-sm font-bold tabular-nums ${
        pos ? "text-play-primary" : "text-error"
      }`}
    >
      {pos ? "+" : ""}
      {value}
    </td>
  );
}

function NetWorthCell({ value, max }: { value: number; max: number }) {
  const pct = Math.max(4, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));
  return (
    <td className="px-2 py-2.5 text-right">
      <span className="block font-mono text-sm tabular-nums text-gold">{fmtK(value)}</span>
      <span className="mt-1 block h-1 w-full overflow-hidden rounded-sm bg-bg-surface">
        <span className="block h-full bg-gold/70" style={{ width: `${pct}%` }} />
      </span>
    </td>
  );
}

function TeamTable({
  title,
  accent,
  won,
  players,
  mvpUserId,
}: {
  title: string;
  accent: string;
  won: boolean | null;
  players: ScoreboardPlayer[];
  mvpUserId: string | null;
}) {
  const t = useTranslations("scoreboard");
  const maxNw = Math.max(1, ...players.map((p) => p.netWorth));
  const tot = players.reduce(
    (a, p) => ({
      k: a.k + p.kills,
      d: a.d + p.deaths,
      as: a.as + p.assists,
      lh: a.lh + p.lastHits,
      gpm: a.gpm + p.gpm,
      nw: a.nw + p.netWorth,
      dmg: a.dmg + p.heroDamage,
      heal: a.heal + p.heroHealing,
    }),
    { k: 0, d: 0, as: 0, lh: 0, gpm: 0, nw: 0, dmg: 0, heal: 0 }
  );

  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40">
      <header className="flex items-center justify-between gap-3 border-b border-border-subtle px-3 py-2.5">
        <h2 className={`font-display text-lg font-bold uppercase tracking-wide ${accent}`}>
          {title}
        </h2>
        {won != null && (
          <span
            className={`rounded-sm px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wide ${
              won ? "bg-play-primary/15 text-play-primary" : "bg-error/15 text-error"
            }`}
          >
            {won ? t("won") : t("lost")}
          </span>
        )}
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle/60">
              <th className="px-3 py-2 text-left font-display text-[0.65rem] font-bold uppercase tracking-wide text-text-faded">
                {t("colPlayer")}
              </th>
              <Th>{t("colKda")}</Th>
              <Th>{t("colMmr")}</Th>
              <Th title={t("colFightsTitle")}>{t("colFights")}</Th>
              <Th>{t("colLhDn")}</Th>
              <Th>{t("colGpm")}</Th>
              <Th>{t("colXpm")}</Th>
              <Th>{t("colNetWorth")}</Th>
              <Th>{t("colDamage")}</Th>
              <Th>{t("colTowers")}</Th>
              <Th>{t("colHealing")}</Th>
              <th className="px-3 py-2 text-left font-display text-[0.65rem] font-bold uppercase tracking-wide text-text-faded">
                {t("colItems")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40">
            {players.map((p, i) => (
              <tr key={p.userId ?? `${title}-${i}`} className="hover:bg-bg-surface/40">
                <td className="px-3 py-2.5">
                  <PlayerCell
                    p={p}
                    isMvp={p.userId != null && p.userId === mvpUserId}
                    posLabel={t(`pos${Math.min(5, Math.max(1, p.positionSlot))}`)}
                  />
                </td>
                <td className="px-2 py-2.5 text-right font-display text-sm font-bold tabular-nums text-text-display">
                  <span className="text-play-primary">{p.kills}</span>
                  <span className="text-text-faded"> / </span>
                  <span className="text-error">{p.deaths}</span>
                  <span className="text-text-faded"> / </span>
                  <span className="text-gold">{p.assists}</span>
                </td>
                <MmrCell value={p.mmrChange} />
                <td className="px-2 py-2.5 text-right font-mono text-sm tabular-nums text-text-muted">
                  {p.teamfightPct != null ? `${Math.round(p.teamfightPct * 100)}%` : "—"}
                </td>
                <td className="px-2 py-2.5 text-right font-display text-sm tabular-nums text-text-muted">
                  {p.lastHits}
                  <span className="text-text-faded"> / </span>
                  {p.denies}
                </td>
                <td className="px-2 py-2.5 text-right font-mono text-sm tabular-nums text-gold">
                  {p.gpm}
                </td>
                <td className="px-2 py-2.5 text-right font-mono text-sm tabular-nums text-text-muted">
                  {p.xpm}
                </td>
                <NetWorthCell value={p.netWorth} max={maxNw} />
                <td className="px-2 py-2.5 text-right font-mono text-sm tabular-nums text-text-muted">
                  {fmtK(p.heroDamage)}
                </td>
                <td className="px-2 py-2.5 text-right font-mono text-sm tabular-nums text-text-muted">
                  {fmtK(p.towerDamage)}
                </td>
                <td className="px-2 py-2.5 text-right font-mono text-sm tabular-nums text-text-muted">
                  {fmtK(p.heroHealing)}
                </td>
                <td className="px-3 py-2.5">
                  <ItemRow inventory={p.inventory} neutral={p.neutral} />
                </td>
              </tr>
            ))}
            {/* Totais do time. */}
            <tr className="border-t border-border-subtle bg-bg-surface/30 font-bold">
              <td className="px-3 py-2 font-display text-xs uppercase tracking-wide text-text-muted">
                {t("totals")}
              </td>
              <td className="px-2 py-2 text-right font-display text-sm tabular-nums text-text-display">
                {tot.k} / {tot.d} / {tot.as}
              </td>
              <td />{/* MMR (sem total) */}
              <td />{/* CA */}
              <td className="px-2 py-2 text-right font-mono text-sm tabular-nums text-text-muted">
                {tot.lh}
              </td>
              <td className="px-2 py-2 text-right font-mono text-sm tabular-nums text-gold">
                {tot.gpm}
              </td>
              <td />
              <td className="px-2 py-2 text-right font-mono text-sm tabular-nums text-gold">
                {fmtK(tot.nw)}
              </td>
              <td className="px-2 py-2 text-right font-mono text-sm tabular-nums text-text-muted">
                {fmtK(tot.dmg)}
              </td>
              <td />
              <td className="px-2 py-2 text-right font-mono text-sm tabular-nums text-text-muted">
                {fmtK(tot.heal)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function MatchScoreboard({
  radiant,
  dire,
  radiantWin,
  mvpUserId = null,
}: {
  radiant: ScoreboardPlayer[];
  dire: ScoreboardPlayer[];
  radiantWin: boolean | null;
  mvpUserId?: string | null;
}) {
  const t = useTranslations("scoreboard");
  return (
    <div className="space-y-4">
      <TeamTable
        title={t("teamRadiant")}
        accent="text-[#00C466]"
        won={radiantWin == null ? null : radiantWin}
        players={radiant}
        mvpUserId={mvpUserId}
      />
      <TeamTable
        title={t("teamDire")}
        accent="text-brand-primary"
        won={radiantWin == null ? null : !radiantWin}
        players={dire}
        mvpUserId={mvpUserId}
      />
    </div>
  );
}
