@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js LTS 22 or newer from https://nodejs.org and reopen this window.
 pause
 exit /b 1
)
if not exist node_modules (
 call npm install
 if errorlevel 1 (pause & exit /b 1)
)
if not exist .env (
 call npm run setup
 if errorlevel 1 (pause & exit /b 1)
)
call npm run dev
pause
