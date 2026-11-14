@echo off
rem Double-click to run the lab display locally (same as the Raspberry Pi).
rem Pass options too, e.g.:  run-local.bat --portrait
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (py -3 run-local.py %*) else (python run-local.py %*)
if errorlevel 1 pause
