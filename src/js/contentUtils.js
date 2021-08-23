const DOM_EVENTS = [
  "onabort",
  "onactivate",
  "onattribute",
  "onafterprint",
  "onafterscriptexecute",
  "onafterupdate",
  "onanimationend",
  "onanimationiteration",
  "onanimationstart",
  "onariarequest",
  "onautocomplete",
  "onautocompleteerror",
  "onbeforeactivate",
  "onbeforecopy",
  "onbeforecut",
  "onbeforedeactivate",
  "onbeforeeditfocus",
  "onbeforepaste",
  "onbeforeprint",
  "onbeforescriptexecute",
  "onbeforeunload",
  "onbeforeupdate",
  "onbegin",
  "onblur",
  "onbounce",
  "oncancel",
  "oncanplay",
  "oncanplaythrough",
  "oncellchange",
  "onchange",
  "onclick",
  "onclose",
  "oncommand",
  "oncompassneedscalibration",
  "oncontextmenu",
  "oncontrolselect",
  "oncopy",
  "oncuechange",
  "oncut",
  "ondataavailable",
  "ondatasetchanged",
  "ondatasetcomplete",
  "ondblclick",
  "ondeactivate",
  "ondevicelight",
  "ondevicemotion",
  "ondeviceorientation",
  "ondeviceproximity",
  "ondrag",
  "ondragdrop",
  "ondragend",
  "ondragenter",
  "ondragleave",
  "ondragover",
  "ondragstart",
  "ondrop",
  "ondurationchange",
  "onemptied",
  "onend",
  "onended",
  "onerror",
  "onerrorupdate",
  "onexit",
  "onfilterchange",
  "onfinish",
  "onfocus",
  "onfocusin",
  "onfocusout",
  "onformchange",
  "onforminput",
  "onfullscreenchange",
  "onfullscreenerror",
  "ongotpointercapture",
  "onhashchange",
  "onhelp",
  "oninput",
  "oninvalid",
  "onkeydown",
  "onkeypress",
  "onkeyup",
  "onlanguagechange",
  "onlayoutcomplete",
  "onload",
  "onloadeddata",
  "onloadedmetadata",
  "onloadstart",
  "onlosecapture",
  "onlostpointercapture",
  "onmediacomplete",
  "onmediaerror",
  "onmessage",
  "onmousedown",
  "onmouseenter",
  "onmouseleave",
  "onmousemove",
  "onmouseout",
  "onmouseover",
  "onmouseup",
  "onmousewheel",
  "onmove",
  "onmoveend",
  "onmovestart",
  "onmozfullscreenchange",
  "onmozfullscreenerror",
  "onmozpointerlockchange",
  "onmozpointerlockerror",
  "onmscontentzoom",
  "onmsfullscreenchange",
  "onmsfullscreenerror",
  "onmsgesturechange",
  "onmsgesturedoubletap",
  "onmsgestureend",
  "onmsgesturehold",
  "onmsgesturestart",
  "onmsgesturetap",
  "onmsgotpointercapture",
  "onmsinertiastart",
  "onmslostpointercapture",
  "onmsmanipulationstatechanged",
  "onmspointercancel",
  "onmspointerdown",
  "onmspointerenter",
  "onmspointerleave",
  "onmspointermove",
  "onmspointerout",
  "onmspointerover",
  "onmspointerup",
  "onmssitemodejumplistitemremoved",
  "onmsthumbnailclick",
  "onoffline",
  "ononline",
  "onoutofsync",
  "onpage",
  "onpagehide",
  "onpageshow",
  "onpaste",
  "onpause",
  "onplay",
  "onplaying",
  "onpointercancel",
  "onpointerdown",
  "onpointerenter",
  "onpointerleave",
  "onpointerlockchange",
  "onpointerlockerror",
  "onpointermove",
  "onpointerout",
  "onpointerover",
  "onpointerup",
  "onpopstate",
  "onprogress",
  "onpropertychange",
  "onratechange",
  "onreadystatechange",
  "onreceived",
  "onrepeat",
  "onreset",
  "onresize",
  "onresizeend",
  "onresizestart",
  "onresume",
  "onreverse",
  "onrowdelete",
  "onrowenter",
  "onrowexit",
  "onrowinserted",
  "onrowsdelete",
  "onrowsenter",
  "onrowsexit",
  "onrowsinserted",
  "onscroll",
  "onsearch",
  "onseek",
  "onseeked",
  "onseeking",
  "onselect",
  "onselectionchange",
  "onselectstart",
  "onstalled",
  "onstorage",
  "onstoragecommit",
  "onstart",
  "onstop",
  "onshow",
  "onsyncrestored",
  "onsubmit",
  "onsuspend",
  "onsynchrestored",
  "ontimeerror",
  "ontimeupdate",
  "ontrackchange",
  "ontransitionend",
  "ontoggle",
  "onunload",
  "onurlflip",
  "onuserproximity",
  "onvolumechange",
  "onwaiting",
  "onwebkitanimationend",
  "onwebkitanimationiteration",
  "onwebkitanimationstart",
  "onwebkitfullscreenchange",
  "onwebkitfullscreenerror",
  "onwebkittransitionend",
  "onwheel",
];

const foundScripts = [];

function storeFoundJS(scriptNodeMaybe) {
  // need to get the src of the JS
  if (scriptNodeMaybe.src != null && scriptNodeMaybe.src !== "") {
    foundScripts.push({
      type: MESSAGE_TYPE.JS_WITH_SRC,
      src: scriptNodeMaybe.src,
    });
  } else {
    // no src, access innerHTML for the code
    // const hashLookupKey = scriptNodeMaybe.attributes['data-binary-transparency-hash-key'];
    foundScripts.push({
      type: MESSAGE_TYPE.RAW_JS,
      rawjs: scriptNodeMaybe.innerHTML,
    });
  }
}

function hasInvalidAttributes(htmlElement) {
  if (
    typeof htmlElement.hasAttributes === "function" &&
    htmlElement.hasAttributes()
  ) {
    Array.from(htmlElement.attributes).forEach(elementAttribute => {
      // check first for violating attributes
      if (DOM_EVENTS.indexOf(elementAttribute.localName) >= 0) {
        // TODO: convert this to a failure case and show a BZZZZZZT to the user
        console.log(
          `processing violating attribute ${elementAttribute.localName} from element ${htmlElement.outerHTML}`
        );
      }
    });
  }
}

function hasInvalidScripts(scriptNodeMaybe) {
  // if not an HTMLElement ignore it!
  if (scriptNodeMaybe.nodeType !== 1) {
    return false;
  }

  hasInvalidAttributes(scriptNodeMaybe);

  if (scriptNodeMaybe.nodeName === "SCRIPT") {
    return storeFoundJS(scriptNodeMaybe);
  } else if (scriptNodeMaybe.childNodes.length > 0) {
    let invalidCount = 0;
    scriptNodeMaybe.childNodes.forEach(childNode => {
      // if not an HTMLElement ignore it!
      if (childNode.nodeType !== 1) {
        return;
      }

      hasInvalidAttributes(childNode);

      if (childNode.nodeName === "SCRIPT") {
        storeFoundJS(childNode);
        return;
      }

      const invalidChildScripts = Array.from(
        childNode.getElementsByTagName("script")
      ).forEach(childScript => {
        storeFoundJS(childScript);
      });
    });
  }

  return;
}

const scanForScripts = () => {
  console.log("proc scanForScripts is working really well!");

  const allElements = document.getElementsByTagName("*");

  Array.from(allElements).forEach(allElement => {
    hasInvalidAttributes(allElement);
    // next check for existing script elements and if they're violating
    if (allElement.nodeName === "SCRIPT") {
      console.log("processed all script elements are ", allElement);
      storeFoundJS(allElement);
    }
  });

  // track any new scripts that get loaded in
  const scriptMutationObserver = new MutationObserver(
    (mutationsList, _observer) => {
      mutationsList.forEach(mutation => {
        if (mutation.type === "childList") {
          Array.from(mutation.addedNodes).forEach(checkScript => {
            hasInvalidScripts(checkScript);
          });
        } else if (mutation.type === "attributes") {
          console.log(
            "processed mutation and invalid attribute added or changed ",
            mutation.target
          );
        }
      });
    }
  );

  scriptMutationObserver.observe(document.getElementsByTagName("html")[0], {
    attributeFilter: DOM_EVENTS,
    childList: true,
    subtree: true,
  });
};

const processFoundJS = (origin, version) => {
  // foundScripts
  const scripts = foundScripts.splice(0);
  console.log("proc scripts that were found", scripts.length);
  scripts.forEach(script => {
    if (script.src) {
      chrome.runtime.sendMessage(
        {
          type: script.type,
          src: script.src,
          origin: origin,
          version: version,
        },
        response => {
          console.log("processed the JS with SRC, response is ", response);
        }
      );
    } else {
      chrome.runtime.sendMessage(
        {
          type: script.type,
          rawjs: script.rawjs,
          origin: origin,
          version: version,
        },
        response => {
          console.log("processed the RAW_JS, response is ", response);
        }
      );
    }
  });
  window.setTimeout(() => processFoundJS(origin, version), 3000);
};
