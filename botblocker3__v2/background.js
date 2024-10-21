// Ensure the extension is installed properly
chrome.runtime.onInstalled.addListener(function() {
  console.log('BotBlocker: Extension Installed');
});

// Listen for API requests to Twitter's HomeLatestTimeline
chrome.webRequest.onCompleted.addListener(
  function(details) {
    if (details.url.includes("HomeLatestTimeline")) {
      console.log("BotBlocker: Intercepted HomeLatestTimeline API request.");

      // Fetch the response body
      chrome.webRequest.getResponseBody(details.requestId, function(body) {
        try {
          const jsonData = JSON.parse(body);
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length > 0) {
              chrome.tabs.sendMessage(tabs[0].id, { message: "process_timeline", data: jsonData });
            }
          });
        } catch (e) {
          console.error("BotBlocker: Error parsing API response", e);
        }
      });
    }
  },
  { urls: ["*://*.x.com/*"] }
);

console.log("BotBlocker: background.js loaded and initialized.");
