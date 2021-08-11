chrome.runtime.onMessage.addListener(function(message, _sender, sendResponse) {
    // get message type
    console.log('do you even work bro?');
    console.log('I gots the message from detect', message);
    sendResponse({stuff:'oh, yeah! Hooray!'});
    // if (message.type == "LOAD_MANIFEST") {
    //     console.log('ha ha ha it works!');
    //     sendResponse({stuff:'oh, yeah! Hooray!'});
    //     // check manifest cache
    //     // on cache hit sendResponse
    //     // on cache miss load missing manifest
    //     // on load response, notify page same as for cache hit
    // } else {
    //     sendResponse({});
    // }

});
