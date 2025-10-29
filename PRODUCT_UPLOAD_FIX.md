# Product Edit/Create Server Restart Fix

## Issues Identified

1. **Memory Exhaustion**: 150MB file size limit with memoryStorage() causing server crashes
2. **Heavy YouTube Processing**: Video processing blocking the main thread
3. **File Watch Triggering**: Temporary files causing development server restarts
4. **Unhandled Errors**: Image upload failures crashing the server

## Solutions Implemented

### 1. File Upload Optimization

- **Reduced file size limit**: 150MB → 50MB to prevent memory issues
- **Added file count limit**: Maximum 15 files per request
- **Enhanced error handling**: Proper error catching for Cloudinary uploads

### 2. Background Processing

- **Deferred YouTube processing**: Using setTimeout instead of setImmediate
- **Non-blocking operations**: YouTube video processing happens after response is sent
- **Sequential image processing**: Reduced memory usage in video generation

### 3. Development Environment

- **Updated nest-cli.json**: Added ignore patterns for temp files and uploads
- **Watch mode optimization**: Exclude uploads, temp, and build directories

### 4. Memory Management

- **Reduced JPEG quality**: 90 → 85 to save memory
- **Sequential processing**: Images processed one by one instead of parallel
- **Buffer cleanup**: Manual buffer nullification after processing

## Files Modified

1. `server/src/products/controller/products.controller.ts`

   - Reduced file size limits
   - Added proper error handling
   - Changed background processing timing

2. `server/nest-cli.json`

   - Added watch mode ignore patterns
   - Excluded temp directories from file watching

3. `server/src/products/services/product-youtube.service.ts`
   - Sequential image processing
   - Memory optimization
   - Better error handling

## Recommended Additional Improvements

1. **Use Disk Storage**: Consider switching from memoryStorage to diskStorage for large files
2. **Queue System**: Implement Redis-based queue for video processing
3. **Memory Monitoring**: Add memory usage monitoring and alerts
4. **File Cleanup**: Implement automatic cleanup of temporary files
5. **Rate Limiting**: Add rate limiting for upload endpoints

## Testing

1. Test product creation with multiple large images
2. Test product editing with video files
3. Monitor memory usage during heavy operations
4. Verify server stability during concurrent uploads

## Environment Variables to Consider

```env
# Video processing
YOUTUBE_SLIDE_DURATION_SECONDS=3
SLIDESHOW_OUTRO_IMAGE_URL=https://example.com/outro.jpg
SLIDESHOW_AUDIO_URL=https://example.com/audio.mp3

# Memory limits
NODE_OPTIONS=--max-old-space-size=4096
```

## Monitoring Commands

```bash
# Monitor memory usage
npm install -g node-clinic
clinic doctor -- node dist/main.js

# Watch memory in development
node --inspect dist/main.js
```
