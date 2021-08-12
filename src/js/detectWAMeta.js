(
() => {
    // extract JS version from the page
    const metaElements = document.getElementsByName('binary-transparency-manifest-key');
    // send message to Service Worker to download the correct manifest
    console.log('sending message to worker', metaElements[0].content);
    chrome.runtime.sendMessage({type: MESSAGE_TYPE.LOAD_MANIFEST, origin:"WHATSAPP", version: metaElements[0].content}, (response) => {
        console.log('response is ', response);
        scanForScripts();
    });
    console.log('after message');
    // call scanForScripts to scan the page for JS, then pipe it to Service Worker to hash and compare?
}
)();
