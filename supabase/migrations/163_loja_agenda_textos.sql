-- 163_loja_agenda_textos.sql: com a agenda no site (migration 162), o "como funciona" deixa de
-- mandar o comprador para o WhatsApp, e a mentoria pede os IDs das duas partidas na compra.

alter table public.store_products drop constraint if exists store_products_form_fields_check;
alter table public.store_products add constraint store_products_form_fields_check
  check (form_fields <@ array['discord', 'dota_id', 'mmr_atual', 'mmr_alvo', 'match_id', 'match_ids', 'observacoes']::text[]);

update public.store_products set
  form_fields = array['discord', 'dota_id', 'mmr_atual', 'match_ids', 'observacoes'],
  delivery_md = $md$- Escolha o dia e o horário, informe os IDs das duas partidas e pague com Pix ou cartão.
- O Pedro revisa os dois replays antes da sessão.
- No horário marcado, a mentoria acontece no Discord do FORMULADOTA.$md$
where slug = 'mentoria';

update public.store_products set delivery_md = $md$- Escolha o dia e o horário da primeira mentoria e pague com Pix ou cartão.
- As outras três você marca na página do pedido.
- As mentorias acontecem no Discord do FORMULADOTA, no horário marcado.$md$
where slug = 'acompanhamento-30-dias';

update public.store_products set delivery_md = $md$- Escolha a live e quantas partidas, e pague com Pix ou cartão.
- Na hora da live, o Pedro convida você pelo ID do Dota.$md$
where slug = 'vaga-na-party';

update public.store_products set delivery_md = $md$- Escolha a live, informe o ID da partida e pague com Pix ou cartão.
- Na live, o seu replay entra na frente da fila de membros.$md$
where slug = 'replay-ao-vivo';

update public.store_products set delivery_md = $md$- Escolha o dia, o horário e quantas partidas, e pague com Pix ou cartão.
- No horário marcado, o Pedro chama você no Discord do FORMULADOTA e convida pelo ID do Dota.$md$
where slug = 'jogar-junto';

update public.store_products set delivery_md = $md$- Informe o ID da partida e pague com Pix ou cartão.
- O vídeo aparece na página do pedido quando ficar pronto.$md$
where slug = 'analise-gravada';

update public.store_products set delivery_md = $md$- Informe o MMR atual e o alvo e pague com Pix ou cartão.
- O Pedro entra em contato para combinar como o serviço acontece.
- O site não pede nem guarda senha de conta.$md$
where slug = 'boost-de-mmr';
