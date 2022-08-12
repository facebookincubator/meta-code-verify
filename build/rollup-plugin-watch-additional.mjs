import * as path from 'path';
import * as process from 'process';

import { readDirRecursive } from './utils';

export default function rollupPluginWatch(dirs) {
  return {
    name: 'rollup-plugin-watch-additional',

    async buildStart(_options) {
      const rootDir = process.cwd();
      await Promise.all(
        dirs.map(async dir => {
          const watchFilePaths = await readDirRecursive(
            path.resolve(rootDir, dir)
          );
          for (const filePath of watchFilePaths) {
            this.addWatchFile(filePath);
          }
        })
      );
    },
  };
}
