import { parentPort, workerData } from 'worker_threads';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app/app.module';
import { YoutubeService } from '@/youtube/youtube.service';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from '@/cloudinary/services/cloudinary.service';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import * as os from 'os';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import sharp from 'sharp';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configure ffmpeg
console.log('🔧 Configuring FFmpeg...');
if (ffmpegInstaller?.path) {
  console.log(`   ✅ FFmpeg binary: ${ffmpegInstaller.path}`);

  // Check if binary exists
  if (fs.existsSync(ffmpegInstaller.path)) {
    console.log('   ✅ FFmpeg binary file exists');

    // Ensure binary is executable (Linux/Mac)
    try {
      if (process.platform !== 'win32') {
        fs.chmodSync(ffmpegInstaller.path, '755');
        console.log('   ✅ FFmpeg binary permissions set (755)');
      }
    } catch (chmodError) {
      console.warn(`   ⚠️  Could not set permissions: ${chmodError.message}`);
    }
  } else {
    console.error('   ❌ FFmpeg binary file NOT FOUND!');
  }

  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
} else {
  console.error('   ❌ FFmpeg installer path is undefined!');
}

if (ffprobeInstaller?.path) {
  console.log(`   ✅ FFprobe binary: ${ffprobeInstaller.path}`);

  // Ensure ffprobe is also executable
  if (fs.existsSync(ffprobeInstaller.path) && process.platform !== 'win32') {
    try {
      fs.chmodSync(ffprobeInstaller.path, '755');
      console.log('   ✅ FFprobe binary permissions set (755)');
    } catch (chmodError) {
      console.warn(
        `   ⚠️  Could not set FFprobe permissions: ${chmodError.message}`,
      );
    }
  }

  ffmpeg.setFfprobePath(ffprobeInstaller.path);
} else {
  console.error('   ❌ FFprobe installer path is undefined!');
}

// Catch any uncaught errors in worker thread to prevent server crash
process.on('uncaughtException', (error) => {
  console.error('');
  console.error(
    '═══════════════════════════════════════════════════════════════',
  );
  console.error('💥 UNCAUGHT EXCEPTION IN WORKER THREAD');
  console.error(
    '═══════════════════════════════════════════════════════════════',
  );
  console.error(`Error: ${error.message}`);
  console.error(`Stack: ${error.stack}`);
  console.error(
    '═══════════════════════════════════════════════════════════════',
  );

  parentPort?.postMessage({
    success: false,
    error: `Uncaught exception: ${error.message}`,
  });

  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('');
  console.error(
    '═══════════════════════════════════════════════════════════════',
  );
  console.error('💥 UNHANDLED REJECTION IN WORKER THREAD');
  console.error(
    '═══════════════════════════════════════════════════════════════',
  );
  console.error(`Reason: ${reason}`);
  console.error(
    '═══════════════════════════════════════════════════════════════',
  );

  parentPort?.postMessage({
    success: false,
    error: `Unhandled rejection: ${reason}`,
  });

  process.exit(1);
});

interface WorkerData {
  productId: string;
  productName: string;
  productDescription: string;
  price: number;
  discountPercentage: number;
  brand: string;
  category: string;
  userName: string;
  userEmail: string;
  userId: string;
  images: string[];
  videoFilePath?: string;
  // Metadata prepared by the service once the product is saved.
  title?: string;
  description?: string;
  tags?: string[];
  cleanupVideoFile?: boolean;
}

async function processVideo() {
  const data: WorkerData = workerData;
  let tempDir: string | null = null;

  console.log(
    '═══════════════════════════════════════════════════════════════',
  );
  console.log('🚀 WORKER THREAD STARTED');
  console.log(
    '═══════════════════════════════════════════════════════════════',
  );
  console.log(`📦 Product ID: ${data.productId}`);
  console.log(`📝 Product Name: ${data.productName}`);
  console.log(`🖼️  Images Count: ${data.images?.length || 0}`);
  console.log(`📹 Video File Path: ${data.videoFilePath || 'NONE'}`);
  console.log(`👤 User: ${data.userName} (${data.userEmail})`);
  console.log(
    '═══════════════════════════════════════════════════════════════',
  );

  try {
    console.log('');
    console.log('🔧 Step 1: Bootstrapping NestJS Application Context...');

    // Check FFmpeg availability and test execution
    console.log('🔍 Checking FFmpeg installation...');
    console.log(`   FFmpeg path: ${ffmpegInstaller?.path || 'Not configured'}`);
    console.log(
      `   FFprobe path: ${ffprobeInstaller?.path || 'Not configured'}`,
    );

    if (ffmpegInstaller?.path) {
      try {
        console.log('🧪 Testing FFmpeg executable...');
        const { stdout } = await execAsync(
          `"${ffmpegInstaller.path}" -version 2>&1 | head -n 1`,
        );
        console.log(`   ✅ FFmpeg test passed: ${stdout.trim()}`);
      } catch (testError: any) {
        console.error(`   ❌ FFmpeg test failed!`);
        console.error(`   📋 Error: ${testError.message}`);
        if (testError.stderr)
          console.error(`   📤 STDERR: ${testError.stderr}`);
        throw new Error(`FFmpeg is not working: ${testError.message}`);
      }
    }

    // Bootstrap NestJS to get services
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    console.log('✅ NestJS Application Context created');

    const youtubeService = app.get(YoutubeService);
    console.log('✅ YoutubeService retrieved');

    const configService = app.get(ConfigService);
    console.log('✅ ConfigService retrieved');

    const cloudinaryService = app.get(CloudinaryService);
    console.log('✅ CloudinaryService retrieved');

    console.log('');
    console.log('📁 Step 2: Creating temp directory...');
    // Create temp directory
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), `soulart-worker-`));
    console.log(`✅ Temp directory created: ${tempDir}`);

    let finalVideoPath: string | null = null;

    console.log('');
    console.log('🖼️  Step 3: Processing images...');
    // Download images for slideshow
    const imageBuffers: Array<{ buffer: Buffer; filename: string }> = [];
    if (data.images && data.images.length > 0) {
      console.log(`📥 Downloading ${data.images.length} images...`);
      for (let i = 0; i < data.images.length; i++) {
        try {
          console.log(
            `   [${i + 1}/${data.images.length}] Downloading: ${data.images[i]}`,
          );
          const response = await axios.get(data.images[i], {
            responseType: 'arraybuffer',
            timeout: 30000,
          });
          const buffer = Buffer.from(response.data);
          imageBuffers.push({
            buffer,
            filename: `image-${i + 1}.jpg`,
          });
          console.log(`   ✅ Downloaded (${buffer.length} bytes)`);
        } catch (error) {
          console.warn(
            `   ⚠️  Failed to download image ${i + 1}: ${error.message}`,
          );
        }
      }
      console.log(
        `✅ Successfully downloaded ${imageBuffers.length}/${data.images.length} images`,
      );
    } else {
      console.log('ℹ️  No images to download');
    }

    console.log('');
    console.log('🎬 Step 4: Determining video processing scenario...');
    
    // ========================================
    // SLIDESHOW GENERATION TEMPORARILY DISABLED
    // ========================================
    // Case 1: Video + Images → Merge (COMMENTED OUT)
    // if (
    //   data.videoFilePath &&
    //   fs.existsSync(data.videoFilePath) &&
    //   imageBuffers.length > 0
    // ) {
    //   console.log(
    //     '📹 SCENARIO 1: Video + Images → Will merge video with slideshow',
    //   );
    //   console.log(`   Video exists: ${data.videoFilePath}`);
    //   console.log(`   Images to add: ${imageBuffers.length}`);

    //   console.log('');
    //   console.log('🎞️  Step 5a: Generating slideshow from images...');
    //   // Generate slideshow
    //   const slideshowPath = await generateSlideshow(
    //     tempDir,
    //     imageBuffers,
    //     data.productName,
    //     data.productId,
    //     configService,
    //     cloudinaryService,
    //   );
    //   console.log(`✅ Slideshow generated: ${slideshowPath}`);

    //   console.log('');
    //   console.log('🔗 Step 5b: Merging video with slideshow...');
    //   // Merge video + slideshow
    //   finalVideoPath = await mergeVideos(
    //     tempDir,
    //     data.videoFilePath,
    //     slideshowPath,
    //     data.productName,
    //     data.productId,
    //     cloudinaryService,
    //   );
    //   console.log(`✅ Videos merged: ${finalVideoPath}`);
    // }
    
    // Case 2: Only video (ACTIVE)
    if (data.videoFilePath && fs.existsSync(data.videoFilePath)) {
      console.log(
        '📹 SCENARIO: Video only → Will use uploaded video directly',
      );
      console.log(`   Video path: ${data.videoFilePath}`);
      finalVideoPath = data.videoFilePath;
      console.log('✅ Using existing video file');
    }
    
    // Case 3: Only images (COMMENTED OUT - No slideshow generation)
    // else if (imageBuffers.length > 0) {
    //   console.log('🖼️  SCENARIO 3: Images only → Will generate slideshow');
    //   console.log(`   Images count: ${imageBuffers.length}`);

    //   console.log('');
    //   console.log('🎞️  Step 5: Generating slideshow from images...');
    //   try {
    //     finalVideoPath = await generateSlideshow(
    //       tempDir,
    //       imageBuffers,
    //       data.productName,
    //       data.productId,
    //       configService,
    //       cloudinaryService,
    //     );
    //     console.log(`✅ Slideshow generated: ${finalVideoPath}`);
    //   } catch (slideshowError) {
    //     console.error('❌ Slideshow generation failed:', slideshowError);
    //     throw new Error(
    //       `Failed to generate slideshow: ${slideshowError.message}`,
    //     );
    //   }
    // }
    else {
      console.log('ℹ️  No video file uploaded - skipping YouTube upload');
      console.log('   (Slideshow generation is temporarily disabled)');
      
      // Send message that no video processing is needed
      parentPort?.postMessage({
        success: true,
        data: {
          productId: data.productId,
          message: 'No video to upload - product has images only',
        },
      });
      
      await app.close();
      return;
    }

    if (!finalVideoPath) {
      console.error('❌ ERROR: Failed to prepare final video path!');
      throw new Error('Failed to prepare video');
    }

    console.log('');
    console.log('📤 Step 6: Uploading to YouTube...');
    console.log(`   Final video path: ${finalVideoPath}`);
    const videoStats = fs.statSync(finalVideoPath);
    console.log(
      `   Video size: ${(videoStats.size / 1024 / 1024).toFixed(2)} MB`,
    );

    // Build Georgian description with all product details
    let georgianDescription = `🎨 ${data.productName}\n\n`;

    if (data.productDescription) {
      georgianDescription += `📝 აღწერა:\n${data.productDescription}\n\n`;
    }

    georgianDescription += `👤 ავტორი: ${data.userName || data.userEmail}\n`;

    // Price information
    if (data.discountPercentage > 0) {
      const originalPrice = data.price;
      const discountedPrice =
        originalPrice * (1 - data.discountPercentage / 100);
      georgianDescription += `💰 ფასი: ${discountedPrice.toFixed(2)}₾ (ფასდაკლება ${data.discountPercentage}%, იყო ${originalPrice.toFixed(2)}₾)\n`;
    } else {
      georgianDescription += `💰 ფასი: ${data.price.toFixed(2)}₾\n`;
    }

    if (data.category) {
      georgianDescription += `📂 კატეგორია: ${data.category}\n`;
    }

    if (data.brand) {
      georgianDescription += `🏷️ ბრენდი: ${data.brand}\n`;
    }

    const siteBase = (
      process.env.PUBLIC_CLIENT_URL ||
      process.env.CLIENT_URL ||
      process.env.NEXT_PUBLIC_CLIENT_URL ||
      'https://soulart.ge'
    ).replace(/\/+$/, '');
    georgianDescription += `\n🛒 შესყიდვის ბმული: ${siteBase}/products/${data.productId}\n`;
    georgianDescription += `\n✨ SoulArt - ქართული ხელოვნების პლატფორმა`;

    // Build tags with product name, category, brand
    const tags = [
      'SoulArt',
      'ქართული_ხელოვნება',
      'Georgian_Art',
      data.productName,
    ];

    if (data.category) {
      tags.push(data.category);
    }
    if (data.brand) {
      tags.push(data.brand);
    }
    if (data.userName) {
      tags.push(data.userName);
    }

    // Metadata built by the service from the SAVED product wins — it carries
    // the real product link. The locally built one is only a fallback.
    const uploadOptions = {
      title: (
        data.title?.trim() || `${data.productName} - ${data.userName || 'SoulArt'}`
      ).substring(0, 100),
      description: data.description?.trim() || georgianDescription,
      tags: (Array.isArray(data.tags) && data.tags.length
        ? data.tags
        : tags
      ).slice(0, 15), // YouTube allows max 15 tags
      privacyStatus: 'public' as const,
    };

    console.log(`📋 Upload metadata:`);
    console.log(`   Title: ${uploadOptions.title}`);
    console.log(`   Privacy: ${uploadOptions.privacyStatus}`);
    console.log(`   Tags: ${uploadOptions.tags.join(', ')}`);
    console.log(
      `   Description preview: ${uploadOptions.description.substring(0, 200)}...`,
    );

    console.log('🚀 Starting YouTube upload...');
    const result = await youtubeService.uploadVideo(
      finalVideoPath,
      uploadOptions,
    );

    console.log('');
    console.log('✅ YOUTUBE UPLOAD SUCCESSFUL!');
    console.log(`   Video ID: ${result.videoId}`);
    console.log(`   Video URL: ${result.videoUrl}`);
    console.log(`   Embed URL: ${result.embedUrl}`);

    console.log('');
    console.log('🖼️  Step 7: Setting video thumbnail...');
    // Use first product image as thumbnail
    if (data.images && data.images.length > 0) {
      const thumbnailUrl = data.images[0];
      console.log(`   Using first product image: ${thumbnailUrl}`);
      try {
        await youtubeService.setVideoThumbnail(result.videoId, thumbnailUrl);
        console.log(`   ✅ Thumbnail set successfully`);
      } catch (thumbnailError) {
        console.warn(`   ⚠️  Thumbnail upload failed: ${thumbnailError.message}`);
        console.warn(`   ℹ️  Video is still uploaded, thumbnail can be set manually later`);
      }
    } else {
      console.log(`   ℹ️  No product images available for thumbnail`);
    }

    console.log('');
    console.log('🧹 Step 8: Cleaning up Cloudinary temp files...');
    const cloudinaryFolder = `youtube-temp/${data.productId}`;
    try {
      await cloudinaryService.deleteFolder(cloudinaryFolder);
      console.log(`✅ Cloudinary temp folder deleted: ${cloudinaryFolder}`);
    } catch (cleanupError) {
      console.warn(`⚠️  Cloudinary cleanup failed: ${cleanupError.message}`);
      console.warn(`ℹ️  Temp files may remain in: ${cloudinaryFolder}`);
    }

    console.log('');
    console.log('📨 Step 9: Sending success message to main thread...');
    // Send result back to main thread
    parentPort?.postMessage({
      success: true,
      data: {
        productId: data.productId,
        videoId: result.videoId,
        videoUrl: result.videoUrl,
        embedUrl: result.embedUrl,
      },
    });
    console.log('✅ Success message sent to main thread');

    console.log('');
    console.log('🔌 Closing NestJS application context...');
    await app.close();
    console.log('✅ Application context closed');

    console.log('');
    console.log(
      '═══════════════════════════════════════════════════════════════',
    );
    console.log('✅ WORKER COMPLETED SUCCESSFULLY');
    console.log(
      '═══════════════════════════════════════════════════════════════',
    );
  } catch (error) {
    console.error('');
    console.error(
      '═══════════════════════════════════════════════════════════════',
    );
    console.error('💥 WORKER ERROR');
    console.error(
      '═══════════════════════════════════════════════════════════════',
    );
    console.error(`Error Name: ${error.name}`);
    console.error(`Error Message: ${error.message}`);
    console.error(`Error Stack:`);
    console.error(error.stack);
    console.error(
      '═══════════════════════════════════════════════════════════════',
    );

    console.log('');
    console.log('📨 Sending error message to main thread...');
    parentPort?.postMessage({
      success: false,
      error: error.message,
    });
    console.log('✅ Error message sent');
  } finally {
    console.log('');
    console.log('🧹 Step 10: Local filesystem cleanup...');
    // Cleanup local files only
    if (tempDir) {
      try {
        console.log(`   Removing temp directory: ${tempDir}`);
        await fsp.rm(tempDir, { recursive: true, force: true });
        console.log('   ✅ Temp directory removed');
      } catch (e) {
        console.warn(`   ⚠️  Failed to remove temp directory: ${e.message}`);
      }
    }
    if (workerData.videoFilePath && fs.existsSync(workerData.videoFilePath)) {
      try {
        console.log(
          `   Removing uploaded video file: ${workerData.videoFilePath}`,
        );
        await fsp.unlink(workerData.videoFilePath);
        console.log('   ✅ Uploaded video file removed');
      } catch (e) {
        console.warn(`   ⚠️  Failed to remove video file: ${e.message}`);
      }
    }
    console.log('✅ Cleanup completed');
  }
}

// ========================================
// SLIDESHOW GENERATION - TEMPORARILY DISABLED
// ========================================
// Reason: FFmpeg causes exit code 128 on production server (memory/CPU limits)
// This function will be re-enabled when we find a solution (external service, better server, etc.)

/*
async function generateSlideshow(
  tempDir: string,
  images: Array<{ buffer: Buffer; filename: string }>,
  productName: string,
  productId: string,
  configService: ConfigService,
  cloudinaryService: CloudinaryService,
): Promise<string> {
  console.log('');
  console.log('   ┌─────────────────────────────────────────────────────');
  console.log('   │ 🎞️  GENERATING SLIDESHOW');
  console.log('   └─────────────────────────────────────────────────────');

  const slideDuration = configService.get('YOUTUBE_SLIDE_DURATION_SECONDS', 5);
  console.log(`   ⏱️  Slide duration: ${slideDuration} seconds`);

  // Save images as frames (local for FFmpeg)
  const framesDir = path.join(tempDir, 'frames');
  await fsp.mkdir(framesDir, { recursive: true });
  console.log(`   📁 Frames directory: ${framesDir}`);

  const cloudinaryFolder = `youtube-temp/${productId}`;
  console.log(`   ☁️  Cloudinary folder: ${cloudinaryFolder}`);

  console.log(`   🖼️  Processing ${images.length} product images...`);
  for (let i = 0; i < images.length; i++) {
    const frameName = `frame-${String(i + 1).padStart(3, '0')}.jpg`;
    const framePath = path.join(framesDir, frameName);

    // Process image with Sharp
    const processedBuffer = await sharp(images[i].buffer)
      .resize(1280, 720, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Save locally for FFmpeg
    await fsp.writeFile(framePath, processedBuffer);

    // Upload to Cloudinary for backup/production
    try {
      await cloudinaryService.uploadBuffer(
        processedBuffer,
        frameName.replace('.jpg', ''),
        cloudinaryFolder,
        'image',
      );
      console.log(`      [${i + 1}/${images.length}] ✅ ${frameName} (local + Cloudinary)`);
    } catch (cloudinaryError) {
      console.warn(`      [${i + 1}/${images.length}] ⚠️  ${frameName} (local only, Cloudinary failed: ${cloudinaryError.message})`);
    }
  }

  // Add outro image if configured
  const outroImageUrl = configService.get('SLIDESHOW_OUTRO_IMAGE_URL');
  if (outroImageUrl) {
    console.log(`   🎬 Adding outro image from: ${outroImageUrl}`);
    try {
      const response = await axios.get(outroImageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      const outroBuffer = Buffer.from(response.data);

      const outroFrameName = `frame-${String(images.length + 1).padStart(3, '0')}.jpg`;
      const outroFramePath = path.join(framesDir, outroFrameName);

      const processedOutroBuffer = await sharp(outroBuffer)
        .resize(1280, 720, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Save locally
      await fsp.writeFile(outroFramePath, processedOutroBuffer);

      // Upload to Cloudinary
      try {
        await cloudinaryService.uploadBuffer(
          processedOutroBuffer,
          outroFrameName.replace('.jpg', ''),
          cloudinaryFolder,
          'image',
        );
        console.log(`   ✅ Outro image added: ${outroFrameName} (local + Cloudinary)`);
      } catch (cloudinaryError) {
        console.log(`   ✅ Outro image added: ${outroFrameName} (local only, Cloudinary failed: ${cloudinaryError.message})`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to add outro image: ${error.message}`);
      console.warn(`   ℹ️  Continuing without outro image...`);
    }
  } else {
    console.log(
      `   ℹ️  No outro image configured (SLIDESHOW_OUTRO_IMAGE_URL not set)`,
    );
  }

  // Generate video with FFmpeg (locally)
  const outputPath = path.join(tempDir, `slideshow-${Date.now()}.mp4`);
  console.log(`   🎬 Output path: ${outputPath}`);
  console.log(`   🔧 Starting FFmpeg encoding...`);
  console.log(`   📂 Input pattern: ${path.join(framesDir, 'frame-%03d.jpg')}`);

  // Verify frames exist
  const frameFiles = await fsp.readdir(framesDir);
  console.log(`   📁 Frame files in directory: ${frameFiles.join(', ')}`);

  await new Promise<void>((resolve, reject) => {
    const inputPattern = path.join(framesDir, 'frame-%03d.jpg');
    console.log(`   ▶️  Starting FFmpeg with input: ${inputPattern}`);
    console.log(`   📊 FFmpeg Configuration:`);
    console.log(`      - Input: ${inputPattern}`);
    console.log(`      - Output: ${outputPath}`);
    console.log(`      - Framerate: 1/${slideDuration}`);
    console.log(`      - FFmpeg Binary: ${ffmpegInstaller.path}`);

    const command = ffmpeg()
      .addInput(inputPattern)
      .inputOptions([`-framerate 1/${slideDuration}`])
      .videoFilters([
        'scale=1280:720:force_original_aspect_ratio=decrease',
        'pad=1280:720:(ow-iw)/2:(oh-ih)/2',
      ])
      .outputOptions([
        '-c:v libx264',
        '-pix_fmt yuv420p',
        '-r 30',
        '-preset veryfast',
        '-crf 23',
        '-an',
        '-threads 2',
      ])
      // @ts-ignore - fluent-ffmpeg types incomplete
      .on('start', (commandLine) => {
        console.log(`   🚀 FFmpeg command started:`);
        console.log(`      ${commandLine}`);
      })
      // @ts-ignore - fluent-ffmpeg types incomplete
      .on('progress', (progress) => {
        console.log(`   ⏳ FFmpeg progress: ${JSON.stringify(progress)}`);
      })
      .on('end', () => {
        console.log('   ✅ FFmpeg encoding completed');
        resolve();
      })
      // @ts-ignore - fluent-ffmpeg types are incorrect, error callback gets 3 params
      .on('error', (err: any, stdout: any, stderr: any) => {
        console.error(`   ❌ FFmpeg error: ${err.message}`);
        console.error(`   📋 Error code: ${err.code}`);
        console.error(`   📋 Error name: ${err.name}`);
        console.error(`   📋 Error stack: ${err.stack}`);
        if (stdout) console.error(`   📤 STDOUT:`, stdout);
        if (stderr) console.error(`   📤 STDERR:`, stderr);
        console.error(`   📋 Full error object:`, JSON.stringify(err, null, 2));
        reject(new Error(`FFmpeg slideshow generation failed: ${err.message}`));
      })
      // @ts-ignore - fluent-ffmpeg types incomplete
      .on('stderr', (stderrLine) => {
        console.log(`   📝 FFmpeg stderr: ${stderrLine}`);
      });

    try {
      console.log(`   💾 Calling command.save(${outputPath})...`);
      command.save(outputPath);
      console.log(
        `   ✅ command.save() called successfully, waiting for FFmpeg to complete...`,
      );
    } catch (syncError) {
      console.error(`   ❌ Synchronous error starting FFmpeg:`, syncError);
      console.error(`   ❌ Error type: ${syncError.constructor.name}`);
      console.error(`   ❌ Error message: ${syncError.message}`);
      console.error(`   ❌ Error stack: ${syncError.stack}`);
      reject(syncError);
    }
  });

  const stats = fs.statSync(outputPath);
  console.log(`   ✅ Slideshow generated: ${outputPath}`);
  console.log(`   📦 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // Upload final video to Cloudinary
  console.log(`   ☁️  Uploading final video to Cloudinary...`);
  try {
    const videoBuffer = await fsp.readFile(outputPath);
    const uploadResult = await cloudinaryService.uploadBuffer(
      videoBuffer,
      `slideshow-${Date.now()}`,
      cloudinaryFolder,
      'video',
    );
    console.log(`   ✅ Video uploaded to Cloudinary: ${uploadResult.secure_url}`);
    console.log(`   🔗 Returning Cloudinary URL for YouTube upload`);
    return uploadResult.secure_url;
  } catch (cloudinaryError) {
    console.warn(`   ⚠️  Cloudinary upload failed: ${cloudinaryError.message}`);
    console.warn(`   ℹ️  Falling back to local file path`);
    return outputPath;
  }
}

async function mergeVideos(
  tempDir: string,
  videoPath: string,
  slideshowPath: string,
  productName: string,
  productId: string,
  cloudinaryService: CloudinaryService,
): Promise<string> {
  console.log('');
  console.log('   ┌─────────────────────────────────────────────────────');
  console.log('   │ 🔗 MERGING VIDEOS');
  console.log('   └─────────────────────────────────────────────────────');

  // If slideshowPath is Cloudinary URL, download it first
  let localSlideshowPath = slideshowPath;
  if (slideshowPath.startsWith('http://') || slideshowPath.startsWith('https://')) {
    console.log(`   ☁️  Downloading slideshow from Cloudinary: ${slideshowPath}`);
    const response = await axios.get(slideshowPath, {
      responseType: 'arraybuffer',
      timeout: 60000,
    });
    localSlideshowPath = path.join(tempDir, `slideshow-downloaded-${Date.now()}.mp4`);
    await fsp.writeFile(localSlideshowPath, Buffer.from(response.data));
    console.log(`   ✅ Slideshow downloaded to: ${localSlideshowPath}`);
  }

  const outputPath = path.join(tempDir, `merged-${Date.now()}.mp4`);
  console.log(`   📥 Input video: ${videoPath}`);
  console.log(`   📥 Input slideshow: ${localSlideshowPath}`);
  console.log(`   📤 Output: ${outputPath}`);

  // Create concat list
  const concatListPath = path.join(tempDir, 'concat-list.txt');
  const concatContent = `file '${videoPath}'\nfile '${localSlideshowPath}'`;
  await fsp.writeFile(concatListPath, concatContent);
  console.log(`   📝 Concat list created: ${concatListPath}`);

  console.log('   🔧 Starting FFmpeg merge...');

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .addInput(concatListPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy'])
      .on('end', () => {
        console.log('   ✅ FFmpeg merge completed');
        resolve();
      })
      .on('error', (err) => {
        console.error(`   ❌ FFmpeg merge error: ${err.message}`);
        reject(err);
      })
      .save(outputPath);
  });

  const stats = fs.statSync(outputPath);
  console.log(`   ✅ Videos merged successfully: ${outputPath}`);
  console.log(`   📦 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // Upload merged video to Cloudinary
  console.log(`   ☁️  Uploading merged video to Cloudinary...`);
  const cloudinaryFolder = `youtube-temp/${productId}`;
  try {
    const videoBuffer = await fsp.readFile(outputPath);
    const uploadResult = await cloudinaryService.uploadBuffer(
      videoBuffer,
      `merged-${Date.now()}`,
      cloudinaryFolder,
      'video',
    );
    console.log(`   ✅ Merged video uploaded to Cloudinary: ${uploadResult.secure_url}`);
    console.log(`   🔗 Returning Cloudinary URL for YouTube upload`);
    return uploadResult.secure_url;
  } catch (cloudinaryError) {
    console.warn(`   ⚠️  Cloudinary upload failed: ${cloudinaryError.message}`);
    console.warn(`   ℹ️  Falling back to local file path`);
    return outputPath;
  }
}
*/

// Start processing
processVideo();
