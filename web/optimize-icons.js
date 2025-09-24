// Icon optimization script using Sharp (npm install sharp)
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const sizes = {
  // Android icons
  "android-icon-36x36.png": 36,
  "android-icon-48x48.png": 48,
  "android-icon-72x72.png": 72,
  "android-icon-96x96.png": 96,
  "android-icon-144x144.png": 144,
  "android-icon-192x192.png": 192,
  "android-icon-512x512.png": 512, // High resolution for better quality

  // Apple icons
  "apple-icon-57x57.png": 57,
  "apple-icon-60x60.png": 60,
  "apple-icon-72x72.png": 72,
  "apple-icon-76x76.png": 76,
  "apple-icon-114x114.png": 114,
  "apple-icon-120x120.png": 120,
  "apple-icon-144x144.png": 144,
  "apple-icon-152x152.png": 152,
  "apple-icon-180x180.png": 180,
  "apple-touch-icon.png": 180, // Standard Apple touch icon

  // MS icons
  "ms-icon-70x70.png": 70,
  "ms-icon-144x144.png": 144,
  "ms-icon-150x150.png": 150,
  "ms-icon-310x310.png": 310,

  // Favicon
  "favicon-16x16.png": 16,
  "favicon-32x32.png": 32,
  "favicon-96x96.png": 96,
};

async function optimizeIcons() {
  const blueIconPath = path.join(
    __dirname,
    "public",
    "soulart_icon_blue_fullsizes.ico"
  );
  const whiteIconPath = path.join(
    __dirname,
    "public",
    "soulart_icon_white_fullsizes.ico"
  );

  if (!fs.existsSync(blueIconPath)) {
    console.error("❌ Source soulart_icon_blue_fullsizes.ico not found!");
    return;
  }

  console.log("🎨 Starting PWA icon optimization from ICO files...");

  // Use blue icon as primary source (better contrast for light backgrounds)
  for (const [filename, size] of Object.entries(sizes)) {
    try {
      const outputPath = path.join(__dirname, "public", filename);

      // For high-quality conversion from ICO to PNG
      await sharp(blueIconPath)
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
          kernel: sharp.kernel.lanczos3, // Better resampling
        })
        .png({
          quality: 100,
          compressionLevel: 0, // No compression for best quality
          adaptiveFiltering: true,
          palette: false, // Force RGB mode for better quality
          progressive: false,
          force: true,
        })
        .toFile(outputPath);

      console.log(
        `✅ Generated ${filename} (${size}x${size}) - ${Math.round(
          fs.statSync(outputPath).size / 1024
        )}KB`
      );
    } catch (error) {
      console.error(`❌ Failed to generate ${filename}:`, error.message);
    }
  }

  // Generate special icons
  try {
    // Apple icon precomposed (same as touch icon)
    await sharp(blueIconPath)
      .resize(180, 180, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png({ quality: 100, compressionLevel: 0 })
      .toFile(path.join(__dirname, "public", "apple-icon-precomposed.png"));

    // General apple icon
    await sharp(blueIconPath)
      .resize(180, 180, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png({ quality: 100, compressionLevel: 0 })
      .toFile(path.join(__dirname, "public", "apple-icon.png"));

    console.log("✅ Generated special Apple icons");
  } catch (error) {
    console.error("❌ Failed to generate special icons:", error.message);
  }

  console.log("🎉 PWA icon optimization completed!");
  console.log(
    "📱 All icons generated from soulart_icon_blue_fullsizes.ico with maximum quality"
  );
}

optimizeIcons().catch(console.error);
