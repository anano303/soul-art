const fs = require("fs");
const path = require("path");

/**
 * This script prepares the PWA build by copying optimized files and ensuring
 * they contain the required next-pwa integration points.
 */
console.log("🔄 Preparing PWA build...");

// Paths
const swOptimizedPath = path.join(__dirname, "public", "sw.js.optimized");
const swPath = path.join(__dirname, "public", "sw.js");
const nextConfigPath = path.join(__dirname, "next.config.ts");

// Copy and process optimized service worker file
try {
  console.log("🔍 Preparing service worker...");
  
  if (fs.existsSync(swOptimizedPath)) {
    // Copy optimized service worker to main location
    console.log("📋 Copying optimized service worker");
    let swContent = fs.readFileSync(swOptimizedPath, "utf8");
    
    // Ensure the manifest marker is present
    if (!swContent.includes("self.__WB_MANIFEST")) {
      console.log("✨ Adding manifest marker to service worker");
      swContent = `// This is required for next-pwa to inject the manifest
self.__WB_MANIFEST;

${swContent}`;
    }
    
    fs.writeFileSync(swPath, swContent);
    console.log("✅ Service worker prepared successfully");
  } else {
    console.log("⚠️  No optimized service worker found, using existing");
  }
} catch (error) {
  console.error("❌ Error processing service worker:", error.message);
  process.exit(1);
}

// Process next.config.ts file
try {
  console.log("🔍 Checking next.config.ts...");
  let nextConfig = fs.readFileSync(nextConfigPath, "utf8");

  // Check if the config is properly set to use our service worker
  if (nextConfig.includes("swSrc: './public/sw.js.optimized'")) {
    console.log(
      "✨ Updating next.config.ts to use the correct service worker path"
    );
    nextConfig = nextConfig.replace(
      "swSrc: './public/sw.js.optimized'",
      "swSrc: './public/sw.js'"
    );
    fs.writeFileSync(nextConfigPath, nextConfig);
    console.log("✅ Next config updated successfully");
  } else if (nextConfig.includes("swSrc: './public/sw.js'")) {
    console.log(
      "✓ Next config is already using the correct service worker path"
    );
  }
} catch (error) {
  console.error("❌ Error processing next.config.ts:", error.message);
  process.exit(1);
}

console.log("🎉 PWA build preparation complete!");
