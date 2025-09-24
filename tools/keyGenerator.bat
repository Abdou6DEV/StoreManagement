@echo off
title Store Management - Key Generator
color 0A

echo.
echo 🔑 Store Management - Key Generator Tool
echo =====================================
echo.

set /p machineId="Enter Machine ID: "

if "%machineId%"=="" (
    echo ❌ Error: Please enter a Machine ID
    pause
    exit /b 1
)

node keyGenerator.js "%machineId%"

echo.
echo Press any key to exit...
pause >nul
