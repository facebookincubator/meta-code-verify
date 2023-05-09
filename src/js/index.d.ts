/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {MessagePayload} from './shared/MessagePayload';

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
