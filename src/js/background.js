const manifestCache = new Map();

chrome.runtime.onMessage.addListener(function(message, _sender, sendResponse) {
    // get message type
    console.log('I got the message from detect', message);

    if (message.type == MESSAGE_TYPE.LOAD_MANIFEST) {
        // check manifest cache
        let origin = manifestCache.get(message.origin);
        if (origin) {
            const manifest = origin.get(message.version);
            if (manifest) {
                // on cache hit sendResponse
                sendResponse({valid: true});
                return;
            }
        }
        // populate origin if not there
        if (origin == null) {
            origin = new Map();
            manifestCache.set(message.origin, origin);
        }

        // on cache miss load missing manifest
        const endpoint = ORIGIN_ENDPOINT[message.origin] + '/' + message.version;
        fetch(endpoint, {METHOD: 'GET'}).then(response => response.json()).then( json => {
            origin.set(message.version, json[message.version]);
            sendResponse({valid: true});
        });
        return true;
    }
    sendResponse({stuff:'BZZZZZT! WRONG ANSWER!!!!'});
});
