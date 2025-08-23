declare global {
  interface Window {
    MediaStreamTrackProcessor?: {
      new (init: { track: MediaStreamTrack }): {
        readable: ReadableStream<VideoFrame>;
      };
    };
  }

  class MediaStreamTrackProcessor {
    constructor(init: { track: MediaStreamTrack });
    readable: ReadableStream<VideoFrame>;
  }

  interface VideoFrame {
    displayWidth: number;
    displayHeight: number;
    close(): void;
  }

  class ImageCapture {
    constructor(track: MediaStreamTrack);
    takePhoto(photoSettings?: any): Promise<Blob>;
    getPhotoCapabilities?(): Promise<any>;
  }
}

export {};
