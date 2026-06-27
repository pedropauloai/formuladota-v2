@echo off
chcp 65001 >nul
REM ============================================================
REM  FormulaDota - Preview AO VIVO da partida (realtime.js)
REM  Clique duplo DURANTE a partida. Precisa do STEAM_WEB_API_KEY no .env.
REM ============================================================
cd /d "%~dp0"
title FormulaDota - Preview ao vivo

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERRO] Node.js nao encontrado. Instale a versao LTS em https://nodejs.org
  echo.
  pause
  exit /b 1
)

echo ============================================================
echo  PREVIEW AO VIVO (use com a partida EM ANDAMENTO)
echo ============================================================
echo.
set "SERVERID="
set /p SERVERID=Cole o server_steam_id (aparece no log apos o launch) e Enter:
if "%SERVERID%"=="" (
  echo.
  echo [ERRO] Sem server_steam_id nao da pra consultar. Pegue no log do bot.
  echo.
  pause
  exit /b 1
)

echo.
echo Pollando AO VIVO o servidor %SERVERID% (atualiza a cada 5s). Feche a janela pra parar.
echo.
node realtime.js %SERVERID%
pause
