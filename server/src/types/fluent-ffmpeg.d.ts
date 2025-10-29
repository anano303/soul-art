declare module 'fluent-ffmpeg' {
  import { Readable } from 'stream';

  interface FfmpegCommand {
    addInput(input: string | Readable): FfmpegCommand;
    inputOptions(options: string[]): FfmpegCommand;
    videoFilters(filters: string[] | string): FfmpegCommand;
    outputOptions(options: string[]): FfmpegCommand;
    on(event: 'end', listener: () => void): FfmpegCommand;
    on(event: 'error', listener: (error: Error) => void): FfmpegCommand;
    save(path: string): FfmpegCommand;
  }

  interface FfmpegStatic {
    (input?: string | Readable): FfmpegCommand;
    setFfmpegPath(path: string): void;
    setFfprobePath(path: string): void;
  }

  const ffmpeg: FfmpegStatic;
  export default ffmpeg;
}

declare module '@ffmpeg-installer/ffmpeg' {
  const ffmpegInstaller: { path: string };
  export default ffmpegInstaller;
}

declare module '@ffprobe-installer/ffprobe' {
  const ffprobeInstaller: { path: string };
  export default ffprobeInstaller;
}
