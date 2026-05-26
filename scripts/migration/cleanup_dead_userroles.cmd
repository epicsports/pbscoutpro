@echo off
REM Destructive cleanup wrapper for cleanup_dead_userroles.cjs.
REM Sets GOOGLE_APPLICATION_CREDENTIALS from the firebase-adminsdk JSON
REM AND sets CLEANUP_DEAD_USERROLES_CONFIRMED=1 (gate the script enforces).
REM
REM Run audit_dead_userroles.cmd FIRST and review the classification with
REM Jacek BEFORE running this — this script writes to Firestore.

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
set CLEANUP_DEAD_USERROLES_CONFIRMED=1
echo Using credentials: %GOOGLE_APPLICATION_CREDENTIALS%
echo Confirm flag set: CLEANUP_DEAD_USERROLES_CONFIRMED=1
echo.
node "%~dp0cleanup_dead_userroles.cjs"
endlocal
