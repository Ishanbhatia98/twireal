chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    // Capture the request headers (including cookies)
    const requestHeaders = details.requestHeaders;
    console.log("BotBlocker: Intercepted Request Headers:", requestHeaders);

    // Store captured headers in chrome storage
    chrome.storage.local.set({ capturedHeaders: requestHeaders });

    // Return the request headers (you can modify if needed)
    return { requestHeaders };
  },
  { urls: ["*://*.x.com/*"] }, // Filter to capture headers from x.com (formerly Twitter)
  ["requestHeaders", "blocking"] // Ensure you capture the headers and can block if needed
);

// Listen to completed requests for TweetDetail and send the URL to content script
chrome.webRequest.onCompleted.addListener(
  function (details) {
    if (details.url.includes("TweetDetail")) {
      console.log("BotBlocker: Intercepted TweetDetail API request.");

      // Query the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0) {
          // Send the intercepted URL to the content script
          chrome.tabs.sendMessage(tabs[0].id, {
            message: "process_timeline",
            url: details.url,
          });
          console.log("BotBlocker: Sent TweetDetail URL to content script.");
        }
      });
    }
  },
  { urls: ["*://*.x.com/*"] }, // Filter for the same domain
  ["responseHeaders"]  // Capture response headers if needed (you can use this if the response matters)
);
