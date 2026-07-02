// Placar pós-jogo de uma partida FormulaDota — estilo cliente Dota 2 / Dotabuff.
// Server component puro (sem interatividade): recebe os jogadores já resolvidos
// (identidade + herói + itens) e renderiza os dois times com TODAS as estatísticas
// disponíveis em match_players. Denso e compacto por decisão de design (cliente real).

import Image from "next/image";
import Link from "next/link";
import { itemImageUrl } from "@/lib/queries/items";

export interface ScoreboardPlayer {
  userId: string | null;
  name: string;
  avatar: string | null;
  profileHref: string | null;
  heroName: string;
  heroPortrait: string | null;
  level: number;
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
  /** Participação em teamfights (0..1) — coluna CA. */
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
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-2 py-2 text-right font-display text-[0.65rem] font-bold uppercase tracking-wide text-text-faded ${className}`}
    >
      {children}
    </th>
  );
}

function PlayerCell({ p }: { p: ScoreboardPlayer }) {
  const inner = (
    <span className="flex items-center gap-2.5">
      {/* Portrait do herói com badge de nível sobreposto. */}
      <span className="relative shrink-0">
        {p.heroPortrait ? (
          <Image
            src={p.heroPortrait}
            alt={p.heroName}
            title={p.heroName}
            width={48}
            height={32}
            unoptimized
            className="h-8 w-12 rounded-sm object-cover"
          />
        ) : (
          <span className="block h-8 w-12 rounded-sm bg-bg-elevated" aria-hidden="true" />
        )}
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-sm bg-bg-base px-1 font-display text-[0.6rem] font-bold tabular-nums text-gold ring-1 ring-border-subtle">
          {p.level}
        </span>
      </span>
      {/* Avatar do usuário (quadrado, padrão Steam) + nome + herói. */}
      <span className="flex min-w-0 items-center gap-2">
        {p.avatar ? (
          <Image
            src={p.avatar}
            alt=""
            width={24}
            height={24}
            unoptimized
            className="size-6 shrink-0 rounded-sm object-cover"
          />
        ) : null}
        <span className="min-w-0">
          <span className="block truncate font-body text-sm font-medium text-text-display">
            {p.name}
          </span>
          <span className="block truncate font-display text-[0.7rem] uppercase tracking-wide text-text-faded">
            {p.heroName}
          </span>
        </span>
      </span>
    </span>
  );

  if (p.profileHref) {
    return (
      <Link href={p.profileHref} className="transition-opacity hover:opacity-80">
        {inner}
      </Link>
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
}: {
  title: string;
  accent: string;
  won: boolean | null;
  players: ScoreboardPlayer[];
}) {
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
            {won ? "Vitória" : "Derrota"}
          </span>
        )}
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle/60">
              <th className="px-3 py-2 text-left font-display text-[0.65rem] font-bold uppercase tracking-wide text-text-faded">
                Jogador
              </th>
              <Th>K / D / A</Th>
              <Th>MMR</Th>
              <Th>CA</Th>
              <Th>LH / DN</Th>
              <Th>GPM</Th>
              <Th>XPM</Th>
              <Th>Patrim.</Th>
              <Th>Dano</Th>
              <Th>Torres</Th>
              <Th>Cura</Th>
              <th className="px-3 py-2 text-left font-display text-[0.65rem] font-bold uppercase tracking-wide text-text-faded">
                Itens
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40">
            {players.map((p, i) => (
              <tr key={p.userId ?? `${title}-${i}`} className="hover:bg-bg-surface/40">
                <td className="px-3 py-2.5">
                  <PlayerCell p={p} />
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
                Totais
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
}: {
  radiant: ScoreboardPlayer[];
  dire: ScoreboardPlayer[];
  radiantWin: boolean | null;
}) {
  return (
    <div className="space-y-4">
      <TeamTable
        title="Iluminados"
        accent="text-[#00C466]"
        won={radiantWin == null ? null : radiantWin}
        players={radiant}
      />
      <TeamTable
        title="Temidos"
        accent="text-brand-primary"
        won={radiantWin == null ? null : !radiantWin}
        players={dire}
      />
    </div>
  );
}
