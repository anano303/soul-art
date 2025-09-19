const fs = require("fs");
const path = require("path");
const glob = require("glob");

/**
 * CSS Analysis Script
 * Analyzes CSS usage and provides optimization recommendations
 */

const analyzeCSS = () => {
  console.log("🔍 Analyzing CSS usage...\n");

  // Find all CSS files
  const cssFiles = glob.sync(".next/static/css/*.css");
  const componentCSSFiles = glob.sync("src/**/*.css");

  console.log("📊 CSS File Analysis:");
  console.log(`   Total built CSS files: ${cssFiles.length}`);
  console.log(`   Component CSS files: ${componentCSSFiles.length}\n`);

  // Analyze CSS file sizes
  let totalSize = 0;
  const fileSizes = cssFiles.map((file) => {
    const stats = fs.statSync(file);
    totalSize += stats.size;
    return {
      file: path.basename(file),
      size: stats.size,
      sizeKB: (stats.size / 1024).toFixed(2),
    };
  });

  console.log("📏 CSS File Sizes:");
  fileSizes
    .sort((a, b) => b.size - a.size)
    .forEach(({ file, sizeKB }) => {
      console.log(`   ${file}: ${sizeKB}KB`);
    });

  console.log(`\n💾 Total CSS Size: ${(totalSize / 1024).toFixed(2)}KB\n`);

  // Find potentially unused CSS files
  const tsxFiles = glob.sync("src/**/*.{tsx,ts,js,jsx}");
  const unusedCSS = [];

  componentCSSFiles.forEach((cssFile) => {
    const cssName = path.basename(cssFile, ".css");
    const isImported = tsxFiles.some((tsxFile) => {
      const content = fs.readFileSync(tsxFile, "utf8");
      return (
        content.includes(cssFile.replace("src/", "./")) ||
        content.includes(cssName) ||
        content.includes(cssFile)
      );
    });

    if (!isImported) {
      unusedCSS.push(cssFile);
    }
  });

  if (unusedCSS.length > 0) {
    console.log("⚠️  Potentially Unused CSS Files:");
    unusedCSS.forEach((file) => console.log(`   ${file}`));
    console.log("");
  }

  // Optimization recommendations
  console.log("💡 Optimization Recommendations:");

  if (fileSizes.length > 8) {
    console.log("   • Consider consolidating small CSS files");
  }

  if (totalSize > 50 * 1024) {
    // > 50KB
    console.log("   • Consider using CSS-in-JS for component styles");
    console.log("   • Implement critical CSS extraction");
  }

  if (unusedCSS.length > 0) {
    console.log(`   • Remove ${unusedCSS.length} potentially unused CSS files`);
  }

  console.log("   • Use CSS modules for better tree-shaking");
  console.log("   • Consider lazy loading non-critical CSS");

  console.log("\n✅ CSS analysis complete!");
};

// Run analysis
try {
  analyzeCSS();
} catch (error) {
  console.error("❌ Error analyzing CSS:", error.message);

  // Fallback analysis without .next directory
  console.log("\n📂 Component CSS Files Found:");
  const componentCSSFiles = glob.sync("src/**/*.css");
  componentCSSFiles.forEach((file) => {
    console.log(`   ${file}`);
  });

  console.log(`\n📊 Total component CSS files: ${componentCSSFiles.length}`);
}
