-- formuladota v2 — pacotes iniciais (PRD §5 Pricing inicial)
-- Princípio Pedro 30/04/2026: Dota é hobby. Pricing realista de mercado começa baixo
-- e sobe com demanda. Não tentar premium prematuramente.

insert into public.packages (nome, descricao, tipo, qtd_partidas, qtd_sessoes, preco_brl, ativo, display_order)
values
  (
    'Avulsa',
    'Uma partida ranked com Pedro. Escolha o horário, joguem juntos, mentoria em tempo real.',
    'avulso',
    1, 0, 10.00,
    true, 1
  ),
  (
    'Pacote 5',
    '5 partidas ranked com Pedro. Use no seu ritmo, sem prazo de validade.',
    'avulso',
    5, 0, 50.00,
    true, 2
  ),
  (
    'Pacote 10',
    '10 partidas ranked com Pedro. Uma jornada de evolução guiada.',
    'avulso',
    10, 0, 100.00,
    true, 3
  ),
  (
    'Mentoria mensal',
    '8 partidas ranked + 2 sessões teóricas (1:1 via Discord). Renovável mensalmente.',
    'mensal',
    8, 2, 100.00,
    true, 4
  );

-- Janelas iniciais Pedro: todos os dias 19h–22h (resposta Q3 PRD §10, 2026-04-30).
-- Pedro pode desativar slots específicos quando agenda dev/IA apertar.
insert into public.availability_windows (dia_semana, hora_inicio, hora_fim, ativo)
values
  (0, '19:00', '22:00', true), -- domingo
  (1, '19:00', '22:00', true), -- segunda
  (2, '19:00', '22:00', true), -- terça
  (3, '19:00', '22:00', true), -- quarta
  (4, '19:00', '22:00', true), -- quinta
  (5, '19:00', '22:00', true), -- sexta
  (6, '19:00', '22:00', true); -- sábado
