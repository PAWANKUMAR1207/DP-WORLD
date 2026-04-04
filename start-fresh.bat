@echo off
echo Starting GhostShip on fresh ports...
echo API: http://127.0.0.1:5001
echo Frontend: http://localhost:5175
echo.

:: Kill any existing processes on these ports
powershell -Command "Get-NetTCPConnection -LocalPort 5001,5175 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul

:: Start API in new window
start "GhostShip API (5001)" cmd /k "echo Starting API on port 5001... && python -c from ghostship.api import app; app.run(host='127.0.0.1', port=5001, threaded=True)"

:: Wait for API
timeout /t 3 /nobreak >nul

:: Start Frontend in new window  
cd frontend
start "GhostShip Frontend (5175)" cmd /k "echo Starting Frontend on port 5175... && npm run dev"

echo.
echo GhostShip is starting...
echo.
echo Open your browser to: http://localhost:5175
echo.
pause
