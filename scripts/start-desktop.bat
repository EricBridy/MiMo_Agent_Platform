@echo off
chcp 65001 >nul
echo Starting MiMo Desktop...
cd /d "%~dp0\..\apps\desktop"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo Starting development server...
npm run dev
pause
