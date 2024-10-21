console.log('BotBlocker: Background script loaded.');

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  const target = { tabId: tab.id };

  chrome.debugger.attach(target, '1.3', () => {
    if (chrome.runtime.lastError) {
      console.error('BotBlocker: Error attaching debugger', chrome.runtime.lastError);
      return;
    }

    console.log('BotBlocker: Debugger attached to tab:', tab.id);

    // Enable network monitoring via the DevTools Protocol
    chrome.debugger.sendCommand(target, 'Network.enable', {}, (result) => {
      if (chrome.runtime.lastError) {
        console.error('BotBlocker: Error enabling network monitoring', chrome.runtime.lastError);
        return;
      }
      console.log('BotBlocker: Network monitoring enabled.');
    });

    // Listen for network events
    chrome.debugger.onEvent.addListener((debugTarget, method, params) => {
      if (method === 'Network.responseReceived') {
        const { response } = params;
        if (response.url.includes('HomeLatestTimeline')) {
          console.log('BotBlocker: Intercepted HomeLatestTimeline API response:', response);

          // Get the response body
          chrome.debugger.sendCommand(
            debugTarget,
            'Network.getResponseBody',
            { requestId: params.requestId },
            (body) => {
              if (body && body.body) {
                console.log('BotBlocker: Response body:', body);

                // Send the API data to the content script
                chrome.tabs.sendMessage(tab.id, { apiData: body }, (response) => {
                  console.log('BotBlocker: Data sent to content script');
                });
              }
            }
          );
        }
      }
    });
  });
});
