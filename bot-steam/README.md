# Bot Steam FormulaDota — SPIKE de viabilidade (Node.js)

Serviço **separado** do bot Discord (`../bot/`). Stack que **funciona em 2026**:

- **`node-steam-user`** — faz o **login novo da Steam** (2023+) e o transporte do Game Coordinator (GC). É a peça que resolve o erro "senha inválida" (EResult 5) das libs antigas.
- **`dota2-user`** — gerencia a sessão do GC do Dota.
- **`lobby.proto`** — as mensagens de **criar lobby** (o `dota2-user` só traz as de leitura; essas eu defini aqui, com os números de campo da fonte oficial da Valve).

> ⚠️ **Isto é uma SPIKE**, não o serviço final. Ela prova, na sua conta-bot:
> **login → conectar no GC → criar lobby → convidar 1 jogador.** Se passar, eu construo a máquina completa (fila → juntar 10 → montar times → lançar → resultado).

---

## Por que tantas tentativas?

As libs prontas de bot de Dota estão quebradas: o `node-dota2` nem instala, o `valvepython` não loga (login antigo), e o `go-dota2` também usa login antigo. O **`node-steam-user` é o único que faz o login novo** — por isso o caminho é esse. A criação de lobby a gente monta por cima.

---

## Pré-requisitos (você faz, uma vez)

1. **Node.js LTS** instalado (em https://nodejs.org — marque "Add to PATH").
2. A conta-bot dedicada + o `.env` já preenchido (você já fez isso). O `.env` é reaproveitado — **não precisa digitar credencial de novo.**

> 🔒 A senha fica SÓ no `.env` local (já está no `.gitignore`). Eu nunca vejo.

---

## ▶ Rodar (dois cliques)

Dê **dois cliques** em **`setup-and-run.bat`**. Ele instala as dependências e roda. Se pedir o **código do Steam Guard**, digite e Enter.

Ou pelo terminal:

```powershell
cd C:\Users\ADM\projects\formuladota-v2\bot-steam
npm install
node spike.js
```

---

## ✅ Como saber se passou

A sequência esperada no terminal:

```
[SPIKE] Logado! SteamID ... Abrindo o Dota e conectando no GC...
[SPIKE] GC do Dota CONECTADO. Criando lobby...
[SPIKE] Pedido de criar lobby enviado (senha 'fd-spike').
[SPIKE] Convite enviado para 765...
```

E o **convite de lobby chega no cliente Dota 2** da conta de teste. Aí: **viabilidade provada** — me manda a saída.

> **Importante:** o login deve passar de primeira agora. A criação de lobby é o primeiro teste real das mensagens do GC; pode ser que precise de 1–2 ajustes (o suspeito nº 1 é o `client_version`, que o GC às vezes exige). Por isso: **me cola TODA a saída**, deu certo ou não, que eu ajusto na hora.

---

## 🧯 Se der ruim (me reporte a saída)

| Sintoma | O que fazer |
|---|---|
| Loga mas o GC **não conecta** (`connectedToGC` não aparece) | a conta-bot pode não ter Dota 2, ou o GC está instável — rodar de novo |
| Lobby "criado" mas **convite não chega** | provável `client_version` necessário, ou o alvo precisa ter o bot como amigo — me avisa que eu trato |
| Erro de login | me cola o `eresult` que aparece |

---

## ⚠️ Risco (decisão consciente)

Esse stack imita o cliente do Dota (engenharia reversa). A Valve **pode** quebrar o GC numa atualização e, em tese, **banir (VAC)** a conta-bot. Por isso a conta é **dedicada e descartável**.

---

## Próximos passos (depois que a spike passar)

1. Ler o estado do lobby (SO cache) pra confirmar criação e pegar o `lobby_id`.
2. Montar times + `launchPracticeLobby` (começar a partida).
3. **Matchmaking**: fila no Supabase → juntar 10 (faixas Livre/Elite) → criar lobby → convidar os 10 → lançar.
4. Resultado → XP no HONOR; deploy 24/7 (Railway).
