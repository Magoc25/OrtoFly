#!/bin/bash
# tests/contrato-nodeodm.sh — confere o CONTRATO do NodeODM de que o OrtoFly depende.
#
# MANUAL, fora do CI: precisa de um NodeODM de verdade no ar. Rode quando a versão do
# NodeODM mudar, ou quando Descartar / Limpar tudo / Cancelar voltarem a dar erro.
#
#   bash tests/contrato-nodeodm.sh                          # http://127.0.0.1:3000
#   bash tests/contrato-nodeodm.sh https://meu-nodeodm.exemplo
#
# NÃO APAGA NADA: todos os pedidos usam um uuid que não existe.
#
# Por que existe: da v1.18.0 à v1.24.0 o app mandava o uuid em multipart/form-data e o
# NodeODM, que só lê urlencoded ou JSON em /task/remove e /task/cancel, respondia
# HTTP 200 com {"error":"uuid param missing."}. O cenário 5 do tests/smoke.js prova o
# que o APP faz com cada resposta, contra um duplo; este script prova que o duplo ainda
# imita o servidor real (medido no NodeODM 2.2.4 / ODM 3.5.6 em 2026-11-15).
# Sai com 0 se o contrato bate; 1 se alguma resposta mudou; 2 se o servidor não responde.

U="${1:-http://127.0.0.1:3000}"; U="${U%/}"
F="00000000-0000-4000-8000-000000000000"
falhas=0

info=$(curl -s -m 8 "$U/info") || { echo "O NodeODM não respondeu em $U/info — ele está no ar?"; exit 2; }
case "$info" in *'"version"'*) ;; *) echo "A resposta de $U/info não parece de um NodeODM: $(printf '%s' "$info" | cut -c1-120)"; exit 2;; esac
echo "NodeODM em $U: $(printf '%s' "$info" | cut -c1-200)"
echo

# confere <descrição> <resposta> <trecho que tem de aparecer>
confere() {
  case "$2" in
    *"$3"*) echo "ok         $1" ;;
    *) echo "DIFERENTE  $1"; echo "             esperado conter: $3"; echo "             recebido:        $(printf '%s' "$2" | cut -c1-160)"; falhas=$((falhas + 1)) ;;
  esac
}

confere "remove em multipart NÃO é lido (o defeito antigo)"   "$(curl -s -m 8 -F "uuid=$F" "$U/task/remove")"                 'uuid param missing'
confere "remove em urlencoded é lido"                        "$(curl -s -m 8 --data-urlencode "uuid=$F" "$U/task/remove")"   'not found'
confere "remove de tarefa inexistente responde success:false" "$(curl -s -m 8 --data-urlencode "uuid=$F" "$U/task/remove")"   '"success":false'
confere "cancel em multipart NÃO é lido"                     "$(curl -s -m 8 -F "uuid=$F" "$U/task/cancel")"                 'uuid param missing'
confere "cancel em urlencoded é lido"                        "$(curl -s -m 8 --data-urlencode "uuid=$F" "$U/task/cancel")"   'not found'
confere "info de tarefa inexistente traz {error: … not found}" "$(curl -s -m 8 "$U/task/$F/info")"                            'not found'
confere "info de tarefa inexistente responde HTTP 200"       "$(curl -s -m 8 -o /dev/null -w '%{http_code}' "$U/task/$F/info")" '200'
confere "task/list devolve uma lista"                        "$(curl -s -m 8 "$U/task/list" | cut -c1-1)"                    '['
confere "as respostas liberam CORS para qualquer origem"     "$(curl -s -m 8 -D - -o /dev/null -H 'Origin: https://exemplo.test' "$U/info" | tr -d '\r' | grep -i '^access-control-allow-origin')" '*'

echo
if [ "$falhas" -eq 0 ]; then
  echo "Contrato confere ✅ — o duplo do cenário 5 (tests/smoke.js) continua imitando este servidor."
  exit 0
fi
echo "$falhas resposta(s) diferente(s) do contrato medido. Antes de mexer no app:"
echo "  1) ajuste o duplo do cenário 5 em tests/smoke.js para a resposta nova;"
echo "  2) rode o smoke — as asserções que ficarem vermelhas mostram onde o app depende do contrato antigo."
exit 1
