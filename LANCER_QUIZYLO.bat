@echo off
REM ====================================================
REM  Quizylo - lanceur de test Expo Go
REM  Double-clique ce fichier. Il installe les dependances
REM  (la premiere fois) puis demarre Expo. Un QR code
REM  s'affiche : scanne-le avec Expo Go sur ton iPhone.
REM ====================================================
cd /d "%~dp0"

echo.
echo [Quizylo] Installation des dependances (patiente la 1re fois)...
call npm install
if errorlevel 1 (
  echo.
  echo [Quizylo] Echec de l'installation. Verifie que Node.js est installe.
  pause
  exit /b 1
)

echo.
echo [Quizylo] Demarrage d'Expo... Un QR code va s'afficher.
echo [Quizylo] Scanne-le avec l'app Expo Go sur ton iPhone 11 (meme Wi-Fi).
echo [Quizylo] Si le Wi-Fi ne marche pas, ferme et relance avec : npx expo start --tunnel
echo.
call npx expo start

pause
