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
        }]
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
        }]
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
        }]
    },
    {
        input: 'src/js/popup.js',
        output: [{
            file: 'dist/chrome/popup.js',
            format: 'iife'
        }, {
            file: 'dist/edge/popup.js',
            format: 'iife'
        }, {
            file: 'dist/firefox/popup.js',
            format: 'iife'
        }]
    }

];
