/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as process from 'process';
import type {Plugin} from 'rollup';

import {readDirRecursive} from './utils';

const DEFAULT_OPTIONS = {
  keepDir: false,
};

/**
 * A simple plugin that copies files from a source directory to output.dir
 *
 * @param {boolean} option.keepDir Include directory in output directory
 *    (e.g. if true, and your directory is `locales/`, output directory will
 *    have: `dist/locales/<contents of locales/>`, vs. just
 *    `dist/<contents of locales>`)
 */
export default function rollupPluginStaticFiles(
  dirs: Array<string> | string = [],
  options?: {keepDir: boolean},
): Plugin {
  const {keepDir} = {...DEFAULT_OPTIONS, ...options};
  const dirsArray = !Array.isArray(dirs) ? [dirs] : dirs;
  return {
    name: 'rollup-plugin-static-files',

    async generateBundle(_options, _bundle, _isWrite) {
      const rootDir = process.cwd();
      await Promise.all(
        dirsArray.map(async dir => {
          const dirPath = path.resolve(rootDir, dir);
          const filePaths = await readDirRecursive(path.resolve(rootDir, dir));
          return await Promise.all(
            filePaths.map(async filePath => {
              this.emitFile({
                type: 'asset',
                fileName: path.relative(keepDir ? rootDir : dirPath, filePath),
                source: await fs.readFile(filePath),
              });
            }),
          );
        }),
      );
    },
  };
}
