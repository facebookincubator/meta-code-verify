/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export default async function downloadArchive(
  sourceScripts: Map<string, Response>,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunks: Array<any> = [];
  const enc = new TextEncoder();
  const compressionStream = new CompressionStream('gzip');

  for (const [fileName, response] of sourceScripts.entries()) {
    const delim = `\n********** new file: ${fileName} **********\n`;
    const chunk = await response.bytes();
    chunks.push(enc.encode(delim), chunk);
  }

  const readableFromChunks = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  if ('showSaveFilePicker' in window) {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: 'meta_source_files.gz',
    });
    const fileStream = await fileHandle.createWritable();
    readableFromChunks.pipeThrough(compressionStream).pipeTo(fileStream);
  } else {
    const src = await new Response(
      readableFromChunks.pipeThrough(compressionStream),
    ).blob();
    const url = URL.createObjectURL(src);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meta_source_files.gz`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
