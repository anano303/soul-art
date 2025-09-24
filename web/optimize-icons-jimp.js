// Icon optimization script using Jimp (supports ICO files)
const { Jimp } = require("jimp");
const fs = require("fs");
const path = require("path");

const sizes = {
  // Android icons (high quality versions)
  "android-icon-36x36.png": 36,
  "android-icon-48x48.png": 48,
  "android-icon-72x72.png": 72,
  "android-icon-96x96.png": 96,
  "android-icon-144x144.png": 144,
  "android-icon-192x192.png": 192,
  "android-icon-512x512.png": 512,

  // Apple icons (retina quality)
  "apple-icon-57x57.png": 57,
  "apple-icon-60x60.png": 60,
  "apple-icon-72x72.png": 72,
  "apple-icon-76x76.png": 76,
  "apple-icon-114x114.png": 114,
  "apple-icon-120x120.png": 120,
  "apple-icon-144x144.png": 144,
  "apple-icon-152x152.png": 152,
  "apple-icon-180x180.png": 180,

  // MS icons
  "ms-icon-70x70.png": 70,
  "ms-icon-144x144.png": 144,
  "ms-icon-150x150.png": 150,
  "ms-icon-310x310.png": 310,

  // Favicon variants
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

  if (!fs.existsSync(blueIconPath)) {
    console.error("❌ Source soulart_icon_blue_fullsizes.ico not found!");
    return;
  }

  try {
    console.log("🎨 Loading source ICO file...");

    // Load the ICO file with Jimp
    const sourceImage = await Jimp.read(blueIconPath);
    console.log(
      `📐 Source image dimensions: ${sourceImage.getWidth()}x${sourceImage.getHeight()}`
    );

    console.log("🔧 Starting high-quality PWA icon generation...");

    let successCount = 0;
    let totalCount = Object.keys(sizes).length;

    for (const [filename, size] of Object.entries(sizes)) {
      try {
        const outputPath = path.join(__dirname, "public", filename);

        // Clone the source image and resize with high quality
        const resizedImage = sourceImage
          .clone()
          .resize(size, size, Jimp.RESIZE_LANCZOS) // High-quality Lanczos resampling
          .quality(100); // Maximum quality

        // Save as PNG with maximum quality
        await resizedImage.writeAsync(outputPath);

        const fileSize = Math.round(fs.statSync(outputPath).size / 1024);
        console.log(
          `✅ Generated ${filename} (${size}x${size}) - ${fileSize}KB`
        );
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to generate ${filename}:`, error.message);
      }
    }

    // Generate special Apple icons
    try {
      const touchIconPath = path.join(
        __dirname,
        "public",
        "apple-touch-icon.png"
      );
      const precomposedIconPath = path.join(
        __dirname,
        "public",
        "apple-icon-precomposed.png"
      );
      const generalAppleIconPath = path.join(
        __dirname,
        "public",
        "apple-icon.png"
      );

      const appleIcon = sourceImage
        .clone()
        .resize(180, 180, Jimp.RESIZE_LANCZOS)
        .quality(100);

      await appleIcon.writeAsync(touchIconPath);
      await appleIcon.writeAsync(precomposedIconPath);
      await appleIcon.writeAsync(generalAppleIconPath);

      console.log("✅ Generated special Apple icons (180x180)");
      successCount += 3;
      totalCount += 3;
    } catch (error) {
      console.error(
        "❌ Failed to generate special Apple icons:",
        error.message
      );
    }

    console.log("\n🎉 PWA icon optimization completed!");
    console.log(
      `📊 Generated ${successCount}/${totalCount} icons successfully`
    );
    console.log(
      "📱 All icons created from soulart_icon_blue_fullsizes.ico with maximum quality"
    );
    console.log("🚀 Android and iOS icons optimized for best PWA experience");
  } catch (error) {
    console.error("❌ Failed to load source ICO file:", error.message);
    console.log(
      "💡 Make sure soulart_icon_blue_fullsizes.ico exists in the public folder"
    );
  }
}

optimizeIcons().catch(console.error);
