#!/bin/bash

# SoulArt APK Generation Script
# ეს სკრიპტი ქმნის APK ფაილს SoulArt PWA აპლიკაციისთვის

set -e

echo "🚀 Starting SoulArt APK generation..."

# Check if bubblewrap is installed
if ! command -v bubblewrap &> /dev/null; then
    echo "❌ Bubblewrap is not installed. Installing..."
    npm install -g @bubblewrap/cli
fi

# Create APK directory
APK_DIR="./soulart-apk"
if [ ! -d "$APK_DIR" ]; then
    mkdir -p "$APK_DIR"
fi

cd "$APK_DIR"

# Initialize TWA project if not exists
if [ ! -f "twa-manifest.json" ]; then
    echo "📱 Initializing TWA project..."
    bubblewrap init --manifest="https://soulart.ge/api/manifest"
fi

# Build configurations
echo "⚙️  Configuring build parameters..."

# Update twa-manifest.json with Georgian language support
cat > twa-manifest.json << EOL
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
  "signing": {
    "keystore": "./soulart-keystore.jks",
    "alias": "soulart"
  },
  "appDetails": {
    "appCategory": "LIFESTYLE",
    "privacyPolicy": "https://soulart.ge/privacy-policy",
    "termsAndConditionsUrl": "https://soulart.ge/terms"
  }
}
EOL

# Generate keystore for signing (development)
if [ ! -f "soulart-keystore.jks" ]; then
    echo "🔐 Generating development keystore..."
    keytool -genkey -v \
        -keystore soulart-keystore.jks \
        -alias soulart \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -dname "CN=SoulArt, OU=Development, O=SoulArt, L=Tbilisi, S=Georgia, C=GE" \
        -storepass soulart123 \
        -keypass soulart123
fi

# Build APK
echo "🔨 Building APK..."
bubblewrap build

# Find and copy the generated APK
echo "📦 Locating generated APK..."
APK_FILE=$(find . -name "*.apk" -type f | head -1)

if [ -f "$APK_FILE" ]; then
    cp "$APK_FILE" "../SoulArt-debug.apk"
    echo "✅ APK successfully generated: SoulArt-debug.apk"
    
    # Get APK info
    echo "📊 APK Information:"
    ls -lh "../SoulArt-debug.apk"
    
    echo ""
    echo "🎉 APK generation completed!"
    echo "📁 File location: $(pwd)/../SoulArt-debug.apk"
    echo ""
    echo "📱 To install on Android device:"
    echo "   adb install -r SoulArt-debug.apk"
    echo ""
    echo "🔧 To generate production APK:"
    echo "   1. Create production keystore"
    echo "   2. Update twa-manifest.json with production settings"
    echo "   3. Run: bubblewrap build --release"
    
else
    echo "❌ APK generation failed. Check the build logs above."
    exit 1
fi

cd ..

echo ""
echo "📚 Next steps:"
echo "   1. Test the APK on Android device"
echo "   2. Verify Digital Asset Links: https://soulart.ge/.well-known/assetlinks.json"
echo "   3. For Play Store release, generate production keystore and build release APK"