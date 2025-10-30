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
if (ffmpegInstaller?.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}
if (ffprobeInstaller?.path) {
  ffmpeg.setFfprobePath(ffprobeInstaller.path);
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

  try {
    console.log(`🎬 Worker: Processing video for product ${data.productId}`);

    // Bootstrap NestJS to get services
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    const youtubeService = app.get(YoutubeService);
    const configService = app.get(ConfigService);

    // Create temp directory
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), `soulart-worker-`));

    let finalVideoPath: string | null = null;

    // Download images for slideshow
    const imageBuffers: Array<{ buffer: Buffer; filename: string }> = [];
    if (data.images && data.images.length > 0) {
      console.log(`Downloading ${data.images.length} images...`);
      for (let i = 0; i < data.images.length; i++) {
        try {
          const response = await axios.get(data.images[i], {
            responseType: 'arraybuffer',
            timeout: 30000,
          });
          imageBuffers.push({
            buffer: Buffer.from(response.data),
            filename: `image-${i + 1}.jpg`,
          });
        } catch (error) {
          console.warn(`Failed to download image ${i + 1}:`, error.message);
        }
      }
    }

    // Case 1: Video + Images → Merge
    if (
      data.videoFilePath &&
      fs.existsSync(data.videoFilePath) &&
      imageBuffers.length > 0
    ) {
      console.log('Case 1: Merging video with slideshow');

      // Generate slideshow
      const slideshowPath = await generateSlideshow(
        tempDir,
        imageBuffers,
        data.productName,
        configService,
      );

      // Merge video + slideshow
      finalVideoPath = await mergeVideos(
        tempDir,
        data.videoFilePath,
        slideshowPath,
        data.productName,
      );
    }
    // Case 2: Only video
    else if (data.videoFilePath && fs.existsSync(data.videoFilePath)) {
      console.log('Case 2: Using uploaded video only');
      finalVideoPath = data.videoFilePath;
    }
    // Case 3: Only images
    else if (imageBuffers.length > 0) {
      console.log('Case 3: Generating slideshow from images');
      finalVideoPath = await generateSlideshow(
        tempDir,
        imageBuffers,
        data.productName,
        configService,
      );
    } else {
      throw new Error('No video or images available');
    }

    if (!finalVideoPath) {
      throw new Error('Failed to prepare video');
    }

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

    console.log(`Uploading to YouTube...`);
    const result = await youtubeService.uploadVideo(
      finalVideoPath,
      uploadOptions,
    );

    console.log(`✅ Upload successful: ${result.videoId}`);

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

    await app.close();
  } catch (error) {
    console.error(`❌ Worker error:`, error);
    parentPort?.postMessage({
      success: false,
      error: error.message,
    });
  } finally {
    // Cleanup
    if (tempDir) {
      try {
        await fsp.rm(tempDir, { recursive: true, force: true });
      } catch (e) {}
    }
    if (workerData.videoFilePath && fs.existsSync(workerData.videoFilePath)) {
      try {
        await fsp.unlink(workerData.videoFilePath);
      } catch (e) {}
    }
  }
}

async function generateSlideshow(
  tempDir: string,
  images: Array<{ buffer: Buffer; filename: string }>,
  productName: string,
  configService: ConfigService,
): Promise<string> {
  const slideDuration = configService.get('YOUTUBE_SLIDE_DURATION_SECONDS', 5);

  // Save images as frames
  const framesDir = path.join(tempDir, 'frames');
  await fsp.mkdir(framesDir, { recursive: true });

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

    console.log(`Processed frame ${i + 1}/${images.length}`);
  }

  // Generate video
  const outputPath = path.join(tempDir, `slideshow-${Date.now()}.mp4`);

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .addInput(path.join(framesDir, 'frame-%03d.jpg'))
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
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath);
  });

  console.log(`Slideshow generated: ${outputPath}`);
  return outputPath;
}

async function mergeVideos(
  tempDir: string,
  videoPath: string,
  slideshowPath: string,
  productName: string,
): Promise<string> {
  const outputPath = path.join(tempDir, `merged-${Date.now()}.mp4`);

  // Create concat list
  const concatListPath = path.join(tempDir, 'concat-list.txt');
  const concatContent = `file '${videoPath}'\nfile '${slideshowPath}'`;
  await fsp.writeFile(concatListPath, concatContent);

  console.log('Merging video and slideshow...');

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .addInput(concatListPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy'])
      .on('end', () => {
        console.log('✅ Videos merged successfully');
        resolve();
      })
      .on('error', (err) => {
        console.error('Failed to merge videos:', err);
        reject(err);
      })
      .save(outputPath);
  });

  return outputPath;
}

// Start processing
processVideo();
