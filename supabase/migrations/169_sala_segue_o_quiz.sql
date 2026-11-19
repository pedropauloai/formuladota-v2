-- 169: entrar em sala segue a mesma regra da fila (18/11/2026). A 130 condicionou a fila ao
-- quiz_enabled() e deixou a sala de fora: com o quiz desligado (e /doutrina fora do ar), quem não
-- tinha nível 6 nem permissão nunca conseguia entrar numa sala.
alter policy "join lobby level6 or permission" on public.lobby_players
  with check (
    ((select auth.uid()) = user_id)
    and public.is_user_active((select auth.uid()))
    and (
      (not public.quiz_enabled())
      or exists (
        select 1 from public.user_levels ul
        where ul.user_id = (select auth.uid()) and ul.current_level >= 6
      )
      or (public.available_match_permissions((select auth.uid())) >= 1)
    )
  );
