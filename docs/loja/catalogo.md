# Catálogo da loja: decisão

**Decisão do Pedro, 07/11/2026:** "Versão B" (Hora do Imortal), escolhida entre as três versões do seletor https://claude.ai/artifact/7WbaJ1ZH5bzshr7h8yPN2r. Preço acima do mercado brasileiro, com vagas contadas por mês.

| Produto | Preço | Onde acontece | Limite |
|---|---|---|---|
| Acompanhamento 30 dias (4 mentorias, até 8 partidas analisadas, WhatsApp direto) | R$ 897 | hora marcada | 3 vagas por mês |
| Mentoria 1:1 (90 min ao vivo, 2 replays revisados antes) | R$ 247 | hora marcada | 8 vagas por mês |
| Vaga na party da live | R$ 25 por partida | na live | até 5 por pedido |
| Seu replay ao vivo (hora marcada, na frente da fila de membros) | R$ 39 | na live | |
| Jogar junto (duo fora da live, voz no Discord) | R$ 49 por partida | fora da live | até 5 por pedido |
| Análise gravada completa (30 min de vídeo) | R$ 97 | gravada | |
| Boost de MMR | R$ 99 a cada 100 MMR até 5.000; R$ 149 de 5.000 a 6.500 | fora da live | mínimo 100 MMR, teto 6.500 |
| Curso de Tinker (pré-venda) | R$ 197 | digital | **pendente: o Pedro crava a data de entrega** |

Os sete primeiros estão no banco (migration 160, aplicada em produção em 07/11/2026, versão `20261107042805`) e no ar desde 07/11/2026, quando a flag `loja` foi ligada. O curso entra quando houver a data.

## Regras que saíram da decisão

- Vaga contada é real: o mês é o de São Paulo; pedido pago ou em conferência ocupa a vaga; pendente segura a vaga só por 30 minutos (`src/lib/loja/capacity.ts`). Dois compradores no mesmo segundo podem passar uma vaga do teto: o Pedro recebe o aviso e marca no mês seguinte.
- Boost cobra ponto a ponto: o trecho em cada faixa paga o preço dela (de 4.800 a 5.200 são 200 x R$ 0,99 + 200 x R$ 1,49 = R$ 496). O formulário mostra a mesma conta que o servidor cobra (`src/lib/loja/pricing.ts`).
- A loja cita o Pedro pelo nome: a regra B6 do PRODUCT_CORE (não citar o Pedro) é da plataforma da comunidade, e a loja vende o tempo dele.
- Texto da vitrine só com fato provado: medalha, posição no ranking e partidas de Tinker vêm ao vivo do cache de carreira (STRATZ e OpenDota), renovado pelo cron a cada 6 horas; "14 mil inscritos" vem do perfil profissional (fonte da verdade). Nenhum prazo de entrega prometido: o prazo é combinado no WhatsApp.
- Arte de cada produto é oficial da Valve (regra do projeto): Aghanim's Scepter, Aghanim's Shard, Smoke of Deceit, Observer Ward, Tango, Gem of True Sight e a escada de medalhas no boost. A Aegis ficou de fora porque no FORMULADOTA ela é recompensa de mérito, nunca vendida.
