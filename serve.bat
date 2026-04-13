@echo off
setlocal
cd /d "%~dp0"
set "PORT=8080"

echo.
echo   http://localhost:%PORT%/schedule.html
echo   Ctrl+C で停止
echo.

REM 1秒後にブラウザを開く（サーバー起動と競合しにくくする）
start "" cmd /c "timeout /t 1 /nobreak >nul && start "" http://localhost:%PORT%/schedule.html"

where python >nul 2>&1
if %errorlevel% equ 0 (
  python -m http.server %PORT%
  goto :end
)
where py >nul 2>&1
if %errorlevel% equ 0 (
  py -3 -m http.server %PORT%
  goto :end
)

echo python が見つかりません。Python を入れるか PATH を通してからもう一度試してね。
pause
exit /b 1

:end
endlocal
