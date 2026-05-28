@echo off
REM § 90 Phase 2.2.d precursor — ws-only pbliId players backfill wrapper.
REM Auto-detects sibling pbscoutpro-firebase-adminsdk-fbsvc-*.json next to the
REM repo. Pass --dry (default) or --live verbatim through to the script.
REM
REM Usage:
REM   scripts\migration\phase2_22d_backfill_wsonly_pbli_players.cmd --dry
REM   scripts\migration\phase2_22d_backfill_wsonly_pbli_players.cmd --live

setlocal enabledelayedexpansion
if "%GOOGLE_APPLICATION_CREDENTIALS%"=="" (
  for %%f in ("%~dp0..\..\..\pbscoutpro-firebase-adminsdk-fbsvc-*.json") do (
    set "GOOGLE_APPLICATION_CREDENTIALS=%%f"
  )
)
if "%GOOGLE_APPLICATION_CREDENTIALS%"=="" (
  echo ERROR: No service account JSON detected next to the repo.
  echo   expected: %~dp0..\..\..\pbscoutpro-firebase-adminsdk-fbsvc-*.json
  echo Set GOOGLE_APPLICATION_CREDENTIALS manually and re-run.
  exit /b 1
)
echo Using credentials: %GOOGLE_APPLICATION_CREDENTIALS%
echo.
node "%~dp0phase2_22d_backfill_wsonly_pbli_players.cjs" %*
endlocal
