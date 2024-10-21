chrome.webRequest.onCompleted.addListener(
  function (details) {
    if (details.url.includes("HomeLatestTimeline")) {
      console.log("BotBlocker: Intercepted HomeTimeline API request.");

      // Send the intercepted URL to the content script (no need to use headers)
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, {
            message: "process_timeline",
            url: details.url,
          });
          console.log("BotBlocker: Sent HomeTimeline URL to content script.");
        }
      });
    }
  },
  { urls: ["*://*.x.com/*"] },
  ["responseHeaders"]  // Use responseHeaders or extraHeaders if you need extra permissions
);
