import cleanOnce from './build/rollup-plugin-clean-once.mjs';
import eslintPlugin from '@rollup/plugin-eslint';
import prettierBuildStart from './build/rollup-plugin-prettier-build-start.mjs';
import staticFiles from './build/rollup-plugin-static-files.mjs';
import watch from './build/rollup-plugin-watch-additional.mjs';

function eslint() {
    return eslintPlugin({throwOnError: true});
}
function prettierSrc() {
    return prettierBuildStart('"src/**/*.js"');
}

export default [
    {
        input: 'src/js/detectWAMeta.js',
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
        plugins: [cleanOnce(), prettierSrc(), eslint()],
    },
    {
        input: 'src/js/detectMSGRMeta.js',
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
        plugins: [prettierSrc(), eslint()],
    }, 
    {
        input: 'src/js/detectFBMeta.js',
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
        plugins: [prettierSrc(), eslint()],
    },
    {
        input: 'src/js/background.js',
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
        plugins: [prettierSrc(), eslint()],
    },
    {
        input: 'src/js/popup.js',
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
            prettierSrc(),
            eslint(),
            staticFiles(['images/', 'src/css/', 'src/html/']),
            staticFiles('_locales/', {keepDir: true}),
            watch(['images/', 'src/css/', 'src/html/', '_locales/', 'config/']),
        ],
    }
];
