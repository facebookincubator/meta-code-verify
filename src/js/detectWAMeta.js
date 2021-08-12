(
() => {
    // extract JS version from the page
    const metaElements = document.getElementsByName('binary-transparency-manifest-key');
    // send message to Service Worker to download the correct manifest
    chrome.runtime.sendMessage({type: MESSAGE_TYPE.LOAD_MANIFEST, origin:ORIGIN_TYPE.WHATSAPP, version: metaElements[0].content}, (response) => {
        console.log('response is ', response);
        scanForScripts();
    });
    console.log('after message');
    // call scanForScripts to scan the page for JS, then pipe it to Service Worker to hash and compare?
}
)();
