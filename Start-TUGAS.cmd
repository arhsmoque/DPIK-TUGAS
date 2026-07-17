@echo off
setlocal
cd /d "%~dp0"
echo Starting DPIK TUGAS at http://127.0.0.1:4173
echo Close this window to stop the local startup server.
npm run dev -- --host 127.0.0.1 --port 4173
if errorlevel 1 (
  echo.
  echo TUGAS did not start. Confirm the ARH environment profile is loaded.
  pause
)
