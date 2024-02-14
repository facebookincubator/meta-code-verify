# Code Verify 

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg?color=white)](/LICENSE.md) [![Build status](https://img.shields.io/github/actions/workflow/status/facebookincubator/meta-code-verify/tests.js.yml)](https://github.com/facebookincubator/meta-code-verify/actions/workflows/tests.js.yml) [![Chrome Users](https://img.shields.io/badge/Chrome-yellow?logo=Google%20Chrome&logoColor=white)](https://chrome.google.com/webstore/detail/code-verify/llohflklppcaghdpehpbklhlfebooeog) [![Edge Users](https://img.shields.io/badge/Edge-blue?logo=Microsoft%20Edge&logoColor=white)](https://microsoftedge.microsoft.com/addons/detail/code-verify/cpndjjealjjagamdecpipjfamiigaknk) [![Firefox Users](https://img.shields.io/badge/Firefox-orange?logo=Firefox&logoColor=white)](https://addons.mozilla.org/en-US/firefox/addon/code-verify/) 

## Table of Contents
- [About](#about-code-verify)
- [Features](#features)
- [Installation](#installation-steps)
- [Contributions & Contributors](#contributing)
- [Code of Conduct & License](#code-of-conduct)

## About Code Verify
Do you find yourself having security concerns while using Meta web pages? Look no further than Code Verify, a browser extension that adds an extra layer of web security by validating the JavaScript code on WhatsApp, Instagram, Facebook, and Messenger clients you are being served. Code Verify immediately alerts users if their web version has been modified.  

The idea is you can publish what JavaScript should appear on your site into a "manifest". The manifest consists of the hashes of all the JavaScript files in a given release. This browser extension can consume the manifest and verify that *only* that code executes, or else display a warning to the user.

## Features
- **Ease of use:** Code Verify is applied directly in browser. It consistently checks for insecurities and modifications, and will only alert you if a problem arises with a popup.
- **Download source code directly:** If there is a problem with a web page you visit, you can download the source code directly through Code Verify to see what kind of modifications could have been made.
- **Automatic updates:** Code verify updates as the source code for its supported web pages do. For example, if WhatsApp recieves a new feature and its code is modified, users will not be alerted and Code Verify automatically accomodates for this.

## Installation Steps
- You can install Code Verify from the extension store of [Chrome](https://chrome.google.com/webstore/detail/code-verify/llohflklppcaghdpehpbklhlfebooeog), [Firefox](https://addons.mozilla.org/en-US/firefox/addon/code-verify/#:~:text=The%20new%20Code%20Verify%20is,inauthentic%20or%20has%20been%20modified.), or [Edge](https://microsoftedge.microsoft.com/addons/detail/code-verify/cpndjjealjjagamdecpipjfamiigaknk#:~:text=Code%20Verify%20will%20immediately%20alert,and%20hasn't%20been%20modified.). (Safari support coming soon)
- Once installed, navigate to your extensions manager and update your permissions according to what websites you wish to use Code Verify on.
- With Code Verify up and running, you can ensure that your browsing on WhatsApp, Instagram, Facebook, and Messenger are secure.

## Contributing
We are open to community solutions and updates. If you would like to contribute features, source code, or have any other issues to report, consult [CONTRIBUTING.md](CONTRIBUTING.md) and follow the guidelines posted. 

## Contributors
We very much appreciate the contributions made to Code Verify by the following individuals:

- [ezzak](https://github.com/ezzak)
- [rich-hansen](https://github.com/rich-hansen)
- [aselbie](https://github.com/aselbie)
- [KarimP](https://github.com/KarimP)
- [dneiter](https://github.com/dneiter)
- [m-lyons](https://github.com/m-lyons)

If at any point you would like to contribute, read [here](#contributing).

## Code of Conduct

Meta has adopted a [Code of Conduct](https://code.fb.com/codeofconduct) that we expect project participants to adhere to. Please read [the full text](https://code.fb.com/codeofconduct) so that you can understand what actions will and will not be tolerated.

## License

Code Verify is [MIT licensed](./LICENSE.md).
