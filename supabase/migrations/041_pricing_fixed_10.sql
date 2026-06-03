-- 041 — Reversão do pricing descentralizado pro PREÇO FIXO R$ 10/ficha (Pedro 2026-06-02).
-- O modelo descentralizado (PRO edita preço, teto por tier HONOR, cooldown) foi descartado.
-- Código removido: src/app/pro/pricing-actions.ts + src/components/pro/price-editor-card.tsx.
-- As tabelas/colunas do modelo antigo (package_price_history, packages.last_price_change_at,
-- RPCs get_max_price_for_pro/can_change_price) ficam no banco mas DEIXAM de ser usadas —
-- não dropadas aqui pra evitar migração destrutiva; podem ser limpas depois.
-- Aplicado em prod via Supabase MCP em 2026-06-02 (data update).

update public.packages set preco_brl = 10.00 where tipo = 'avulso';
