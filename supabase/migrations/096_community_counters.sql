-- 096_community_counters.sql — contadores públicos pro topbar (estilo GamersClub):
-- total online (heurística last_seen_at nos últimos 3 min — o heartbeat de presença
-- grava a cada 60s) + total banido. Só agregados (sem PII) → pode ser público.
create or replace function public.community_counters()
returns jsonb
language sql
security definer
set search_path to 'public'
stable
as $function$
  select jsonb_build_object(
    'online', (select count(*) from public.profiles where last_seen_at > now() - interval '3 minutes'),
    'banned', (select count(*) from public.profiles where behavior_status = 'banned')
  );
$function$;

grant execute on function public.community_counters() to anon, authenticated;
