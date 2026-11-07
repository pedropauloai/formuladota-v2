-- 160_loja_catalogo.sql: catálogo da versão B ("Hora do Imortal"), escolhida pelo Pedro em 07/11/2026.
-- Decisão, preços e textos: docs/loja/catalogo.md. O curso de Tinker (pré-venda de R$ 197) entra
-- quando o Pedro cravar a data de entrega, por isso não está aqui.

-- Como o produto aparece e cobra: onde acontece, arte oficial do Dota, unidade do preço,
-- quantidade por pedido, vagas por mês e faixas de preço do boost.
alter table public.store_products
  add column if not exists mode text not null default 'agendado',
  add column if not exists art text,
  add column if not exists price_unit text not null default '',
  add column if not exists max_quantity integer not null default 1,
  add column if not exists monthly_capacity integer,
  add column if not exists mmr_tiers jsonb,
  add column if not exists is_test boolean not null default false;

alter table public.store_products drop constraint if exists store_products_mode_check;
alter table public.store_products add constraint store_products_mode_check
  check (mode in ('live', 'gravado', 'fora_da_live', 'agendado', 'digital'));

alter table public.store_products drop constraint if exists store_products_art_check;
alter table public.store_products add constraint store_products_art_check
  check (art is null or art ~ '^(item|hero):[a-z0-9_]+$' or art = 'medalhas');

alter table public.store_products drop constraint if exists store_products_price_unit_check;
alter table public.store_products add constraint store_products_price_unit_check
  check (char_length(price_unit) <= 30);

alter table public.store_products drop constraint if exists store_products_max_quantity_check;
alter table public.store_products add constraint store_products_max_quantity_check
  check (max_quantity between 1 and 20);

alter table public.store_products drop constraint if exists store_products_monthly_capacity_check;
alter table public.store_products add constraint store_products_monthly_capacity_check
  check (monthly_capacity is null or monthly_capacity between 1 and 1000);

-- Faixas do boost: [{"up_to": 5000, "cents_per_100": 9900}, ...], em ordem crescente.
alter table public.store_products drop constraint if exists store_products_mmr_tiers_check;
alter table public.store_products add constraint store_products_mmr_tiers_check
  check (mmr_tiers is null or (jsonb_typeof(mmr_tiers) = 'array' and jsonb_array_length(mmr_tiers) between 1 and 10));

-- ID da partida entra no formulário (análise e replay ao vivo).
alter table public.store_products drop constraint if exists store_products_form_fields_check;
alter table public.store_products add constraint store_products_form_fields_check
  check (form_fields <@ array['discord', 'dota_id', 'mmr_atual', 'mmr_alvo', 'match_id', 'observacoes']::text[]);

alter table public.store_orders add column if not exists quantity integer not null default 1;
alter table public.store_orders drop constraint if exists store_orders_quantity_check;
alter table public.store_orders add constraint store_orders_quantity_check check (quantity between 1 and 20);

-- Conta das vagas do mês por produto.
create index if not exists store_orders_product_created_idx on public.store_orders (product_id, created_at desc);

-- O produto do teste de ponta a ponta só aparece com credencial de teste.
update public.store_products set is_test = true where slug = 'e2e-teste';

insert into public.store_products
  (slug, kind, title, summary, description_md, delivery_md, form_fields, requires_login, active,
   display_order, mode, art, price_unit, max_quantity, monthly_capacity, mmr_tiers)
values
  ('acompanhamento-30-dias', 'servico', 'Acompanhamento 30 dias',
   'Quatro mentorias, até oito partidas analisadas e WhatsApp direto com o Pedro durante 30 dias.',
   $md$Trinta dias com o Pedro acompanhando o seu jogo de perto.

- Quatro mentorias ao vivo de 90 minutos, no Discord.
- Até oito partidas suas analisadas ao longo do mês.
- WhatsApp direto com o Pedro durante os 30 dias.

São 3 vagas por mês, porque o tempo do Pedro fora da live é contado.$md$,
   $md$- Pague com Pix ou cartão.
- O Pedro chama você no WhatsApp para marcar a primeira mentoria.
- Os 30 dias começam na data que vocês combinarem.$md$,
   array['discord', 'dota_id', 'mmr_atual', 'observacoes'], false, true,
   10, 'agendado', 'item:ultimate_scepter', '', 1, 3, null),

  ('mentoria', 'servico', 'Mentoria 1:1',
   '90 minutos ao vivo com o Pedro, com dois replays seus revisados antes.',
   $md$Uma sessão de 90 minutos ao vivo, só você e o Pedro. Antes dela, ele revisa duas partidas suas, e a conversa começa pelo que os replays mostraram.

- Dois replays seus revisados antes da sessão.
- 90 minutos ao vivo no Discord.
- No fim, você leva o que treinar nas próximas partidas.

São 8 vagas por mês, porque o tempo do Pedro fora da live é contado.$md$,
   $md$- Pague com Pix ou cartão.
- O Pedro chama você no WhatsApp para marcar o dia e receber os IDs das duas partidas.
- No dia marcado, a mentoria acontece no Discord.$md$,
   array['discord', 'dota_id', 'mmr_atual', 'observacoes'], false, true,
   20, 'agendado', 'item:aghanims_shard', '', 1, 8, null),

  ('vaga-na-party', 'servico', 'Vaga na party da live',
   'Você entra na party da live e joga com o Pedro, com a partida transmitida no canal.',
   $md$Você joga no mesmo time do Pedro durante a live, e a partida vai ao ar no canal do FORMULADOTA pela visão dele.

- Cada vaga vale uma partida. Dá para comprar até 5 de uma vez.
- A live fica gravada no canal para você rever.$md$,
   $md$- Pague com Pix ou cartão.
- O Pedro chama você no WhatsApp para combinar a live e a partida.
- Na hora, ele convida você pelo ID do Dota.$md$,
   array['dota_id', 'mmr_atual', 'observacoes'], false, true,
   30, 'live', 'item:smoke_of_deceit', 'por partida', 5, null, null),

  ('replay-ao-vivo', 'servico', 'Seu replay ao vivo',
   'O Pedro analisa uma partida sua na live, em hora marcada e na frente da fila de membros.',
   $md$O Pedro abre o replay de uma partida sua durante a live e mostra, no tempo do jogo, as decisões que pesaram no resultado.

- Com hora marcada, o seu replay passa na frente da fila de membros do canal.
- Vale qualquer posição e qualquer faixa de MMR.
- A análise fica gravada na live para você rever.

Escolha uma partida recente, porque o Dota guarda o replay só por alguns dias.$md$,
   $md$- Pague e informe o ID da partida.
- O Pedro chama você no WhatsApp para marcar a live.
- Na live, o seu replay entra na frente da fila.$md$,
   array['match_id', 'mmr_atual', 'observacoes'], false, true,
   40, 'live', 'item:ward_observer', '', 1, null, null),

  ('jogar-junto', 'servico', 'Jogar junto',
   'Duo particular com o Pedro fora da live, com voz no Discord.',
   $md$Uma partida em duo com o Pedro, fora da live e sem transmissão, conversando no Discord do draft ao fim do jogo.

- Cada unidade vale uma partida. Dá para comprar até 5 de uma vez.
- Pergunte o que quiser enquanto joga. A conversa fica entre vocês dois.$md$,
   $md$- Pague com Pix ou cartão.
- O Pedro chama você no WhatsApp para marcar o horário.
- Na hora, ele chama você no Discord e convida pelo ID do Dota.$md$,
   array['discord', 'dota_id', 'mmr_atual', 'observacoes'], false, true,
   50, 'fora_da_live', 'item:tango', 'por partida', 5, null, null),

  ('analise-gravada', 'servico', 'Análise gravada completa',
   '30 minutos de vídeo com cada decisão da sua partida marcada no tempo.',
   $md$O Pedro assiste a uma partida sua inteira e grava 30 minutos de análise, com cada decisão importante marcada no minuto em que aconteceu.

- O vídeo é seu, para assistir quantas vezes quiser.
- Cada ponto vem com o minuto da partida, para você conferir no replay.
- Vale qualquer posição e qualquer faixa de MMR.

Escolha uma partida recente, porque o Dota guarda o replay só por alguns dias.$md$,
   $md$- Pague e informe o ID da partida.
- O Pedro chama você no WhatsApp para confirmar a partida e combinar o prazo.
- O vídeo chega pelo WhatsApp.$md$,
   array['match_id', 'mmr_atual', 'observacoes'], false, true,
   60, 'gravado', 'item:gem', '', 1, null, null),

  ('boost-de-mmr', 'servico', 'Boost de MMR',
   'R$ 99 a cada 100 MMR até 5 mil e R$ 149 de 5 mil a 6,5 mil.',
   $md$O Pedro leva o seu MMR do atual até o alvo que você escolher, com teto de 6.500.

- Até 5.000 de MMR, R$ 99 a cada 100.
- De 5.000 a 6.500, R$ 149 a cada 100.
- Mínimo de 100 MMR por pedido.

A calculadora mostra o valor antes do pagamento.$md$,
   $md$- Informe o MMR atual e o alvo e pague com Pix ou cartão.
- O Pedro chama você no WhatsApp para combinar como o serviço acontece.
- O site não pede nem guarda senha de conta.$md$,
   array['dota_id', 'mmr_atual', 'mmr_alvo', 'observacoes'], false, true,
   70, 'fora_da_live', 'medalhas', 'a cada 100 MMR', 1, null,
   '[{"up_to": 5000, "cents_per_100": 9900}, {"up_to": 6500, "cents_per_100": 14900}]'::jsonb)
on conflict (slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  summary = excluded.summary,
  description_md = excluded.description_md,
  delivery_md = excluded.delivery_md,
  form_fields = excluded.form_fields,
  requires_login = excluded.requires_login,
  active = excluded.active,
  display_order = excluded.display_order,
  mode = excluded.mode,
  art = excluded.art,
  price_unit = excluded.price_unit,
  max_quantity = excluded.max_quantity,
  monthly_capacity = excluded.monthly_capacity,
  mmr_tiers = excluded.mmr_tiers,
  updated_at = now();

-- Uma opção por produto: o preço da versão B.
insert into public.store_product_variants (product_id, slug, label, price_cents, active, display_order)
select p.id, v.slug, v.label, v.price_cents, true, 0
from (values
  ('acompanhamento-30-dias', 'unica', '30 dias', 89700),
  ('mentoria', 'unica', '90 minutos', 24700),
  ('vaga-na-party', 'unica', 'Por partida', 2500),
  ('replay-ao-vivo', 'unica', '1 replay', 3900),
  ('jogar-junto', 'unica', 'Por partida', 4900),
  ('analise-gravada', 'unica', '1 partida', 9700),
  ('boost-de-mmr', 'unica', 'A cada 100 MMR', 9900)
) as v (product_slug, slug, label, price_cents)
join public.store_products p on p.slug = v.product_slug
on conflict (product_id, slug) do update set
  label = excluded.label,
  price_cents = excluded.price_cents,
  active = true;
