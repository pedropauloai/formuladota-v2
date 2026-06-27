@echo off
chcp 65001 >nul
REM ============================================================
REM  FormulaDota - BOT-SERVER (convite automatico)
REM  Clique duplo. Fica logado na Steam e cria/convida as
REM  partidas que o site formar. Deixe a janela ABERTA.
REM ============================================================
cd /d "%~dp0"
title FormulaDota - Bot Server

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERRO] Node.js nao encontrado. Instale a versao LTS em https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\@supabase\" (
  echo [setup] Instalando dependencias ^(primeira vez demora um pouco^)...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha no npm install. Copie o texto acima e mande pro Claude.
    pause
    exit /b 1
  )
)

echo.
echo ============================================================
echo  Bot rodando. Se pedir o codigo do Steam Guard, digite e Enter.
echo  Deixe esta janela ABERTA enquanto testar. Ctrl+C encerra.
echo ============================================================
echo.
node bot-server.js

echo.
echo ============================================================
echo  Bot encerrou. COPIE tudo que apareceu acima e mande pro Claude.
echo ============================================================
pause
