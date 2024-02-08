/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Plugin, RollupOptions} from 'rollup';

import cleanOnce from './build/rollup-plugin-clean-once';
import eslintPlugin from '@rollup/plugin-eslint';
import typescript from '@rollup/plugin-typescript';
import prettierBuildStart from './build/rollup-plugin-prettier-build-start';
import staticFiles from './build/rollup-plugin-static-files';
import watch from './build/rollup-plugin-watch-additional';

function eslint(): Plugin {
  return eslintPlugin({throwOnError: true});
}
function prettierSrc(): Plugin {
  return prettierBuildStart('"src/**/*.(js|ts)"');
}

const TARGETS_TO_MANIFEST_VERSION = {chrome: 'v3', edge: 'v3', firefox: 'v2'};
const SITES = ['WA', 'MSGR', 'FB', 'IG'];

const contentScriptSteps: Array<RollupOptions> = SITES.map((site, index) => ({
  input: `src/js/detect${site}Meta.ts`,
  output: Object.keys(TARGETS_TO_MANIFEST_VERSION).map(target => ({
    file: `dist/${target}/content${site}.js`,
    format: 'iife',
  })),
  plugins: [cleanOnce(), typescript(), prettierSrc(), eslint()],
}));

const config: Array<RollupOptions> = contentScriptSteps.concat([
  {
    input: 'src/js/background.ts',
    output: Object.keys(TARGETS_TO_MANIFEST_VERSION).map(target => ({
      file: `dist/${target}/background.js`,
      format: 'iife',
    })),
    plugins: [typescript(), prettierSrc(), eslint()],
  },
  {
    input: 'src/js/popup.ts',
    output: (
      Object.keys(TARGETS_TO_MANIFEST_VERSION) as Array<
        keyof typeof TARGETS_TO_MANIFEST_VERSION
      >
    ).map(target => ({
      file: `dist/${target}/popup.js`,
      format: 'iife',
      plugins: [staticFiles(`config/${TARGETS_TO_MANIFEST_VERSION[target]}/`)],
    })),
    plugins: [
      typescript(),
      prettierSrc(),
      eslint(),
      staticFiles(['images/', 'src/css/', 'src/html/']),
      staticFiles('_locales/', {keepDir: true}),
      watch(['images/', 'src/css/', 'src/html/', '_locales/', 'config/']),
    ],
  },
]);

export default config;
