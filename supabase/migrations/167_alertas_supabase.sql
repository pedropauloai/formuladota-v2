-- 167: ajustes apontados pelos alertas do Supabase (Security e Performance Advisor), 18/11/2026.

-- Caminho de busca fixo: sem ele, quem chama pode trocar o search_path e desviar a função.
-- As duas só usam funções nativas (pg_catalog entra sempre), então o caminho vazio basta.
alter function public.slugify_handle(text) set search_path = '';
alter function public.set_changelog_updated_at() set search_path = '';

-- Índices nas chaves estrangeiras da loja: sem eles, apagar o produto ou a variante varre a tabela.
create index if not exists store_bookings_product_id_idx on public.store_bookings (product_id);
create index if not exists store_orders_variant_id_idx on public.store_orders (variant_id);

-- auth.uid() dentro de (select ...): o Postgres avalia uma vez por consulta, não uma vez por linha.
-- A regra continua a mesma, só muda a forma.
alter policy queue_insert_self on public.match_queue
  with check (
    ((select auth.uid()) = user_id)
    and (
      (not public.quiz_enabled())
      or public.has_accepted_doctrine((select auth.uid()))
      or (public.available_match_permissions((select auth.uid())) >= 1)
      or coalesce((select p.is_tester from public.profiles p where p.id = (select auth.uid())), false)
    )
  );

alter policy subscriptions_delete_own_inactive on public.subscriptions
  using (
    ((select auth.uid()) = user_id)
    and (status = any (array['pending'::text, 'cancelled'::text, 'paused'::text]))
  );
