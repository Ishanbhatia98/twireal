chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.get(['hiddenAccounts'], function(result) {
        if (!result.hiddenAccounts) {
            chrome.storage.sync.set({hiddenAccounts: []});
        }
    });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('https://twitter.com') || tab.url.startsWith('https://x.com'))) {
        chrome.tabs.sendMessage(tabId, {action: "processPage"});
    }
});