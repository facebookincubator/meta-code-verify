/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export default async function downloadJSArchive(
  sourceScripts: Map<string, ReadableStream>,
  inlineScripts: Array<Map<string, string>>,
): Promise<void> {
  const fileHandle = await window.showSaveFilePicker({
    suggestedName: 'meta_source_files.gz',
  });

  const writableStream: WritableStream = await fileHandle.createWritable();
  // delimiter between files
  const delimPrefix = '\n********** new file: ';
  const delimSuffix = ' **********\n';
  const enc = new TextEncoder();

  for (const [fileName, compressedStream] of sourceScripts.entries()) {
    const delim = delimPrefix + fileName + delimSuffix;
    const encodedDelim = enc.encode(delim);
    const delimStream = new window.CompressionStream('gzip');
    const writer = delimStream.writable.getWriter();
    writer.write(encodedDelim);
    writer.close();
    await delimStream.readable.pipeTo(writableStream, {preventClose: true});
    await compressedStream.pipeTo(writableStream, {preventClose: true});
  }

  for (const inlineSrcMap of inlineScripts) {
    const inlineHash = inlineSrcMap.keys().next().value;
    const inlineSrc = inlineSrcMap.values().next().value;
    const delim = delimPrefix + 'Inline Script ' + inlineHash + delimSuffix;
    const encodedDelim = enc.encode(delim);
    const delimStream = new window.CompressionStream('gzip');
    const delimWriter = delimStream.writable.getWriter();
    delimWriter.write(encodedDelim);
    delimWriter.close();
    await delimStream.readable.pipeTo(writableStream, {preventClose: true});
    const inlineStream = new window.CompressionStream('gzip');
    const writer = inlineStream.writable.getWriter();
    writer.write(enc.encode(inlineSrc));
    writer.close();
    await inlineStream.readable.pipeTo(writableStream, {preventClose: true});
  }
  writableStream.close();
}
