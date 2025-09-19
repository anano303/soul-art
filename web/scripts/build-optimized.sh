#!/bin/bash

echo "🏗️  Building with CSS optimizations..."

# Clean previous build
rm -rf .next

# Build the application
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo ""
    echo "📊 CSS Analysis:"
    
    # Count CSS files in build
    css_files=$(find .next/static/css -name "*.css" 2>/dev/null | wc -l)
    echo "   Built CSS files: $css_files"
    
    # Check for MessengerChat CSS
    messenger_css=$(find .next/static/css -name "*MessengerChat*" 2>/dev/null)
    if [ -n "$messenger_css" ]; then
        echo "   ⚠️  MessengerChat CSS still in build: $messenger_css"
    else
        echo "   ✅ MessengerChat CSS successfully excluded from build"
    fi
    
    # Check total CSS size
    total_size=$(find .next/static/css -name "*.css" -exec ls -la {} \; 2>/dev/null | awk '{sum += $5} END {print sum/1024"KB"}')
    echo "   Total CSS size: $total_size"
    
    echo ""
    echo "🚀 Ready to test! Run: npm start"
    
else
    echo "❌ Build failed!"
    exit 1
fi