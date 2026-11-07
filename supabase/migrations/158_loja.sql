-- 158_loja.sql: a loja do site (06/11/2026). Catálogo, pedidos e visita por origem.
-- Spec: docs/loja/spec.md. Tabelas separadas de packages/purchases (fichas), que carregam
-- crédito em ledger, RLS de doutrina e Steam vinculado: a loja vende serviço com formulário próprio.
-- Escrita só pelo service role (ações do servidor e webhook); leitura pública só do catálogo ativo.

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind text not null default 'servico' check (kind in ('servico', 'digital')),
  title text not null check (char_length(title) between 2 and 80),
  summary text not null default '',
  description_md text not null default '',
  -- O que acontece depois do pagamento: aparece na confirmação e no aviso de venda.
  delivery_md text not null default '',
  -- O que o checkout pede além de nome, e-mail e WhatsApp.
  form_fields text[] not null default '{}'
    check (form_fields <@ array['discord', 'dota_id', 'mmr_atual', 'mmr_alvo', 'observacoes']::text[]),
  requires_login boolean not null default false,
  active boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (char_length(label) between 1 and 80),
  -- De R$ 1,00 a R$ 10.000,00: preço fora disso é erro de digitação, não oferta.
  price_cents integer not null check (price_cents between 100 and 1000000),
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, slug)
);
create index if not exists store_product_variants_product_idx
  on public.store_product_variants (product_id, display_order);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products (id),
  variant_id uuid not null references public.store_product_variants (id),
  -- Retrato do que foi vendido: mudar o catálogo depois não reescreve o pedido.
  product_title text not null,
  variant_label text not null,
  amount_cents integer not null check (amount_cents > 0),
  user_id uuid references auth.users (id) on delete set null,
  buyer_name text not null check (char_length(buyer_name) between 2 and 120),
  buyer_email text not null check (char_length(buyer_email) between 5 and 254),
  -- Só dígitos, com DDI: 55 + DDD + número.
  buyer_whatsapp text not null check (buyer_whatsapp ~ '^[0-9]{12,13}$'),
  details jsonb not null default '{}'::jsonb,
  payment_method text not null check (payment_method in ('pix', 'cartao')),
  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'em_revisao', 'expirado', 'cancelado', 'reembolsado')),
  mp_payment_id text,
  mp_preference_id text,
  pix_copia_e_cola text,
  pix_qr_base64 text,
  pix_expires_at timestamptz,
  paid_amount_cents integer,
  gateway_payload jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer_host text,
  landing_path text,
  is_test boolean not null default false,
  -- Última conciliação com o Mercado Pago: segura a página do pedido a uma consulta a cada 3 s.
  checked_at timestamptz,
  paid_at timestamptz,
  notified_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists store_orders_created_idx on public.store_orders (created_at desc);
create index if not exists store_orders_status_idx on public.store_orders (status, created_at desc);
create index if not exists store_orders_user_idx on public.store_orders (user_id) where user_id is not null;
-- Um pagamento confirma um pedido só.
create unique index if not exists store_orders_mp_payment_uidx
  on public.store_orders (mp_payment_id) where mp_payment_id is not null;

create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- Aleatório por aba do navegador: conta a visita uma vez, sem identificar a pessoa.
  session_id text not null unique check (char_length(session_id) between 8 and 64),
  path text not null check (char_length(path) between 1 and 300),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer_host text,
  country text
);
create index if not exists site_visits_created_idx on public.site_visits (created_at desc);

alter table public.store_products enable row level security;
alter table public.store_product_variants enable row level security;
alter table public.store_orders enable row level security;
alter table public.site_visits enable row level security;

drop policy if exists store_products_read on public.store_products;
create policy store_products_read on public.store_products
  for select using (active = true or (select public.is_admin()));

drop policy if exists store_product_variants_read on public.store_product_variants;
create policy store_product_variants_read on public.store_product_variants
  for select using (
    (active = true and exists (
      select 1 from public.store_products p where p.id = product_id and p.active = true
    ))
    or (select public.is_admin())
  );

-- Comprador logado lê os próprios pedidos; admin lê todos. Ninguém escreve pelo cliente.
drop policy if exists store_orders_read on public.store_orders;
create policy store_orders_read on public.store_orders
  for select using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists site_visits_read on public.site_visits;
create policy site_visits_read on public.site_visits
  for select using ((select public.is_admin()));

-- Flag autoritativa: desligada, /loja some para todos (liga no go-live).
insert into public.feature_flags (key, enabled, label)
values ('loja', false, 'Loja do site')
on conflict (key) do nothing;
