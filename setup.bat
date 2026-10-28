@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Ask your teacher to install Node.js 24 LTS, then reopen this window.
  goto fail
)
node -e "process.exit(Number(process.versions.node.split('.')[0])===24?0:1)"
if errorlevel 1 (
  echo This lab needs Node.js 24 LTS. Ask your teacher for help.
  goto fail
)
if not exist student-config.txt copy /y student-config.example student-config.txt >nul
if not exist .env copy /y .env.example .env >nul
if not exist package-lock.json (
  echo This download is incomplete. Download the full lab folder again.
  goto fail
)
call npm.cmd ci --ignore-scripts --no-fund
if errorlevel 1 (
  echo Setup could not download the lab tools. Check internet access with your teacher.
  goto fail
)
echo Setup complete. Edit student-config.txt and save your private OpenRouter key in .env.
echo Your teacher supplies classroom-config.txt. Never share .env.
if /i not "%~1"=="--no-pause" pause
exit /b 0
:fail
if /i not "%~1"=="--no-pause" pause
exit /b 1
