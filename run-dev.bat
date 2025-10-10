@echo off
echo Starting Unyva Backend Development Server...
echo.

:start
echo [%date% %time%] Starting server...
node --loader ts-node/esm --no-warnings src/index.ts

echo.
echo [%date% %time%] Server stopped. Restarting in 2 seconds...
ping -n 3 127.0.0.1 > nul
goto start