/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Plugin, RollupOptions } from 'rollup';

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

const config: Array<RollupOptions> = [
    {
        input: 'src/js/detectWAMeta.ts',
        output: [{
            file: 'dist/chrome/contentWA.js',
            format: 'iife'
        }, {
            file: 'dist/edge/contentWA.js',
            format: 'iife'
        }, {
            file: 'dist/firefox/contentWA.js',
            format: 'iife'
        }],
        plugins: [cleanOnce(), typescript(), prettierSrc(), eslint()],
    },
    {
        input: 'src/js/detectMSGRMeta.ts',
        output: [{
            file: 'dist/chrome/contentMSGR.js',
            format: 'iife'
        }, {
            file: 'dist/edge/contentMSGR.js',
            format: 'iife'
        }, {
            file: 'dist/firefox/contentMSGR.js',
            format: 'iife'
        }],
        plugins: [typescript(), prettierSrc(), eslint()],
    },
    {
        input: 'src/js/detectFBMeta.ts',
        output: [{
            file: 'dist/chrome/contentFB.js',
            format: 'iife'
        }, {
            file: 'dist/edge/contentFB.js',
            format: 'iife'
        }, {
            file: 'dist/firefox/contentFB.js',
            format: 'iife'
        }],
        plugins: [typescript(), prettierSrc(), eslint()],
    },
    {
        input: 'src/js/detectIGMeta.ts',
        output: [{
            file: 'dist/chrome/contentIG.js',
            format: 'iife'
        }, {
            file: 'dist/edge/contentIG.js',
            format: 'iife'
        }, {
            file: 'dist/firefox/contentIG.js',
            format: 'iife'
        }],
        plugins: [typescript(), prettierSrc(), eslint()],
    },
    {
        input: 'src/js/background.ts',
        output: [{
            file: 'dist/chrome/background.js',
            format: 'iife'
        }, {
            file: 'dist/edge/background.js',
            format: 'iife'
        }, {
            file: 'dist/firefox/background.js',
            format: 'iife'
        }],
        plugins: [typescript(), prettierSrc(), eslint()],
    },
    {
        input: 'src/js/popup.ts',
        output: [{
            file: 'dist/chrome/popup.js',
            format: 'iife',
            plugins: [staticFiles('config/v3/')],
        }, {
            file: 'dist/edge/popup.js',
            format: 'iife',
            plugins: [staticFiles('config/v3/')],
        }, {
            file: 'dist/firefox/popup.js',
            format: 'iife',
            plugins: [staticFiles('config/v2/')],
        }],
        plugins: [
            typescript(),
            prettierSrc(),
            eslint(),
            staticFiles(['images/', 'src/css/', 'src/html/']),
            staticFiles('_locales/', {keepDir: true}),
            watch(['images/', 'src/css/', 'src/html/', '_locales/', 'config/']),
        ],
    }
];

export default config;
