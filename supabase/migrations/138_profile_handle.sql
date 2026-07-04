-- 138_profile_handle.sql — Handle público na URL de perfil — Pedro 2026-07-04.
--
-- Troca o UUID em /perfil/u/<uuid> por um slug legível e único: /perfil/<handle>
-- (ex.: /perfil/pedropaulo). Alinhado à doutrina anti-anonimato (identidade
-- pública e estável). O handle é gerado AUTOMATICAMENTE por trigger em qualquer
-- caminho que grave o username (signup Discord, nick oficial, admin) — sem tocar
-- no TS de cada um — e é IMUTÁVEL depois de definido (URLs nunca quebram).

-- 1) Coluna + índice único case-insensitive (só para handles não-nulos).
alter table public.profiles add column if not exists handle text;
create unique index if not exists profiles_handle_lower_uidx
  on public.profiles (lower(handle)) where handle is not null;

-- 2) Slugify: minúsculas, sem acento (translate cobre PT-BR), só [a-z0-9-],
--    hífens colapsados e aparados. Retorna null se sobrar vazio.
create or replace function public.slugify_handle(input text)
returns text
language sql
immutable
as $function$
  select nullif(
    trim(both '-' from
      regexp_replace(
        lower(translate(
          coalesce(input, ''),
          'áàâãäéèêëíìîïóòôõöúùûüçñ',
          'aaaaaeeeeiiiiooooouuuucn'
        )),
        '[^a-z0-9]+', '-', 'g'
      )
    ),
    ''
  );
$function$;

-- 3) Trigger: gera handle único quando ainda não há (dedup por sufixo -N,
--    evita handles reservados que colidiriam com rotas). DEFINER pra enxergar
--    todos os handles no teste de unicidade apesar da RLS de profiles.
create or replace function public.tg_profiles_handle()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_slug      text;
  v_candidate text;
  v_n         int := 1;
  v_reserved  text[] := array[
    'u','me','admin','api','auth','login','logout','app','www','static',
    'perfil','ranking','loja','planos','partida','partidas','lobbies','lobby',
    'compendium','colecao','dashboard','settings','config','null','undefined'
  ];
begin
  -- Handle é imutável: uma vez definido, nunca regenera (URL estável).
  if new.handle is not null then
    return new;
  end if;

  v_slug := coalesce(public.slugify_handle(new.username), 'jogador');
  v_candidate := v_slug;

  while (v_candidate = any(v_reserved))
     or exists (
          select 1 from public.profiles
          where lower(handle) = v_candidate and id <> new.id
        )
  loop
    v_n := v_n + 1;
    v_candidate := v_slug || '-' || v_n;
  end loop;

  new.handle := v_candidate;
  return new;
end;
$function$;

drop trigger if exists profiles_handle_biu on public.profiles;
create trigger profiles_handle_biu
  before insert or update of username on public.profiles
  for each row execute function public.tg_profiles_handle();

-- 4) Backfill dos existentes — updates INDIVIDUAIS (statements separados) pro
--    teste de unicidade do trigger enxergar os handles já atribuídos no loop.
do $$
declare r record;
begin
  for r in
    select id from public.profiles
    where handle is null and username is not null
    order by created_at nulls last, id
  loop
    update public.profiles set username = username where id = r.id;
  end loop;
end $$;
