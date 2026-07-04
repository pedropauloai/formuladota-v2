# INTERNATIONAL — 3 regiões, 3 idiomas, tiers Plus/Premium

> Fonte da verdade da expansão internacional (Pedro, 2026-07-04).
> Código canônico: `src/lib/regions.ts` · `src/lib/subscriptions/tiers.ts` · `src/i18n/config.ts`.

## Modelo de negócio

**Freemium matchmaking.** FREE = jogar (fila, ranking, doutrina). Pagos: **Plus** e
**Premium**. Fichas avulsas NÃO são vendidas (ranked-com-pro é feature flag desligada).
Assinatura NUNCA compra vantagem competitiva (MMR, fila, medalha, permissão) — compra
conveniência, cosmético e acesso. A cultura é o produto.

## As 3 regiões de JOGO (`profiles.region`, migration 121)

| Região | Idioma típico | Provedor | Plus | Premium | Servidor Dota (bot) |
|--------|--------------|----------|------|---------|---------------------|
| 🇧🇷 BR | pt | Mercado Pago (Pix Automático) | R$ 27,90 | R$ 97,90 | Brazil (10) |
| 🌎 LATAM | es | Stripe (USD) | US$ 4,99 | US$ 17,99 | Peru (15) |
| 🇪🇺 EU | en | Stripe (EUR) | € 6,99 | € 19,99 | EU West (3) |

**LEIS:**
- **BR NÃO É LATAM.** Filas e comunidades NUNCA se misturam (servidores Dota separados,
  rivalidade BR×Peru). `try_form_match` particiona por região; party com regiões
  misturadas é bloqueada (`region_mismatch`).
- **Região é escolha ÚNICA** no onboarding (`/vincular/steam`); mudança só via admin
  (`updateUserRegionAdmin`). Coluna congelada pro self-write (padrão migration 117).
- **Idioma NÃO define região de jogo** — eixos independentes (um peruano pode usar a
  UI em inglês e jogar na fila LATAM).
- Leaderboards e temporadas são POR REGIÃO (`player_season_mmr.region`).

## Os 3 idiomas da UI (pt / en / es)

- `defaultLocale: en` (beachhead internacional). Resolução: cookie `NEXT_LOCALE`
  (escolha manual SEMPRE vence) → `Accept-Language` (pt*→pt, es*→es, resto→en) →
  `x-vercel-ip-country` (BR→pt, América hispânica→es, resto→en).
- Espanhol LatAm NEUTRO ("ustedes", nunca "vosotros"); termos Dota ficam em inglês
  (mid, carry, gank…). Marca em espanhol é MASCULINA: "el FORMULADOTA".
- Slugs de URL traduzidos: `/torneios` | `/tournaments` | `/torneos` (ver
  `src/i18n/pathnames.ts`). SEO: hreflang + sitemap + robots.

## Tiers (migration 122)

- **Plus**: criar salas · XP boost no passe · cosméticos exclusivos · flair de assinante.
- **Premium**: tudo do Plus + lobby elite Imortal (mantém gates de skill: Imortal
  Valve + Místico nv30) · XP boost maior · cosméticos Godlike · prioridade/análise com PRO.
- Hierarquia no SQL: `has_subscription_tier('plus')` é satisfeito por premium;
  `can_join_elite` exige premium. Admin conta como premium.
- Mudar preço/benefício = aprovação Pedro (atualizar `tiers.ts` + views da migration 123).

## Provedores de pagamento

- **Rota canônica de planos/assinatura = `/planos`** (dentro do ClientShell —
  filosofia "tudo é client" 2026-05-24). `/assinatura` é redirect permanente de
  compat (back_urls antigos do MP). Slugs: `/planos` | `/plans` | `/planes`.
- **BR → Mercado Pago** (Pix Automático/preapproval, webhook validado em produção).
- **LATAM/EU → Stripe** (Checkout Session + Customer Portal + webhook
  `/api/webhooks/stripe`). Setup one-off: `scripts/stripe-setup.ts`.
- `subscriptions.provider` ('mp'|'stripe') separa os mundos; cada webhook só toca
  nas próprias linhas.

## Analytics admin (migration 123)

Views `admin_signups_daily`, `admin_active_users_daily` (proxy xp_events),
`admin_matches_daily`, `admin_revenue_monthly` (por provider/região/MOEDA — BRL, USD
e EUR nunca se somam), `admin_subs_by_tier_region` (MRR snapshot). Dashboard
`/admin/dashboard` filtra por range + região. Funil de produto: PostHog (projeto US
497134).
