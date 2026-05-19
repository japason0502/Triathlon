@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PORT=8080"

REM If PORT is already in use, increment until free.
:PROBE
netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>&1
if %errorlevel%==0 (
  set /a PORT=%PORT%+1
  goto PROBE
)

echo.
echo URL: http://localhost:%PORT%/schedule.html
echo Stop: Ctrl+C
echo.

start "" cmd /c "timeout /t 1 /nobreak >nul && start "" http://localhost:%PORT%/schedule.html"

where python >nul 2>&1
if %errorlevel%==0 (
  python -m http.server %PORT%
  goto END
)
where py >nul 2>&1
if %errorlevel%==0 (
  py -3 -m http.server %PORT%
  goto END
)

echo Python not found. Install Python or add it to PATH.
pause
exit /b 1

:END
endlocal
