@echo off
chcp 65001 >nul
REM ============================================================
REM  FormulaDota - Bot Steam: setup + run da SPIKE (clique duplo)
REM  Stack Node.js (node-steam-user). Nao precisa saber terminal.
REM ============================================================
cd /d "%~dp0"
title FormulaDota - Spike Bot Steam

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERRO] Node.js nao encontrado.
  echo Instale a versao LTS em https://nodejs.org  ^(marque "Add to PATH"^)
  echo Depois rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [1/2] Instalando dependencias ^(a primeira vez demora alguns minutos^)...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha no npm install. Copie o texto acima e mande pro Claude.
    pause
    exit /b 1
  )
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo.
  echo [2/2] Criei o arquivo .env. Vou abrir no Bloco de Notas.
  echo       Preencha usuario, senha e SteamID de teste, SALVE ^(Ctrl+S^) e FECHE.
  echo.
  pause
  notepad ".env"
)

echo.
echo ============================================================
echo  Rodando a SPIKE. Se pedir o codigo do Steam Guard,
echo  olhe seu celular/email, digite o codigo e aperte Enter.
echo ============================================================
echo.
node spike.js

echo.
echo ============================================================
echo  Terminou. COPIE tudo que apareceu acima e mande pro Claude.
echo ============================================================
pause
