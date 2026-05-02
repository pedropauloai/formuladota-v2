-- Migration 007 — Visibilidade pública de profiles de coaches ativos
-- Aplicada via MCP em 2026-05-02 após bug visual em /pacotes (cards mostravam
-- "Por: Coach" + badge "Coach" porque RLS profiles bloqueava SELECT anônimo).
--
-- Antes: RLS profiles permite SELECT só pra owner OR admin (Migration 002).
-- Agora: + permite SELECT quando profile pertence a coach ativo.
--
-- Múltiplas policies SELECT são OR'd no PostgreSQL — esta NÃO substitui a
-- existente "users see own profile or admin sees all"; apenas adiciona um
-- caminho público específico pra catálogo /pacotes funcionar sem auth.
--
-- Risco/escopo: dados expostos publicamente são username, avatar_url, is_admin
-- (e tecnicamente todos os campos de profiles via SELECT *). Como coaches são
-- entidades públicas (perfil de venda), aceitável. Se houver campo sensível
-- futuro em profiles (ex: CPF), criar VIEW restrita ao invés de expandir.

drop policy if exists "everyone reads active coach profiles" on public.profiles;

create policy "everyone reads active coach profiles"
  on public.profiles for select
  using (
    id in (select profile_id from public.coaches where ativo = true)
  );
