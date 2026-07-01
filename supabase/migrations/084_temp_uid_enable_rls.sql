-- 084_temp_uid_enable_rls.sql — Habilita RLS na tabela de debug temp_uid.
-- Advisor de segurança (ERROR rls_disabled_in_public): tabela pública sem RLS.
-- temp_uid tem 1 coluna (id uuid) e não é usada por nenhum código (só aparece no
-- types gerado) — resquício de debug. Sem policy = nega tudo a anon/authenticated
-- (só service role/owner acessa). Não dropamos pra não perder eventual referência.
alter table public.temp_uid enable row level security;
