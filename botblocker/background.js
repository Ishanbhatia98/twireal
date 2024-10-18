console.log('BotBlocker: Background script started');

function injectContentScript(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js']
  }, (results) => {
    if (chrome.runtime.lastError) {
      console.error('BotBlocker: Error injecting content script:', chrome.runtime.lastError.message);
    } else {
      console.log('BotBlocker: Content script injected successfully');
    }
  });
}

chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.includes('x.com')) {
    injectContentScript(tab.id);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('x.com')) {
    console.log(`BotBlocker: X.com tab updated (ID: ${tabId})`);
    injectContentScript(tabId);
  }
});

console.log('BotBlocker: Background script loaded');