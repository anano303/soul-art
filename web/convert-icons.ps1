# Icon Conversion Script
# ეს სკრიპტი გადაიყვანს .ico ფაილებს .png ფაილებში სხვადასხვა ზომებში

# ⚠️ ამ სკრიპტის გასაშვებად დაყენებული უნდა იყოს ImageMagick:
# Windows: choco install imagemagick
# Mac: brew install imagemagick  
# Ubuntu: sudo apt-get install imagemagick

# Blue Theme Icons (Light Mode)
Write-Host "🔵 Converting blue icons..." -ForegroundColor Blue

# Convert soulart_icon_blue_fullsizes.ico to different PNG sizes
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 36x36 "android-icon-36x36.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 48x48 "android-icon-48x48.png" 
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 72x72 "android-icon-72x72.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 96x96 "android-icon-96x96.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 144x144 "android-icon-144x144.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 192x192 "android-icon-192x192.png"

# Apple Icons
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 57x57 "apple-icon-57x57.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 60x60 "apple-icon-60x60.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 72x72 "apple-icon-72x72.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 76x76 "apple-icon-76x76.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 114x114 "apple-icon-114x114.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 120x120 "apple-icon-120x120.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 144x144 "apple-icon-144x144.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 152x152 "apple-icon-152x152.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 180x180 "apple-icon-180x180.png"

# MS Icons  
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 70x70 "ms-icon-70x70.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 144x144 "ms-icon-144x144.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 150x150 "ms-icon-150x150.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 310x310 "ms-icon-310x310.png"

# Favicon variants
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 16x16 "favicon-16x16.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 32x32 "favicon-32x32.png"
magick "soulart_icon_blue_fullsizes.ico[0]" -resize 96x96 "favicon-96x96.png"

# Copy main icon files
Copy-Item "soulart_icon_blue_fullsizes.ico" "apple-icon.png"
Copy-Item "soulart_icon_blue_fullsizes.ico" "apple-icon-precomposed.png"
Copy-Item "soulart_icon_blue_fullsizes.ico" "apple-touch-icon.png"

Write-Host "✅ Icon conversion completed!" -ForegroundColor Green
Write-Host "📁 Generated icons:"
Get-ChildItem -Filter "*icon*.png" | ForEach-Object { Write-Host "   - $($_.Name)" }

Write-Host ""
Write-Host "🔗 Next steps:"
Write-Host "   1. Verify all icons are correctly generated"
Write-Host "   2. Test PWA installation on different devices"
Write-Host "   3. Run PWA audit: npm run pwa-audit"