@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installation des dependances, patiente...
  call npm install
)
npx expo start --go --clear
pause
