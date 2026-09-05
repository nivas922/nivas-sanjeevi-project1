@echo off
echo ============================================================
echo   Starting LearnAI (Frontend + Backend on Localhost)
echo ============================================================
echo.
echo [1/2] Starting Backend on http://localhost:5000 ...
start "LearnAI Backend Server" cmd /k "cd backend & npm run dev"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend on http://localhost:5173 ...
start "LearnAI Frontend Server" cmd /k "cd frontend & npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo ============================================================
echo   Both Servers Running!
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:5000
echo ============================================================