-- 057 — Sessões coachadas (Pedro 2026-06-18): o PRO OBSERVA a partida ao vivo,
-- dá calls e faz uma análise pós-jogo. Modelo reputacionalmente limpo (PRO não
-- joga = não é boost/smurf). COEXISTE com o ranked-com-pro (PRO joga): mesma
-- fila e mesma ficha (1 por jogador), muda o MODO.

-- Modo da fila aberta do PRO: 'play' (PRO joga) ou 'coached' (PRO observa).
alter table public.coaches
  add column if not exists queue_mode text not null default 'play'
    check (queue_mode in ('play', 'coached'));

comment on column public.coaches.queue_mode is
  'Modo da fila aberta: play (PRO joga) ou coached (PRO observa + análise).';

-- Snapshot do modo no momento que o aluno entrou (histórico/exibição).
alter table public.coach_queue_entries
  add column if not exists mode text not null default 'play'
    check (mode in ('play', 'coached'));

-- Análise pós-jogo do PRO pro aluno. Privada (feedback pessoal): aluno + PRO +
-- admin. Fica no perfil do próprio aluno como histórico de evolução.
create table if not exists public.coaching_reviews (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  student_user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  summary text not null check (char_length(summary) between 1 and 2000),
  strengths text check (strengths is null or char_length(strengths) <= 1000),
  improvements text check (improvements is null or char_length(improvements) <= 1000),
  rating int check (rating is null or rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists coaching_reviews_student_idx
  on public.coaching_reviews(student_user_id, created_at desc);
create index if not exists coaching_reviews_coach_idx
  on public.coaching_reviews(coach_id);

alter table public.coaching_reviews enable row level security;

-- Leitura: o próprio aluno, o PRO autor, ou admin. NÃO é público (feedback pessoal).
drop policy if exists coaching_reviews_read on public.coaching_reviews;
create policy coaching_reviews_read on public.coaching_reviews
  for select using (
    auth.uid() = student_user_id
    or exists (
      select 1 from public.coaches c
      where c.id = coaching_reviews.coach_id and c.profile_id = auth.uid()
    )
    or public.is_admin()
  );

-- Escrita: só o PRO dono da análise (ou admin).
drop policy if exists coaching_reviews_write on public.coaching_reviews;
create policy coaching_reviews_write on public.coaching_reviews
  for insert with check (
    exists (
      select 1 from public.coaches c
      where c.id = coaching_reviews.coach_id and c.profile_id = auth.uid()
    )
    or public.is_admin()
  );
