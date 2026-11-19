-- 172: índice na chave estrangeira blocked_by (criada na 168), como a 167 fez nas da loja: sem ele,
-- apagar um perfil varre friendships para limpar quem ele bloqueou.
create index if not exists friendships_blocked_by_idx on public.friendships (blocked_by);
