/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Recursively get all files inside a directory
 *
 * @param {string} dirPath path to directory
 * @returns {Array<string>}
 */
export async function readDirRecursive(dirPath) {
  const fileNames = await fs.readdir(dirPath);
  const files = [];
  await Promise.all(
    fileNames.map(async fileName => {
      const stats = await fs.stat(path.resolve(dirPath, fileName));
      if (stats.isDirectory()) {
        files.push(
          ...(await readDirRecursive(path.resolve(dirPath, fileName))),
        );
      } else {
        files.push(path.resolve(dirPath, fileName));
        return Promise.resolve();
      }
    }),
  );
  return files;
}
