export {};

type CompressionFormat = 'deflate' | 'deflate-raw' | 'gzip';

declare class CompressionStream implements GenericTransformStream {
  readonly readable: ReadableStream;
  readonly writable: WritableStream;
}

declare global {
  interface Window {
    CompressionStream: {
      new (format?: CompressionFormat): CompressionStream;
    };
    showSaveFilePicker: (_: {suggestedName: string}) => Promise<any>;
  }
}
