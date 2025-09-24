# SoulArt APK Generation Script for Windows
# ეს სკრიპტი ქმნის APK ფაილს SoulArt PWA აპლიკაციისთვის Windows-ზე

Write-Host "🚀 Starting SoulArt APK generation..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if bubblewrap is installed
try {
    $bubblewrapVersion = bubblewrap --version
    Write-Host "✅ Bubblewrap version: $bubblewrapVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Bubblewrap is not installed. Installing..." -ForegroundColor Yellow
    npm install -g @bubblewrap/cli
}

# Create APK directory
$APK_DIR = ".\soulart-apk"
if (-not (Test-Path $APK_DIR)) {
    New-Item -ItemType Directory -Path $APK_DIR
}

Set-Location $APK_DIR

# Initialize TWA project if not exists
if (-not (Test-Path "twa-manifest.json")) {
    Write-Host "📱 Initializing TWA project..." -ForegroundColor Blue
    bubblewrap init --manifest="https://soulart.ge/api/manifest"
}

# Create twa-manifest.json with Georgian language support
$manifestContent = @"
{
  "packageId": "ge.soulart.twa",
  "host": "soulart.ge", 
  "name": "SoulArt",
  "launcherName": "SoulArt",
  "display": "standalone",
  "orientation": "portrait",
  "themeColor": "#012645",
  "backgroundColor": "#ffffff",
  "startUrl": "/",
  "iconUrl": "https://soulart.ge/soulart_icon_blue_fullsizes.ico",
  "maskableIconUrl": "https://soulart.ge/soulart_icon_blue_fullsizes.ico",
  "shortcuts": [
    {
      "name": "მაღაზია",
      "short_name": "Shop",
      "url": "/shop",
      "icons": [
        {
          "src": "https://soulart.ge/soulart_icon_blue_fullsizes.ico",
          "sizes": "96x96"
        }
      ]
    },
    {
      "name": "ფორუმი", 
      "short_name": "Forum",
      "url": "/forum",
      "icons": [
        {
          "src": "https://soulart.ge/soulart_icon_blue_fullsizes.ico",
          "sizes": "96x96"
        }
      ]
    }
  ],
  "appDetails": {
    "appCategory": "LIFESTYLE",
    "privacyPolicy": "https://soulart.ge/privacy-policy",
    "termsAndConditionsUrl": "https://soulart.ge/terms"
  }
}
"@

Write-Host "⚙️ Configuring build parameters..." -ForegroundColor Blue
Set-Content -Path "twa-manifest.json" -Value $manifestContent

# Build APK
Write-Host "🔨 Building APK..." -ForegroundColor Blue
try {
    bubblewrap build
    
    # Find and copy the generated APK
    Write-Host "📦 Locating generated APK..." -ForegroundColor Blue
    $apkFile = Get-ChildItem -Path . -Filter "*.apk" -Recurse | Select-Object -First 1
    
    if ($apkFile) {
        Copy-Item $apkFile.FullName -Destination "..\SoulArt-debug.apk"
        Write-Host "✅ APK successfully generated: SoulArt-debug.apk" -ForegroundColor Green
        
        # Get APK info
        Write-Host "📊 APK Information:" -ForegroundColor Cyan
        Get-ChildItem "..\SoulArt-debug.apk" | Format-Table Name, Length, LastWriteTime
        
        Write-Host ""
        Write-Host "🎉 APK generation completed!" -ForegroundColor Green
        Write-Host "📁 File location: $(Get-Location)\..\SoulArt-debug.apk" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📱 To install on Android device:" -ForegroundColor Yellow
        Write-Host "   adb install -r SoulArt-debug.apk" -ForegroundColor White
        
    } else {
        Write-Host "❌ APK file not found after build." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ APK generation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "📚 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Test the APK on Android device" -ForegroundColor White
Write-Host "   2. Verify Digital Asset Links: https://soulart.ge/.well-known/assetlinks.json" -ForegroundColor White
Write-Host "   3. For Play Store release, generate production keystore and build release APK" -ForegroundColor White

Write-Host ""
Write-Host "🔧 Development commands:" -ForegroundColor Cyan
Write-Host "   - Test locally: npm run build && npm run start" -ForegroundColor White
Write-Host "   - Check PWA score: lighthouse https://localhost:3000 --view" -ForegroundColor White
Write-Host "   - Validate manifest: npx pwa-asset-generator --help" -ForegroundColor White