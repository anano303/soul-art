import { parentPort, workerData } from 'worker_threads';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app/app.module';
import { YoutubeService } from '@/youtube/youtube.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import * as os from 'os';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import sharp from 'sharp';
import axios from 'axios';

// Configure ffmpeg
console.log('🔧 Configuring FFmpeg...');
if (ffmpegInstaller?.path) {
  console.log(`   ✅ FFmpeg binary: ${ffmpegInstaller.path}`);
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  // Check if binary exists
  if (fs.existsSync(ffmpegInstaller.path)) {
    console.log('   ✅ FFmpeg binary file exists');
  } else {
    console.error('   ❌ FFmpeg binary file NOT FOUND!');
  }
} else {
  console.error('   ❌ FFmpeg installer path is undefined!');
}

if (ffprobeInstaller?.path) {
  console.log(`   ✅ FFprobe binary: ${ffprobeInstaller.path}`);
  ffmpeg.setFfprobePath(ffprobeInstaller.path);
} else {
  console.error('   ❌ FFprobe installer path is undefined!');
}

interface WorkerData {
  productId: string;
  productName: string;
  productDescription: string;
  userName: string;
  userEmail: string;
  images: string[];
  videoFilePath?: string;
}

async function processVideo() {
  const data: WorkerData = workerData;
  let tempDir: string | null = null;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 WORKER THREAD STARTED');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📦 Product ID: ${data.productId}`);
  console.log(`📝 Product Name: ${data.productName}`);
  console.log(`🖼️  Images Count: ${data.images?.length || 0}`);
  console.log(`📹 Video File Path: ${data.videoFilePath || 'NONE'}`);
  console.log(`👤 User: ${data.userName} (${data.userEmail})`);
  console.log('═══════════════════════════════════════════════════════════════');

  try {
    console.log('');
    console.log('🔧 Step 1: Bootstrapping NestJS Application Context...');
    
    // Check FFmpeg availability
    console.log('🔍 Checking FFmpeg installation...');
    console.log(`   FFmpeg path: ${ffmpegInstaller?.path || 'Not configured'}`);
    console.log(`   FFprobe path: ${ffprobeInstaller?.path || 'Not configured'}`);
    
    // Bootstrap NestJS to get services
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    console.log('✅ NestJS Application Context created');
    
    const youtubeService = app.get(YoutubeService);
    console.log('✅ YoutubeService retrieved');
    
    const configService = app.get(ConfigService);
    console.log('✅ ConfigService retrieved');

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
          console.log(`   [${i + 1}/${data.images.length}] Downloading: ${data.images[i]}`);
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
          console.warn(`   ⚠️  Failed to download image ${i + 1}: ${error.message}`);
        }
      }
      console.log(`✅ Successfully downloaded ${imageBuffers.length}/${data.images.length} images`);
    } else {
      console.log('ℹ️  No images to download');
    }

    console.log('');
    console.log('🎬 Step 4: Determining video processing scenario...');
    // Case 1: Video + Images → Merge
    if (
      data.videoFilePath &&
      fs.existsSync(data.videoFilePath) &&
      imageBuffers.length > 0
    ) {
      console.log('📹 SCENARIO 1: Video + Images → Will merge video with slideshow');
      console.log(`   Video exists: ${data.videoFilePath}`);
      console.log(`   Images to add: ${imageBuffers.length}`);

      console.log('');
      console.log('🎞️  Step 5a: Generating slideshow from images...');
      // Generate slideshow
      const slideshowPath = await generateSlideshow(
        tempDir,
        imageBuffers,
        data.productName,
        configService,
      );
      console.log(`✅ Slideshow generated: ${slideshowPath}`);

      console.log('');
      console.log('🔗 Step 5b: Merging video with slideshow...');
      // Merge video + slideshow
      finalVideoPath = await mergeVideos(
        tempDir,
        data.videoFilePath,
        slideshowPath,
        data.productName,
      );
      console.log(`✅ Videos merged: ${finalVideoPath}`);
    }
    // Case 2: Only video
    else if (data.videoFilePath && fs.existsSync(data.videoFilePath)) {
      console.log('📹 SCENARIO 2: Video only → Will use uploaded video directly');
      console.log(`   Video path: ${data.videoFilePath}`);
      finalVideoPath = data.videoFilePath;
      console.log('✅ Using existing video file');
    }
    // Case 3: Only images
    else if (imageBuffers.length > 0) {
      console.log('🖼️  SCENARIO 3: Images only → Will generate slideshow');
      console.log(`   Images count: ${imageBuffers.length}`);
      
      console.log('');
      console.log('🎞️  Step 5: Generating slideshow from images...');
      try {
        finalVideoPath = await generateSlideshow(
          tempDir,
          imageBuffers,
          data.productName,
          configService,
        );
        console.log(`✅ Slideshow generated: ${finalVideoPath}`);
      } catch (slideshowError) {
        console.error('❌ Slideshow generation failed:', slideshowError);
        throw new Error(`Failed to generate slideshow: ${slideshowError.message}`);
      }
    } else {
      console.error('❌ ERROR: No video or images available for processing!');
      throw new Error('No video or images available');
    }

    if (!finalVideoPath) {
      console.error('❌ ERROR: Failed to prepare final video path!');
      throw new Error('Failed to prepare video');
    }

    console.log('');
    console.log('📤 Step 6: Uploading to YouTube...');
    console.log(`   Final video path: ${finalVideoPath}`);
    const videoStats = fs.statSync(finalVideoPath);
    console.log(`   Video size: ${(videoStats.size / 1024 / 1024).toFixed(2)} MB`);

    // Upload to YouTube
    const uploadOptions = {
      title: `${data.productName} - SoulArt`.substring(0, 100),
      description: data.productDescription
        ? `${data.productDescription}\n\nCreated by ${data.userName || data.userEmail} on SoulArt`
        : `Beautiful artwork by ${data.userName || data.userEmail} on SoulArt`,
      tags: [
        'SoulArt',
        'artwork',
        'digital art',
        'creative',
        data.productName,
      ].slice(0, 15),
      privacyStatus: 'public' as const,
    };

    console.log(`📋 Upload metadata:`);
    console.log(`   Title: ${uploadOptions.title}`);
    console.log(`   Privacy: ${uploadOptions.privacyStatus}`);
    console.log(`   Tags: ${uploadOptions.tags.join(', ')}`);
    
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
    console.log('📨 Step 7: Sending success message to main thread...');
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
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ WORKER COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════════');
  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('💥 WORKER ERROR');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error(`Error Name: ${error.name}`);
    console.error(`Error Message: ${error.message}`);
    console.error(`Error Stack:`);
    console.error(error.stack);
    console.error('═══════════════════════════════════════════════════════════════');
    
    console.log('');
    console.log('📨 Sending error message to main thread...');
    parentPort?.postMessage({
      success: false,
      error: error.message,
    });
    console.log('✅ Error message sent');
  } finally {
    console.log('');
    console.log('🧹 Step 8: Cleanup...');
    // Cleanup
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
        console.log(`   Removing uploaded video file: ${workerData.videoFilePath}`);
        await fsp.unlink(workerData.videoFilePath);
        console.log('   ✅ Uploaded video file removed');
      } catch (e) {
        console.warn(`   ⚠️  Failed to remove video file: ${e.message}`);
      }
    }
    console.log('✅ Cleanup completed');
  }
}

async function generateSlideshow(
  tempDir: string,
  images: Array<{ buffer: Buffer; filename: string }>,
  productName: string,
  configService: ConfigService,
): Promise<string> {
  console.log('');
  console.log('   ┌─────────────────────────────────────────────────────');
  console.log('   │ 🎞️  GENERATING SLIDESHOW');
  console.log('   └─────────────────────────────────────────────────────');
  
  const slideDuration = configService.get('YOUTUBE_SLIDE_DURATION_SECONDS', 5);
  console.log(`   ⏱️  Slide duration: ${slideDuration} seconds`);

  // Save images as frames
  const framesDir = path.join(tempDir, 'frames');
  await fsp.mkdir(framesDir, { recursive: true });
  console.log(`   📁 Frames directory: ${framesDir}`);

  console.log(`   🖼️  Processing ${images.length} images...`);
  for (let i = 0; i < images.length; i++) {
    const frameName = `frame-${String(i + 1).padStart(3, '0')}.jpg`;
    const framePath = path.join(framesDir, frameName);

    await sharp(images[i].buffer)
      .resize(1920, 1080, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .jpeg({ quality: 85 })
      .toFile(framePath);

    console.log(`      [${i + 1}/${images.length}] ✅ ${frameName}`);
  }

  // Generate video
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
    
    const command = ffmpeg()
      .addInput(inputPattern)
      .inputOptions([`-framerate 1/${slideDuration}`])
      .videoFilters([
        'scale=1920:1080:force_original_aspect_ratio=decrease',
        'pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
      ])
      .outputOptions([
        '-c:v libx264',
        '-pix_fmt yuv420p',
        '-r 30',
        '-preset ultrafast',
        '-crf 28',
        '-an',
      ])
      .on('end', () => {
        console.log('   ✅ FFmpeg encoding completed');
        resolve();
      })
      // @ts-ignore - fluent-ffmpeg types are incorrect, error callback gets 3 params
      .on('error', (err: any, stdout: any, stderr: any) => {
        console.error(`   ❌ FFmpeg error: ${err.message}`);
        console.error(`   📋 Error code: ${err.code}`);
        if (stdout) console.error(`   📤 STDOUT:`, stdout);
        if (stderr) console.error(`   📤 STDERR:`, stderr);
        console.error(`   📋 Full error object:`, err);
        reject(new Error(`FFmpeg slideshow generation failed: ${err.message}`));
      });
      
    try {
      command.save(outputPath);
    } catch (syncError) {
      console.error(`   ❌ Synchronous error starting FFmpeg:`, syncError);
      reject(syncError);
    }
  });

  const stats = fs.statSync(outputPath);
  console.log(`   ✅ Slideshow generated: ${outputPath}`);
  console.log(`   📦 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  return outputPath;
}

async function mergeVideos(
  tempDir: string,
  videoPath: string,
  slideshowPath: string,
  productName: string,
): Promise<string> {
  console.log('');
  console.log('   ┌─────────────────────────────────────────────────────');
  console.log('   │ 🔗 MERGING VIDEOS');
  console.log('   └─────────────────────────────────────────────────────');
  
  const outputPath = path.join(tempDir, `merged-${Date.now()}.mp4`);
  console.log(`   📥 Input video: ${videoPath}`);
  console.log(`   📥 Input slideshow: ${slideshowPath}`);
  console.log(`   📤 Output: ${outputPath}`);

  // Create concat list
  const concatListPath = path.join(tempDir, 'concat-list.txt');
  const concatContent = `file '${videoPath}'\nfile '${slideshowPath}'`;
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
  return outputPath;
}

// Start processing
processVideo();
