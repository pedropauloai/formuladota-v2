@echo off
chcp 65001 >nul
REM ============================================================
REM  FormulaDota - Ver o RESULTADO de uma partida (match.js)
REM  Clique duplo. Precisa do STEAM_WEB_API_KEY preenchido no .env.
REM ============================================================
cd /d "%~dp0"
title FormulaDota - Resultado da partida

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERRO] Node.js nao encontrado. Instale a versao LTS em https://nodejs.org
  echo.
  pause
  exit /b 1
)

echo ============================================================
echo  RESULTADO DA PARTIDA (via OpenDota - traz APM e mais)
echo ============================================================
echo.
set "MATCHID="
set /p MATCHID=Cole o match_id e Enter (Enter direto usa 8863764305 - exemplo real parseado):
if "%MATCHID%"=="" set "MATCHID=8863764305"

echo.
echo Consultando a partida %MATCHID% na OpenDota ...
echo.
node result.js %MATCHID%

echo.
echo ============================================================
echo  Terminou. COPIE tudo que apareceu acima e mande pro Claude.
echo ============================================================
pause
