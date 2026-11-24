# Grava o app do Cloudflare Realtime no site a partir da area de transferencia, sem ninguem ver
# nem digitar o segredo. Quem copia os dois tokens no painel da Cloudflare e o PPA.
#
# COMO USAR (a sessao da sala de voz manda o comando com os dois IDs preenchidos):
#   powershell -ExecutionPolicy Bypass -File scripts\sala\gravar-segredos-realtime.ps1 -AppId <App ID> -TurnKeyId <Key ID>
#   1. No painel do Realtime, clique em "copiar" no token do app (SFU) e aperte Enter no script.
#   2. Clique em "copiar" no token da chave do TURN e aperte Enter de novo.
#
# O QUE ELE FAZ, NESTA ORDEM
#   - le a area de transferencia e PERGUNTA A CLOUDFLARE se o token vale (cria uma sessao de teste no
#     SFU; gera uma credencial de 60 s no TURN); token recusado = nada e gravado
#   - grava as quatro variaveis no Worker (wrangler secret put, pela copia do WSL, com a trava do
#     deploy), no .env.producao do WSL e nos .env.local (servidor local e e2e)
#   - apaga o arquivo temporario e limpa a area de transferencia
# O arquivo temporario e escrito sem BOM e sem quebra de linha no fim, e o wrangler le pelo stdin
# do bash: o mesmo cuidado do trocar-chave-mp.ps1 (BOM e \r\n ja derrubaram chave em producao).

param(
  [Parameter(Mandatory = $true)][ValidatePattern('^[A-Za-z0-9]{8,128}$')][string]$AppId,
  [Parameter(Mandatory = $true)][ValidatePattern('^[A-Za-z0-9]{8,128}$')][string]$TurnKeyId
)
$ErrorActionPreference = 'Stop'
$API = 'https://rtc.live.cloudflare.com/v1'
$ENVS_LOCAIS = @(
  'C:\Users\ADM\projects\PedroPauloAI - Pessoal\pausados\formuladota-v2\.env.local',
  'C:\Users\ADM\projects\PedroPauloAI - Pessoal\pausados\formuladota-v2\.claude\worktrees\voz-e-tela-753862\.env.local'
)

function Status([string]$url, [string]$token, [string]$corpo) {
  try {
    $r = Invoke-WebRequest -Uri $url -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $corpo -UseBasicParsing
    return [int]$r.StatusCode
  } catch {
    if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
    return 0
  }
}

function LerToken([string]$pedido) {
  Write-Host $pedido -ForegroundColor Cyan
  [void](Read-Host 'Aperte Enter depois de copiar')
  $t = (Get-Clipboard -Raw)
  if ($null -eq $t) { return '' }
  return $t.Trim()
}

$appSecret = LerToken '1/2  No painel do Realtime (SFU), clique em copiar no token do app.'
if ($appSecret -notmatch '^\S{16,256}$' -or (Status "$API/apps/$AppId/sessions/new" $appSecret '') -ne 201) {
  Write-Host 'A Cloudflare nao aceitou o token do app. Confira se copiou o token do app do SFU. Nada foi gravado.' -ForegroundColor Red
  exit 1
}
Write-Host 'Token do app conferido na Cloudflare.' -ForegroundColor Green

$turnToken = LerToken '2/2  Agora clique em copiar no token da chave do TURN.'
if ($turnToken -notmatch '^\S{16,256}$' -or (Status "$API/turn/keys/$TurnKeyId/credentials/generate-ice-servers" $turnToken '{"ttl":60}') -ne 201) {
  Write-Host 'A Cloudflare nao aceitou o token do TURN. Confira se copiou o token da chave do TURN. Nada foi gravado.' -ForegroundColor Red
  Set-Clipboard -Value ' '
  exit 1
}
Write-Host 'Token do TURN conferido na Cloudflare. Gravando...' -ForegroundColor Green

$valores = [ordered]@{
  REALTIME_APP_ID         = $AppId
  REALTIME_APP_SECRET     = $appSecret
  REALTIME_TURN_KEY_ID    = $TurnKeyId
  REALTIME_TURN_KEY_TOKEN = $turnToken
}
$ok = $true
$semBom = New-Object System.Text.UTF8Encoding $false
try {
  foreach ($nome in $valores.Keys) {
    $tmp = Join-Path $env:TEMP ('rt-' + [guid]::NewGuid().ToString() + '.txt')
    [System.IO.File]::WriteAllText($tmp, $valores[$nome], $semBom)
    $tmpWsl = '/mnt/' + $tmp.Substring(0, 1).ToLower() + ($tmp.Substring(2) -replace '\\', '/')
    try {
      # Worker: com a trava do deploy, para nao cruzar com uma publicacao da outra sessao.
      wsl -u root -e bash -c "cd /root/formuladota-v2-loja && flock /root/deploy-loja.lock npx wrangler secret put $nome < '$tmpWsl' > /dev/null 2>&1"
      if ($LASTEXITCODE -ne 0) { $ok = $false; Write-Host "O Worker nao aceitou $nome." -ForegroundColor Red }
      # .env.producao do WSL: troca a linha (ou acrescenta), sem imprimir.
      $py = "import sys;p='/root/formuladota-v2-loja/.env.producao';n=sys.argv[1];v=open(sys.argv[2]).read();L=[l for l in open(p).read().splitlines() if not l.startswith(n+'=')];L.append(n+'='+v);open(p,'w').write(chr(10).join(L)+chr(10))"
      wsl -u root -e python3 -c $py $nome $tmpWsl
      if ($LASTEXITCODE -ne 0) { $ok = $false; Write-Host "Nao deu para gravar $nome no .env.producao." -ForegroundColor Red }
    } finally {
      Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    }
    foreach ($arq in $ENVS_LOCAIS) {
      if (-not (Test-Path $arq)) { continue }
      $linhas = @([System.IO.File]::ReadAllLines($arq) | Where-Object { -not $_.StartsWith("$nome=") })
      $linhas += "$nome=$($valores[$nome])"
      [System.IO.File]::WriteAllText($arq, (($linhas -join "`r`n") + "`r`n"), $semBom)
    }
  }
} finally {
  $appSecret = $null
  $turnToken = $null
  Set-Clipboard -Value ' '
}

Write-Host ''
if ($ok) {
  Write-Host 'Pronto. O app do Realtime esta gravado no Worker, no .env.producao e nos .env.local.' -ForegroundColor Green
  Write-Host 'A area de transferencia foi limpa. Avise a sessao: ela confere com pnpm sala:realtime.' -ForegroundColor Green
} else {
  Write-Host 'ATENCAO: alguma gravacao falhou (veja acima). Avise a sessao antes de publicar.' -ForegroundColor Red
  exit 1
}
