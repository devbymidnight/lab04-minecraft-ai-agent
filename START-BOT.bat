@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Ask your teacher to install Node.js 24 LTS, then run setup.bat.
  goto fail
)
node scripts/preflight.js
if errorlevel 1 goto fail
node src/main.js
if errorlevel 1 goto fail
echo Bot stopped. You may close this window or start it again.
if /i not "%~1"=="--no-pause" pause
exit /b 0
:fail
echo Bot could not start. Read the message above or ask your teacher.
if /i not "%~1"=="--no-pause" pause
exit /b 1
