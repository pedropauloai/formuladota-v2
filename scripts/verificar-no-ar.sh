#!/bin/bash
# Prova que o site está no ar batendo nas URLs reais; sai com o número de falhas (0 = no ar).
# Roda sozinho depois de `pnpm cf:deploy`, ou à mão: `pnpm cf:verificar`.
set -u
U="${SITE:-https://www.formuladota.com.br}"
APEX="${APEX:-https://formuladota.com.br}"
H="${U#https://}"
HA="${APEX#https://}"
falhas=0
confere() { # nome, esperado, obtido
  if [ "$2" = "$3" ]; then echo "ok    $1: $3"; else echo "FALHA $1: esperado '$2', veio '$3'"; falhas=$((falhas+1)); fi
}

# O resolvedor de casa (roteador, WSL) perde consultas: cada nome se resolve uma vez, com novas tentativas,
# e as checagens usam esse endereço. O DNS do domínio continua provado; a oscilação local não vira falha.
endereco() { curl -s -o /dev/null --max-time 20 --retry 5 --retry-all-errors --retry-delay 3 -w '%{remote_ip}' "https://$1/"; }
colchete() { case "$1" in *:*) echo "[$1]" ;; *) echo "$1" ;; esac; }
IP=$(endereco "$H")
IPA=$(endereco "$HA")
if [ -z "$IP" ] || [ -z "$IPA" ]; then
  echo "FALHA DNS ou conexão: $H='$IP' $HA='$IPA'"
  exit 1
fi
R="--retry 2 --retry-all-errors --retry-delay 2 --resolve $H:443:$(colchete "$IP") --resolve $H:80:$(colchete "$IP") --resolve $HA:443:$(colchete "$IPA")"
status() { curl $R -s -o /dev/null --max-time 20 -w '%{http_code}' "$1"; }
destino() { curl $R -s -o /dev/null --max-time 20 -w '%{http_code} %{redirect_url}' "$1"; }

if curl $R -fsSL --max-time 30 "$U/" | grep -q "FORMULADOTA"; then confere "home com FORMULADOTA" sim sim; else confere "home com FORMULADOTA" sim nao; fi
confere "apex para www" "308 $U/meta" "$(destino "$APEX/meta")"
confere "http para https" "301 $U/" "$(destino "http://$H/")"
for p in /meta /codigo-de-conduta; do confere "$p" 200 "$(status "$U$p")"; done
# Ranking, Times e Torneios são da liga (flag fila_competitiva): abertos com ela, e sem ela levam à home.
for p in /ranking /times /torneios; do
  r=$(destino "$U$p")
  case "$r" in "200 "|"307 $U/") confere "$p (liga)" sim sim ;; *) confere "$p (liga)" "200 ou 307 para a home" "$r" ;; esac
done
# Links antigos que seguem nas descrições do YouTube (next.config.ts).
confere "/tinker" "307 $U/" "$(destino "$U/tinker")"
confere "/rankedpt" "307 $U/ranked-com-pro" "$(destino "$U/rankedpt")"
# Prévia do placar que o Discord desdobra: o Worker não tem disco, e fonte lida do disco dava 500.
confere "imagem do placar" "200 image/png" "$(curl $R -s -o /dev/null --max-time 30 -w '%{http_code} %{content_type}' "$U/partida/historico/8883379496/opengraph-image")"
# Prévia própria da loja: og:url da página, não da home.
if curl $R -fsSL --max-time 30 "$U/loja" | grep -q "property=\"og:url\" content=\"$U/loja\""; then confere "prévia da /loja" sim sim; else confere "prévia da /loja" sim nao; fi
# Fila da party (docs/loja/fila-da-party.md): a página nos dois slugs e o JSON que os overlays da live leem.
for p in /party /grupo; do confere "$p" 200 "$(status "$U$p")"; done
# Atalhos da live com origem: o painel da loja separa o chat (/fila) do QR na tela (/qr).
confere "/fila" "307 $U/party?utm_source=live&utm_medium=chat&utm_campaign=party" "$(destino "$U/fila")"
confere "/qr" "307 $U/party?utm_source=live&utm_medium=qr&utm_campaign=party" "$(destino "$U/qr")"
fila=$(curl $R -s -i --max-time 20 "$U/api/party/fila" | tr -d '\r')
if printf '%s' "$fila" | grep -qi '^access-control-allow-origin: \*' && printf '%s' "$fila" | grep -q '"updatedAt"'; then confere "fila da party em JSON para os overlays" sim sim; else confere "fila da party em JSON para os overlays" sim nao; fi
# Battlepass (docs/battlepass/spec.md): a mensalidade na /planos e o link curto da live.
if curl $R -fsSL --max-time 30 "$U/planos" | grep -q "Battlepass FORMULADOTA"; then confere "Battlepass na /planos" sim sim; else confere "Battlepass na /planos" sim nao; fi
confere "/battlepass" "307 $U/planos?utm_source=live&utm_medium=chat&utm_campaign=battlepass" "$(destino "$U/battlepass")"
# Sala de voz (docs/comunicacao/spec.md): a página responde sem erro (404 com a flag desligada; com ela
# ligada, o visitante vê o portão do login) e a API devolve o motivo de saída em JSON para quem não entrou.
sala=$(status "$U/sala/00000000-0000-4000-8000-000000000000")
case "$sala" in 200|404) confere "sala de voz responde sem erro" sim sim ;; *) confere "sala de voz responde sem erro" sim "nao (HTTP $sala)" ;; esac
batida=$(curl $R -s --max-time 20 -X POST -H 'Content-Type: application/json' -d '{"sessionId":null,"chatAfter":0}' -w ' %{http_code}' "$U/api/sala/00000000-0000-4000-8000-000000000000/estado")
case "$batida" in *'"saida":'*' 200') confere "estado da sala sem login" sim sim ;; *) confere "estado da sala sem login" sim "nao ($batida)" ;; esac
# O endereço fixo da sala pública: 404 com a flag desligada; ligada, leva à sala aberta (307) ou diz que ela abre na live (200).
fixa=$(status "$U/sala")
case "$fixa" in 200|307|404) confere "endereço fixo /sala responde sem erro" sim sim ;; *) confere "endereço fixo /sala responde sem erro" sim "nao (HTTP $fixa)" ;; esac
# O microfone e a captura de tela só valem nas páginas da sala (next.config.ts); o resto do site segue sem.
pp_sala=$(curl $R -s -I --max-time 20 "$U/sala/00000000-0000-4000-8000-000000000000" | tr -d '\r' | grep -i '^permissions-policy:')
case "$pp_sala" in *'microphone=(self)'*'display-capture=(self)'*) confere "sala libera microfone e tela" sim sim ;; *) confere "sala libera microfone e tela" sim "nao ($pp_sala)" ;; esac
pp_site=$(curl $R -s -I --max-time 20 "$U/meta" | tr -d '\r' | grep -i '^permissions-policy:')
case "$pp_site" in *'microphone=()'*) confere "resto do site sem microfone" sim sim ;; *) confere "resto do site sem microfone" sim "nao ($pp_site)" ;; esac
# Arquivo com hash no nome guardado pelo navegador por um ano (public/_headers).
chunk=$(curl $R -fsSL --max-time 30 "$U/" | grep -o '/_next/static/[^"]*\.js' | head -1)
cc=$(curl $R -s -o /dev/null -D - --max-time 20 "$U$chunk" | tr -d '\r' | grep -i '^cache-control:' | head -1)
case "$cc" in *immutable*) confere "cache dos arquivos do build" sim sim ;; *) confere "cache dos arquivos do build" sim "nao ($chunk: $cc)" ;; esac
# O login vai ao Discord pelo Supabase e precisa voltar para este domínio.
retorno=$(printf '%s' "$U/auth/callback" | sed 's/:/%3A/g; s#/#%2F#g')
if destino "$U/login" | grep -q "redirect_to=$retorno"; then confere "login volta ao domínio" sim sim; else confere "login volta ao domínio" sim nao; fi
echo "falhas: $falhas"
exit $falhas
