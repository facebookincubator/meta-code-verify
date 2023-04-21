/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as process from 'process';

async function genHasAccess(path) {
  try {
    await fs.access(path, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch (_err) {
    return false;
  }
}

const deletedDirs = new Set();

/**
 * A simple plugin that deletes output directories *once* (so we don't delete
 * them over and over again when running `watch`, and to not mess up subsquent
 * rollup entries that use the same directory and the same plugin).
 */
export default function rollupPluginCleanOnce() {
  return {
    name: 'rollup-plugin-clean',

    async generateBundle(options, _bundle, isWrite) {
      // No point in cleaning if rollup isn't going to write the output
      if (!isWrite) {
        return;
      }
      const rootDir = process.cwd();
      const dirToDelete = options.dir
        ? path.resolve(rootDir, options.dir)
        : path.dirname(path.resolve(rootDir, options.file));
      // Only delete once.
      if (deletedDirs.has(dirToDelete)) {
        return;
      }
      deletedDirs.add(dirToDelete);
      if (await genHasAccess(dirToDelete)) {
        console.log('Deleting:', dirToDelete);
        await fs.rm(dirToDelete, { recursive: true });
      }
    },
  };
}
