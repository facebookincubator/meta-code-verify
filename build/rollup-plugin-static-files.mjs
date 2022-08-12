import * as fs from 'fs/promises';
import * as path from 'path';
import * as process from 'process';

async function readDirRecursive(dirPath) {
  const fileNames = await fs.readdir(dirPath);
  const files = [];
  await Promise.all(
    fileNames.map(async fileName => {
      const stats = await fs.stat(path.resolve(dirPath, fileName));
      if (stats.isDirectory()) {
        files.push(
          ...(await readDirRecursive(path.resolve(dirPath, fileName)))
        );
      } else {
        files.push(path.resolve(dirPath, fileName));
        return Promise.resolve();
      }
    })
  );
  return files;
}

const DEFAULT_OPTIONS = {
  keepDir: false,
};

/**
 * A simple plugin that copies files from a source directory to output.dir
 *
 * @param {Array<string>} dirs Directories to recursively copy files from
 * @param {Object} options Plugin options
 * @param {boolean} option.keepDir Include directory in output directory
 *    (e.g. if true, and your directory is `locales/`, output directory will
 *    have: `dist/locales/<contents of locales/>`, vs. just
 *    `dist/<contents of locales>`)
 * @returns Rollup.PluginImpl
 */
export default function rollupPluginStaticFiles(dirs = [], options) {
  const { keepDir } = {...DEFAULT_OPTIONS, ...options};
  if (!Array.isArray(dirs)) {
    dirs = [dirs];
  }
  return {
    name: 'rollup-plugin-static-files',

    async generateBundle(_options, _bundle, _isWrite) {
      const rootDir = process.cwd();
      await Promise.all(
        dirs.map(async dir => {
          const dirPath = path.resolve(rootDir, dir);
          const filePaths = await readDirRecursive(path.resolve(rootDir, dir));
          return await Promise.all(
            filePaths.map(async filePath => {
              this.emitFile({
                type: 'asset',
                fileName: path.relative(keepDir ? rootDir : dirPath, filePath),
                source: await fs.readFile(filePath),
              });
            })
          );
        })
      );
    },
  };
}