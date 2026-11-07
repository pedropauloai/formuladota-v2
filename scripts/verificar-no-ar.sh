#!/bin/bash
# Prova que o site está no ar batendo nas URLs reais; sai com o número de falhas (0 = no ar).
# Roda sozinho depois de `pnpm cf:deploy`, ou à mão: `pnpm cf:verificar`.
set -u
U="${SITE:-https://www.formuladota.com.br}"
APEX="${APEX:-https://formuladota.com.br}"
falhas=0
confere() { # nome, esperado, obtido
  if [ "$2" = "$3" ]; then echo "ok    $1: $3"; else echo "FALHA $1: esperado '$2', veio '$3'"; falhas=$((falhas+1)); fi
}
status() { curl -s -o /dev/null --max-time 20 -w '%{http_code}' "$1"; }
destino() { curl -s -o /dev/null --max-time 20 -w '%{http_code} %{redirect_url}' "$1"; }

if curl -fsSL --max-time 30 "$U/" | grep -q "FORMULADOTA"; then confere "home com FORMULADOTA" sim sim; else confere "home com FORMULADOTA" sim nao; fi
confere "apex para www" "308 $U/ranking" "$(destino "$APEX/ranking")"
confere "http para https" "301 $U/" "$(destino "${U/https:/http:}/")"
for p in /ranking /codigo-de-conduta; do confere "$p" 200 "$(status "$U$p")"; done
# Links antigos que seguem nas descrições do YouTube (next.config.ts).
confere "/tinker" "307 $U/" "$(destino "$U/tinker")"
confere "/rankedpt" "307 $U/ranked-com-pro" "$(destino "$U/rankedpt")"
# O login vai ao Discord pelo Supabase e precisa voltar para este domínio.
retorno=$(printf '%s' "$U/auth/callback" | sed 's/:/%3A/g; s#/#%2F#g')
if destino "$U/login" | grep -q "redirect_to=$retorno"; then confere "login volta ao domínio" sim sim; else confere "login volta ao domínio" sim nao; fi
echo "falhas: $falhas"
exit $falhas
