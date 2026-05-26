@echo off
REM Local helper for repoint_adminuid.cjs — auto-sets GOOGLE_APPLICATION_CREDENTIALS
REM from the firebase-adminsdk JSON expected as a sibling of the repo root
REM (e.g. ..\..\pbscoutpro-firebase-adminsdk-fbsvc-*.json from this script's
REM location). Falls through to the existing env var if already set.
REM Works in cmd.exe AND PowerShell.

setlocal enabledelayedexpansion
if "%GOOGLE_APPLICATION_CREDENTIALS%"=="" (
  for %%f in ("%~dp0..\..\..\pbscoutpro-firebase-adminsdk-fbsvc-*.json") do (
    set "GOOGLE_APPLICATION_CREDENTIALS=%%f"
  )
)
if "%GOOGLE_APPLICATION_CREDENTIALS%"=="" (
  echo ERROR: No service account JSON detected next to the repo
  echo   expected: %~dp0..\..\..\pbscoutpro-firebase-adminsdk-fbsvc-*.json
  echo Set GOOGLE_APPLICATION_CREDENTIALS manually and re-run.
  exit /b 1
)
echo Using credentials: %GOOGLE_APPLICATION_CREDENTIALS%
echo.
node "%~dp0repoint_adminuid.cjs"
endlocal
