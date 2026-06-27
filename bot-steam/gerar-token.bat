@echo off
chcp 65001 >nul
REM ============================================================
REM  FormulaDota - Gerar REFRESH TOKEN (pro bot no Railway)
REM  Clique duplo. Loga na conta-bot e imprime o token.
REM ============================================================
cd /d "%~dp0"
title FormulaDota - Gerar Refresh Token

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERRO] Node.js nao encontrado. Instale a versao LTS em https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\steam-session\" (
  echo [setup] Instalando dependencias ^(primeira vez demora um pouco^)...
  call npm install
  if errorlevel 1 (
    echo [ERRO] Falha no npm install. Copie o texto acima e mande pro Claude.
    pause
    exit /b 1
  )
)

echo.
echo ============================================================
echo  Vou logar na conta-bot e gerar o REFRESH TOKEN.
echo  Tenha o codigo do Steam Guard a mao (app do celular ou e-mail).
echo ============================================================
echo.
node get-refresh-token.js

echo.
echo ============================================================
echo  Copie o TOKEN acima e cole no Railway como STEAM_REFRESH_TOKEN.
echo  NAO compartilhe esse token com ninguem.
echo ============================================================
pause
