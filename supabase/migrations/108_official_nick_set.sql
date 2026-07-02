-- 108: flag de uso único do "nick oficial". O username vem do Discord no signup
-- (handle_new_user, só no insert — não re-sincroniza no login), então editar
-- persiste. Esta flag garante UMA edição só (corrigir números/maiúsculas do nick
-- oficial), coerente com anti-anonimato: ajuste pontual, não vira máscara/troca livre.
alter table public.profiles
  add column if not exists official_nick_set boolean not null default false;
