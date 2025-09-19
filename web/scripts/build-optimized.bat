@echo off
echo 🏗️  Building with CSS optimizations...

REM Clean previous build
if exist .next rmdir /s /q .next

REM Build the application
call npm run build

if %errorlevel% equ 0 (
    echo ✅ Build completed successfully!
    echo.
    echo 📊 CSS Analysis:
    
    REM Count CSS files in build
    for /f %%i in ('dir /b /s .next\static\css\*.css 2^>nul ^| find /c /v ""') do set css_count=%%i
    echo    Built CSS files: %css_count%
    
    REM Check for MessengerChat CSS
    dir /b /s .next\static\css\*MessengerChat* >nul 2>&1
    if %errorlevel% equ 0 (
        echo    ⚠️  MessengerChat CSS still in build
        dir /b /s .next\static\css\*MessengerChat*
    ) else (
        echo    ✅ MessengerChat CSS successfully excluded from build
    )
    
    echo.
    echo 🚀 Ready to test! Run: npm start
    
) else (
    echo ❌ Build failed!
    exit /b 1
)