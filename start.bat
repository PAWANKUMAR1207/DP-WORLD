@echo off
echo Starting GhostShip...
echo.

:: Start API in new window
start "GhostShip API" cmd /k "python api.py"

:: Wait for API to start
timeout /t 3 /nobreak >nul

:: Start Frontend in new window  
cd frontend
start "GhostShip Frontend" cmd /k "npm run dev"

echo.
echo GhostShip is starting...
echo API: http://127.0.0.1:5000
echo Frontend: http://localhost:5174
echo.
pause
