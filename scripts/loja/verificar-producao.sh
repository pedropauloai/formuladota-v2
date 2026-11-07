#!/usr/bin/env bash
# Verificador da loja em produção: requisição HTTP ao endereço real, sai com código diferente de
# zero na primeira falha. Lê o catálogo ativo e a flag "loja" pela API pública do Supabase (chave
# anon, que já é pública no site) e confere o que o site serve. Não grava nada no banco.
#
# Uso: bash scripts/loja/verificar-producao.sh [https://www.formuladota.com.br]

set -euo pipefail
SITE="${1:-https://www.formuladota.com.br}"
ENV_FILE="${ENV_FILE:-.env.local}"

val() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | sed -E 's/^"//; s/"$//' | tr -d '\r'; }
SUPA_URL="$(val NEXT_PUBLIC_SUPABASE_URL)"
ANON="$(val NEXT_PUBLIC_SUPABASE_ANON_KEY)"

# O resolvedor de casa (roteador, WSL) perde consultas: toda requisição tenta de novo antes de falhar.
C="curl --retry 3 --retry-all-errors --retry-delay 2"
falhas=0
ok() { echo "PASSOU  $1"; }
erro() { echo "FALHOU  $1"; falhas=$((falhas + 1)); }

rest() { $C -fsS --max-time 20 "$SUPA_URL/rest/v1/$1" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"; }

flag="$(rest 'feature_flags?select=enabled&key=eq.loja' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s)[0]?.enabled===true?'on':'off'))")"
echo "flag loja: $flag"

home="$($C -s -o /dev/null -w '%{http_code}' --max-time 30 "$SITE/")"
[ "$home" = "200" ] && ok "home responde 200" || erro "home respondeu $home"

ig="$($C -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 30 "$SITE/ig")"
case "$ig" in
  307*utm_source=instagram*) ok "atalho /ig leva à loja com a origem instagram" ;;
  *) erro "atalho /ig respondeu: $ig" ;;
esac

visita="$($C -s -o /dev/null -w '%{http_code}' --max-time 30 -X POST -H 'Content-Type: application/json' -d '{}' "$SITE/api/visita")"
[ "$visita" = "400" ] && ok "rota de visita no ar (recusa corpo vazio sem gravar)" || erro "rota de visita respondeu $visita"

hook="$($C -s -o /dev/null -w '%{http_code}' --max-time 30 -X POST -H 'Content-Type: application/json' -d '{}' "$SITE/api/webhooks/mercadopago?data.id=1&type=payment")"
[ "$hook" = "401" ] && ok "webhook no ar e recusa notificação sem assinatura" || erro "webhook respondeu $hook"

if [ "$flag" = "on" ]; then
  produtos="$(rest 'store_products?select=slug,title&active=eq.true&is_test=eq.false&order=display_order')"
  vitrine="$($C -fsSL --max-time 30 "$SITE/loja" || true)"
  [ -n "$vitrine" ] && ok "vitrine /loja responde" || erro "vitrine /loja não respondeu"
  printf '%s' "$vitrine" | grep -q 'data-loja-prova' && ok "vitrine mostra a credencial ao vivo do Pedro" || erro "vitrine sem a credencial do Pedro"
  while IFS=$'\t' read -r slug title; do
    [ -z "$slug" ] && continue
    printf '%s' "$vitrine" | grep -qF "$title" && ok "vitrine mostra: $title" || erro "vitrine não mostra: $title"
    pagina="$($C -fsSL --max-time 30 "$SITE/loja/$slug" || true)"
    # Produto com as vagas do mês esgotadas troca o formulário pelo aviso de reabertura.
    printf '%s' "$pagina" | grep -qE 'id="loja-checkout"|data-loja-esgotado' && ok "checkout de $slug no ar" || erro "checkout de $slug não apareceu"
  done < <(printf '%s' "$produtos" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{for(const p of JSON.parse(s))console.log(p.slug+'\t'+p.title)})")
else
  loja="$($C -s -o /dev/null -w '%{http_code}' --max-time 30 "$SITE/loja")"
  [ "$loja" = "307" ] && ok "loja fechada (flag desligada) redireciona" || erro "com a flag desligada /loja respondeu $loja"
fi

echo
if [ "$falhas" -gt 0 ]; then
  echo "$falhas verificação(ões) falharam em $SITE"
  exit 1
fi
echo "Tudo certo em $SITE"
