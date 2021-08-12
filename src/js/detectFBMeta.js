(
() => {
    // extract JS version from the page
    // setup listener to listen for Service Worker to tell us it has the manifest
    // send message to Service Worker to download the correct manifest
    console.log('sending message to worker');
    chrome.runtime.sendMessage({type: MESSAGE_TYPE.LOAD_MANIFEST, origin:ORIGIN_TYPE.FACEBOOK, version: 1}, (response) => {
        console.log('response is ', response);
        scanForScripts();
    });
    console.log('after message');
    // call scanForScripts to scan the page for JS, then pipe it to Service Worker to hash and compare?
}
)();
