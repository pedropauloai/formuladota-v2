-- 180_enquete_liga.sql: enquete temporária da Liga do FORMULADOTA (19/11/2026). A coluna direita
-- troca o Top do ranking por três botões (Sim, Talvez, Não); a liga volta com 50 "Sim".
-- Critério e consulta que mede: docs/enquete-liga.md.
--
-- Um voto por pessoa por enquete: logado vota pelo user_id (voter_key 'u:<uuid>'), visitante pelo
-- id aleatório do aparelho num cookie httpOnly (voter_key 'd:<uuid>'). Trocar a resposta atualiza a
-- mesma linha. Só a service role lê e grava (server action e leitura da coluna): RLS ligada, sem
-- política e sem permissão para anon e authenticated.

create table if not exists public.poll_votes (
  poll_key text not null check (poll_key ~ '^[a-z0-9_]{1,60}$'),
  voter_key text not null
    check (voter_key ~ '^[ud]:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  user_id uuid references auth.users (id) on delete set null,
  answer text not null check (answer in ('sim', 'talvez', 'nao')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A chave primária é o unique de (poll_key, voter_key): um voto por pessoa por enquete.
  constraint poll_votes_pkey primary key (poll_key, voter_key),
  -- Voto de logado carrega o próprio id na chave; a conta apagada vira null e o voto fica.
  constraint poll_votes_user_matches_key check (user_id is null or voter_key = 'u:' || user_id::text)
);

-- Contagem por resposta (o número do Sim que a coluna mostra a cada página).
create index if not exists poll_votes_poll_answer_idx on public.poll_votes (poll_key, answer);
-- A conta apagada procura os votos dela pelo user_id (on delete set null).
create index if not exists poll_votes_user_id_idx on public.poll_votes (user_id);

drop trigger if exists poll_votes_set_updated_at on public.poll_votes;
create trigger poll_votes_set_updated_at
  before update on public.poll_votes
  for each row execute function public.set_updated_at();

alter table public.poll_votes enable row level security;
revoke all on table public.poll_votes from anon, authenticated;

insert into public.feature_flags (key, enabled, label)
values ('enquete_liga', true, 'Enquete da Liga do FORMULADOTA no lugar do Top do ranking')
on conflict (key) do nothing;
