chrome.runtime.onMessage.addListener(function(message, _sender, sendResponse) {
    // get message type
    console.log('I gots the message from detect', message);

    if (message.type == "LOAD_MANIFEST") {
        console.log('ha ha ha it works!');
        sendResponse({stuff:'version is '+message.version});
        // check manifest cache
        // on cache hit sendResponse
        // on cache miss load missing manifest
        // on load response, notify page same as for cache hit
    } else {
        sendResponse({stuff:'BZZZZZT! WRONG ANSWER!!!!'});
    }

});
