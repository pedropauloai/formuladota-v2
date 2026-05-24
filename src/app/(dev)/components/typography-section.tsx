/**
 * TypographySection — FormulaDota V2.5-F8 (DF8.4)
 *
 * Showcase ao vivo das 3 famílias tipográficas ativas na plataforma.
 * Permite avaliar weight, size e tracking pra decidir o que padronizar.
 *
 * Fontes carregadas em src/app/layout.tsx (2026-05-23 — Cinzel removida):
 *   - Geist Sans Variable  → font-body / font-display / font-sans
 *   - Geist Mono Variable  → font-mono
 *   - Teko Variable        → font-display-condensed
 *
 * Renderiza dentro de page.tsx (Client Component), mas em si é puro
 * (sem hooks/state) — apenas JSX + Tailwind.
 */

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Sub-componente: linha "amostra | classe Tailwind"
// ---------------------------------------------------------------------------

interface SampleRowProps {
  /** Texto da amostra renderizado com a classe alvo */
  sample: string;
  /** Classe(s) Tailwind aplicadas — também mostradas como código ao lado */
  className: string;
  /** Notas opcionais de uso (ex: "Padrão de labels admin") */
  note?: string;
}

function SampleRow({ sample, className, note }: SampleRowProps) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-6 items-center border-b border-border-subtle/40 py-3 last:border-b-0">
      <div className="space-y-1 min-w-0">
        <div className={cn("text-text-display truncate", className)}>
          {sample}
        </div>
        {note && (
          <p className="text-[10px] text-text-faded font-mono uppercase tracking-widest">
            {note}
          </p>
        )}
      </div>
      <code className="text-[10px] font-mono text-text-muted bg-bg-elevated px-2 py-1 rounded border border-border-subtle whitespace-nowrap">
        {className}
      </code>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: cabeçalho de cada família tipográfica
// ---------------------------------------------------------------------------

interface FontHeaderProps {
  /** Nome técnico da fonte (ex: "Geist Sans Variable") */
  name: string;
  /** Token Tailwind correspondente (ex: "font-body, font-sans") */
  token: string;
  /** Pra que serve essa fonte na plataforma */
  purpose: string;
  /** Sample grande renderizado em hero, mostrando o "feel" da fonte */
  heroSample: string;
  /** Classe Tailwind do hero sample */
  heroClassName: string;
}

function FontHeader({ name, token, purpose, heroSample, heroClassName }: FontHeaderProps) {
  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h3 className="font-display text-xl text-text-display tracking-wide">
          {name}
        </h3>
        <code className="text-xs font-mono text-brand-primary">{token}</code>
      </div>
      <p className="text-sm text-text-muted max-w-2xl">{purpose}</p>
      <div
        className={cn(
          "text-text-display py-6 px-6 bg-bg-elevated rounded-md border border-border-subtle",
          heroClassName
        )}
      >
        {heroSample}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function TypographySection() {
  return (
    <section className="space-y-4">
      {/* Title bar (segue padrão Section do page.tsx) */}
      <div className="flex items-center gap-3">
        <h2 className="font-display text-2xl text-text-display tracking-wide">
          Tipografia
        </h2>
        <div className="flex-1 h-px bg-border-subtle" />
        <span className="text-[10px] font-mono text-text-faded uppercase tracking-widest">
          3 famílias · 4 tokens
        </span>
      </div>

      {/* Nota explicativa do estado atual */}
      <div className="bg-bg-elevated/50 border-l-2 border-brand-primary/60 px-4 py-3 rounded-r">
        <p className="text-xs text-text-muted leading-relaxed">
          <span className="text-brand-primary font-mono uppercase tracking-widest text-[10px]">
            Atualizado 2026-05-23
          </span>
          <br />
          Cinzel foi <strong className="text-text-body">removida</strong> (estética serif medieval
          conflitava com vibe game-client AAA). Display e body agora compartilham Geist Sans —
          diferenciados por <code className="font-mono text-brand-primary">weight</code> e{" "}
          <code className="font-mono text-brand-primary">tracking</code>.
        </p>
      </div>

      <div className="space-y-12 pt-4">
        {/* ============================================================== */}
        {/* 1. GEIST SANS — font-body (corpo padrão)                       */}
        {/* ============================================================== */}
        <div>
          <FontHeader
            name="Geist Sans Variable"
            token="font-body · font-sans"
            purpose="Corpo de texto padrão de toda a plataforma. Geometria neutra e legível, sem personalidade competindo com o conteúdo. Mesma fonte do display, mas em weights menores e sem tracking."
            heroSample="A doutrina é o caminho. A medalha é a consequência."
            heroClassName="font-body text-2xl font-normal"
          />

          <div className="space-y-1">
            <SampleRow
              sample="A doutrina é o caminho."
              className="font-body text-xs font-normal"
              note="text-xs — captions, footnotes"
            />
            <SampleRow
              sample="A doutrina é o caminho."
              className="font-body text-sm font-normal"
              note="text-sm — descrições, metadata"
            />
            <SampleRow
              sample="A doutrina é o caminho."
              className="font-body text-base font-normal"
              note="text-base — padrão de parágrafo"
            />
            <SampleRow
              sample="A doutrina é o caminho."
              className="font-body text-lg font-medium"
              note="text-lg + medium — destaque inline"
            />
            <SampleRow
              sample="A doutrina é o caminho."
              className="font-body text-xl font-semibold"
              note="text-xl + semibold — sub-cabeçalhos suaves"
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. GEIST SANS — font-display (cabeçalhos game-client)          */}
        {/* ============================================================== */}
        <div>
          <FontHeader
            name="Geist Sans Variable — modo Display"
            token="font-display"
            purpose="Cabeçalhos de seção, títulos de card, marcadores de identidade. Mesma família do body, mas com tracking mais aberto e (frequentemente) uppercase — pra evocar a hierarquia visual de clientes AAA (Steam, Battle.net, Riot Client)."
            heroSample="FORMULADOTA"
            heroClassName="font-display text-5xl tracking-wide font-bold"
          />

          <div className="space-y-1">
            <SampleRow
              sample="FORMULADOTA"
              className="font-display text-[10px] uppercase tracking-[0.4em] text-brand-primary"
              note="Eyebrow — sobre títulos hero (subtitle de identidade)"
            />
            <SampleRow
              sample="Componentes & Tokens"
              className="font-display text-2xl tracking-wide"
              note="Section title — padrão das seções deste catalog"
            />
            <SampleRow
              sample="Game Client Brasileiro"
              className="font-display text-4xl tracking-wide font-semibold"
              note="Page title — cabeçalho principal de página"
            />
            <SampleRow
              sample="FORMULADOTA"
              className="font-display text-6xl tracking-wide font-bold uppercase"
              note="Hero — landing, splash, takeovers"
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. TEKO — font-display-condensed (moments épicos)              */}
        {/* ============================================================== */}
        <div>
          <FontHeader
            name="Teko Variable"
            token="font-display-condensed"
            purpose="Fonte condensada vertical pra moments épicos: countdown de partida, indicadores de streak, números grandes, banners 'AO VIVO'. Estética esports (GamersClub, FACEIT). Use com parcimônia — perde impacto se usado em tudo."
            heroSample="03:47:12"
            heroClassName="font-display-condensed text-7xl tracking-wide tabular-nums text-warning"
          />

          <div className="space-y-1">
            <SampleRow
              sample="AO VIVO"
              className="font-display-condensed text-sm uppercase tracking-widest text-success"
              note="Status indicator — banner sticky 'em fila / em match'"
            />
            <SampleRow
              sample="SEASON 1"
              className="font-display-condensed text-xl uppercase tracking-widest"
              note="Marcador de temporada — header e cards"
            />
            <SampleRow
              sample="ON FIRE!"
              className="font-display-condensed text-3xl uppercase tracking-wide text-warning font-bold"
              note="Overlay momentum — quando jogador está em streak"
            />
            <SampleRow
              sample="03:47:12"
              className="font-display-condensed text-5xl tracking-wide tabular-nums"
              note="Countdown numérico — fila, season banner"
            />
            <SampleRow
              sample="VITÓRIA"
              className="font-display-condensed text-6xl uppercase tracking-wider font-bold text-success"
              note="Cerimônia pós-match — fullscreen takeover"
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. GEIST MONO — font-mono (labels técnicas)                    */}
        {/* ============================================================== */}
        <div>
          <FontHeader
            name="Geist Mono Variable"
            token="font-mono"
            purpose="Labels técnicas, números tabulares, IDs de partida, timestamps, badges de meta-info. Quase sempre em uppercase com tracking largo — emula console/terminal de game client. Não usar em corpo de texto."
            heroSample="MATCH_ID: 7842091203"
            heroClassName="font-mono text-base tracking-wide text-text-body"
          />

          <div className="space-y-1">
            <SampleRow
              sample="HONOR · TIER 5"
              className="font-mono text-[10px] uppercase tracking-widest text-text-muted"
              note="Pattern dominante — labels de section internas"
            />
            <SampleRow
              sample="3 / 5 fichas restantes"
              className="font-mono text-xs text-text-body"
              note="Counter — metadata de saldo, progresso"
            />
            <SampleRow
              sample="2026-05-24 19:30:00"
              className="font-mono text-xs text-text-faded tabular-nums"
              note="Timestamp — sempre tabular-nums pra alinhamento"
            />
            <SampleRow
              sample="MATCH_ID 7842091203"
              className="font-mono text-sm tracking-wide text-brand-primary"
              note="ID destacado — link clicável pra OpenDota"
            />
            <SampleRow
              sample="R$ 1.420,00"
              className="font-mono text-lg tabular-nums font-semibold text-text-display"
              note="Valor monetário — sempre tabular-nums + mono"
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* 5. COMPARAÇÃO PRINCIPAL — display vs body lado a lado           */}
        {/* ============================================================== */}
        <div>
          <div className="flex items-baseline gap-3 mb-4">
            <h3 className="font-display text-xl text-text-display tracking-wide">
              Comparação: Display vs Body
            </h3>
            <span className="text-[10px] font-mono text-text-faded uppercase tracking-widest">
              mesma fonte Geist, hierarquia por tracking
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-bg-elevated rounded-md border border-border-subtle p-6 space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-widest text-text-faded">
                font-display + tracking-wide
              </p>
              <p className="font-display text-3xl tracking-wide text-text-display">
                COMUNIDADE
              </p>
              <p className="text-xs text-text-muted">
                Tracking aberto + uppercase = autoridade, marcador de identidade.
              </p>
            </div>

            <div className="bg-bg-elevated rounded-md border border-border-subtle p-6 space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-widest text-text-faded">
                font-body (sem tracking)
              </p>
              <p className="font-body text-3xl font-normal text-text-display">
                Comunidade
              </p>
              <p className="text-xs text-text-muted">
                Tracking padrão + case natural = legibilidade, narrativa.
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 6. AVISOS E REGRAS                                              */}
        {/* ============================================================== */}
        <div>
          <div className="flex items-baseline gap-3 mb-4">
            <h3 className="font-display text-xl text-text-display tracking-wide">
              Regras
            </h3>
          </div>

          <ul className="space-y-2 text-sm text-text-muted">
            <li className="flex gap-3">
              <span className="text-brand-primary font-mono shrink-0">→</span>
              <span>
                <strong className="text-text-body">FORMULADOTA sempre maiúsculo, sem acento</strong>{" "}
                (regra B1) — quando aparecer como marca, use <code className="font-mono text-xs text-brand-primary">font-display tracking-wide uppercase</code>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-primary font-mono shrink-0">→</span>
              <span>
                <strong className="text-text-body">Teko apenas em moments épicos</strong> — countdown,
                streak overlays, cerimônias pós-match. Não usar em cabeçalhos comuns (use{" "}
                <code className="font-mono text-xs text-brand-primary">font-display</code> Geist).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-primary font-mono shrink-0">→</span>
              <span>
                <strong className="text-text-body">font-mono nunca em corpo</strong> — apenas labels,
                IDs, números tabulares e timestamps. Body sempre Geist Sans.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-primary font-mono shrink-0">→</span>
              <span>
                <strong className="text-text-body">tabular-nums obrigatório</strong> em qualquer
                número que vá ser comparado vertical ou horizontalmente (countdowns, valores,
                rankings) — evita &ldquo;dança&rdquo; de dígitos.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-error font-mono shrink-0">×</span>
              <span>
                <strong className="text-text-body">Não introduzir novas fontes</strong> sem alinhar
                — Cinzel, Marcellus, Inter já foram removidas. Adicionar fonte = decisão de produto,
                não de implementação.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
