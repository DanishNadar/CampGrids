@echo off
setlocal

REM Rebuilds script.js from a standardized CampGrids workbook.
REM Usage:
REM   updateInterface.bat "C:\path\to\UpdatedCampGrids.xlsx"

set "workbook=%~1"

if "%workbook%"=="" (
  echo Missing required workbook path.
  echo.
  echo Usage:
  echo   updateInterface.bat "C:\path\to\UpdatedCampGrids.xlsx"
  echo.
  pause
  exit /b 1
)

if not exist "%workbook%" (
  echo Workbook not found: "%workbook%"
  echo.
  echo Usage:
  echo   updateInterface.bat "C:\path\to\UpdatedCampGrids.xlsx"
  echo.
  pause
  exit /b 1
)

echo Updating CampGrids from "%workbook%"...
python scripts\generateCampgrids.py "%workbook%"

if errorlevel 1 (
  echo.
  echo Update failed.
  pause
  exit /b 1
)

echo.
echo Update complete. Open or refresh index.html to see the latest frontend content.
pause
