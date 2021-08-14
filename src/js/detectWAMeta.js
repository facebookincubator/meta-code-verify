(
() => {
    // extract JS version from the page
    const version = document.getElementsByName('binary-transparency-manifest-key')[0].content;
    // send message to Service Worker to download the correct manifest
    chrome.runtime.sendMessage({type: MESSAGE_TYPE.LOAD_MANIFEST, origin:ORIGIN_TYPE.WHATSAPP, version: version}, (response) => {
        console.log('manifest load response is ', response);
        if (response.valid) {
            // call scanForScripts to scan the page for JS, then pipe it to backgroud to hash and compare?
            console.log('calling scan for scripts');
            scanForScripts(ORIGIN_TYPE.WHATSAPP, version);
        }
    });
}
)();
