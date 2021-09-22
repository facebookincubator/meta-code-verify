export default [
    {
        input: 'src/js/detectWAMeta.js',
        output: [{
            file: 'dist/chrome/contentWA.js',
            format: 'iife'
        }]
    },
    {
        input: 'src/js/detectFBMeta.js',
        output: [{
            file: 'dist/chrome/contentFB.js',
            format: 'iife'
        }]
    },
    {
        input: 'src/js/background.js',
        output: [{
            file: 'dist/chrome/background.js',
            format: 'iife'
        }]
    },
    {
        input: 'src/js/popup.js',
        output: [{
            file: 'dist/chrome/popup.js',
            format: 'iife'
        }]
    }

];
