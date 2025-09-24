// Icon optimization script using Sharp (npm install sharp)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = {
  // Android icons
  'android-icon-36x36.png': 36,
  'android-icon-48x48.png': 48,
  'android-icon-72x72.png': 72,
  'android-icon-96x96.png': 96,
  'android-icon-144x144.png': 144,
  'android-icon-192x192.png': 192,
  
  // Apple icons
  'apple-icon-57x57.png': 57,
  'apple-icon-60x60.png': 60,
  'apple-icon-72x72.png': 72,
  'apple-icon-76x76.png': 76,
  'apple-icon-114x114.png': 114,
  'apple-icon-120x120.png': 120,
  'apple-icon-144x144.png': 144,
  'apple-icon-152x152.png': 152,
  'apple-icon-180x180.png': 180,
  
  // MS icons
  'ms-icon-70x70.png': 70,
  'ms-icon-144x144.png': 144,
  'ms-icon-150x150.png': 150,
  'ms-icon-310x310.png': 310,
  
  // Favicon
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
  'favicon-96x96.png': 96
};

async function optimizeIcons() {
  const sourceImage = path.join(__dirname, 'public', 'logo.png');
  
  if (!fs.existsSync(sourceImage)) {
    console.error('❌ Source logo.png not found!');
    return;
  }

  console.log('🔧 Starting icon optimization...');
  
  for (const [filename, size] of Object.entries(sizes)) {
    try {
      const outputPath = path.join(__dirname, 'public', filename);
      
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png({
          quality: 100,
          compressionLevel: 6,
          adaptiveFiltering: true
        })
        .toFile(outputPath);
        
      console.log(`✅ Generated ${filename} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${filename}:`, error.message);
    }
  }
  
  console.log('🎉 Icon optimization completed!');
}

optimizeIcons().catch(console.error);