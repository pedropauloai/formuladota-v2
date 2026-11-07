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
confere "apex para www" "308 $U/ranking" "$(destino "$APEX/ranking")"
confere "http para https" "301 $U/" "$(destino "http://$H/")"
for p in /ranking /codigo-de-conduta; do confere "$p" 200 "$(status "$U$p")"; done
# Links antigos que seguem nas descrições do YouTube (next.config.ts).
confere "/tinker" "307 $U/" "$(destino "$U/tinker")"
confere "/rankedpt" "307 $U/ranked-com-pro" "$(destino "$U/rankedpt")"
# O login vai ao Discord pelo Supabase e precisa voltar para este domínio.
retorno=$(printf '%s' "$U/auth/callback" | sed 's/:/%3A/g; s#/#%2F#g')
if destino "$U/login" | grep -q "redirect_to=$retorno"; then confere "login volta ao domínio" sim sim; else confere "login volta ao domínio" sim nao; fi
echo "falhas: $falhas"
exit $falhas
