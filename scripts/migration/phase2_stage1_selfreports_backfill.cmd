@echo off
REM § 90 Phase 2 Stage 1.B.2 backfill wrapper. Mirrors cleanup_dead_userroles.cmd
REM Auto-detects sibling pbscoutpro-firebase-adminsdk-fbsvc-*.json next to the
REM repo. Pass --dry (default) or --live verbatim through to the script.
REM
REM Usage:
REM   scripts\migration\phase2_stage1_selfreports_backfill.cmd --dry
REM   scripts\migration\phase2_stage1_selfreports_backfill.cmd --live

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
node "%~dp0phase2_stage1_selfreports_backfill.cjs" %*
endlocal
