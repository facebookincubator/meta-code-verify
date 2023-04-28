/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import * as process from 'process';

import {readDirRecursive} from './utils';

export default function rollupPluginWatch(dirs) {
  return {
    name: 'rollup-plugin-watch-additional',

    async buildStart(_options) {
      const rootDir = process.cwd();
      await Promise.all(
        dirs.map(async dir => {
          const watchFilePaths = await readDirRecursive(
            path.resolve(rootDir, dir),
          );
          for (const filePath of watchFilePaths) {
            this.addWatchFile(filePath);
          }
        }),
      );
    },
  };
}
