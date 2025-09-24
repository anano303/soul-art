// Enhanced icon generation for high-quality PWA icons
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Define icon sizes with proper formats and configuration
const iconConfigs = {
  // Android icons - using higher quality settings
  "android-icon-36x36.png": {
    size: 36,
    options: {
      quality: 100,
      density: 144, // Higher DPI for better display
    },
  },
  "android-icon-48x48.png": {
    size: 48,
    options: {
      quality: 100,
      density: 144,
    },
  },
  "android-icon-72x72.png": {
    size: 72,
    options: {
      quality: 100,
      density: 144,
    },
  },
  "android-icon-96x96.png": {
    size: 96,
    options: {
      quality: 100,
      density: 192,
    },
  },
  "android-icon-144x144.png": {
    size: 144,
    options: {
      quality: 100,
      density: 288,
    },
  },
  "android-icon-192x192.png": {
    size: 192,
    options: {
      quality: 100,
      density: 384,
    },
  },
  "android-icon-512x512.png": {
    size: 512,
    options: {
      quality: 100,
      density: 512,
    },
  },

  // Apple icons
  "apple-icon-57x57.png": {
    size: 57,
    options: { quality: 100 },
  },
  "apple-icon-60x60.png": {
    size: 60,
    options: { quality: 100 },
  },
  "apple-icon-72x72.png": {
    size: 72,
    options: { quality: 100 },
  },
  "apple-icon-76x76.png": {
    size: 76,
    options: { quality: 100 },
  },
  "apple-icon-114x114.png": {
    size: 114,
    options: { quality: 100 },
  },
  "apple-icon-120x120.png": {
    size: 120,
    options: { quality: 100 },
  },
  "apple-icon-144x144.png": {
    size: 144,
    options: { quality: 100 },
  },
  "apple-icon-152x152.png": {
    size: 152,
    options: { quality: 100 },
  },
  "apple-icon-180x180.png": {
    size: 180,
    options: { quality: 100 },
  },

  // MS icons
  "ms-icon-70x70.png": {
    size: 70,
    options: { quality: 100 },
  },
  "ms-icon-144x144.png": {
    size: 144,
    options: { quality: 100 },
  },
  "ms-icon-150x150.png": {
    size: 150,
    options: { quality: 100 },
  },
  "ms-icon-310x310.png": {
    size: 310,
    options: { quality: 100 },
  },

  // Favicon
  "favicon-16x16.png": {
    size: 16,
    options: { quality: 100 },
  },
  "favicon-32x32.png": {
    size: 32,
    options: { quality: 100 },
  },
  "favicon-96x96.png": {
    size: 96,
    options: { quality: 100 },
  },
};

// Sources to use - in order of preference
const sources = [
  {
    name: "High-Quality PNG Source",
    path: path.join(__dirname, "public", "soulart_icon_blue_fullsizes.png"),
    type: "primary",
  },
  {
    name: "Logo PNG",
    path: path.join(__dirname, "public", "logo.png"),
    type: "alternative",
  },
  {
    name: "ICO File",
    path: path.join(__dirname, "public", "soulart_icon_blue_fullsizes.ico"),
    type: "fallback",
  },
];

async function generateHighQualityIcons() {
  console.log("🎨 Starting enhanced PWA icon generation...");

  // First, find the best source to use
  let sourceFile = null;
  let sourceName = "";

  for (const source of sources) {
    if (fs.existsSync(source.path)) {
      sourceFile = source.path;
      sourceName = source.name;
      console.log(`✅ Using ${sourceName} as source image`);
      break;
    }
  }

  if (!sourceFile) {
    console.error("❌ No valid source images found!");
    console.error("Please ensure one of these files exists:");
    sources.forEach((s) => console.error(`  - ${s.path}`));
    return;
  }

  // Create a high-quality base image to work from
  // This creates a temporary 1024x1024 master image for better downscaling
  const tempMasterFile = path.join(__dirname, "temp-master-icon.png");
  try {
    await sharp(sourceFile)
      .resize(1024, 1024, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 }, // Transparent background
        kernel: sharp.kernel.lanczos3, // Best quality resampling
        withoutEnlargement: false, // Allow upscaling for small sources
      })
      .png({
        quality: 100,
        compressionLevel: 0, // No compression for best quality
        adaptiveFiltering: true,
        force: true,
      })
      .toFile(tempMasterFile);

    console.log("✅ Created high-quality master image for icon generation");
  } catch (error) {
    console.error("❌ Failed to create master image:", error.message);
    return;
  }

  // Generate each icon from the master file
  for (const [filename, config] of Object.entries(iconConfigs)) {
    try {
      const outputPath = path.join(__dirname, "public", filename);
      const { size, options } = config;

      await sharp(tempMasterFile)
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
          kernel: sharp.kernel.lanczos3, // Best quality downsampling
        })
        .png({
          quality: options.quality || 100,
          compressionLevel: 0, // No compression for best quality
          adaptiveFiltering: true,
          palette: false, // Force RGB mode for better quality
          progressive: false,
          density: options.density || 72, // Higher density for Android
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
    // Apple icon precomposed
    await sharp(tempMasterFile)
      .resize(180, 180, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png({ quality: 100, compressionLevel: 0 })
      .toFile(path.join(__dirname, "public", "apple-icon-precomposed.png"));

    // General apple icon
    await sharp(tempMasterFile)
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

  // Clean up temp file
  try {
    fs.unlinkSync(tempMasterFile);
  } catch (e) {
    // Ignore cleanup errors
  }

  console.log("🎉 PWA icon optimization completed!");
  console.log("📱 All icons generated with maximum quality");
}

// Run the icon generation
generateHighQualityIcons().catch(console.error);
