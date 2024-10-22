chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    const requestHeaders = details.requestHeaders;
    console.log("BotBlocker: Intercepted Request Headers:", requestHeaders);

    chrome.storage.local.set({ capturedHeaders: requestHeaders });
    return { requestHeaders };
  },
  { urls: ["*://*.x.com/*"] }, 
  ["requestHeaders", "blocking"]
);

chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    if (details.method === "POST" && details.url.includes("HomeLatestTimeline")) {
      console.log("BotBlocker: Intercepted HomeLatestTimeline POST request.");

      const requestBody = details.requestBody?.raw ? decodeRequestBody(details.requestBody.raw) : null;

      chrome.storage.local.get("capturedHeaders", function (data) {
        const headers = data.capturedHeaders || [];

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
              message: "process_homelatest_timeline",
              url: details.url,
              headers: headers,
              payload: requestBody,
            });
          }
        });
      });
    }
  },
  { urls: ["*://*.x.com/*"] }, 
  ["requestBody"]
);

function decodeRequestBody(rawData) {
  const decoder = new TextDecoder('utf-8');
  const decodedBody = decoder.decode(rawData[0].bytes);
  try {
    return JSON.parse(decodedBody); 
  } catch (e) {
    console.error("BotBlocker: Error decoding request body", e);
    return decodedBody;
  }
}
