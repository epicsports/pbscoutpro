@echo off
REM Read-only helper for audit_dead_userroles.cjs — auto-sets
REM GOOGLE_APPLICATION_CREDENTIALS from the firebase-adminsdk JSON
REM (same convention as repoint_adminuid.cmd). NO writes.

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
node "%~dp0audit_dead_userroles.cjs"
endlocal
