// background.js
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.set({enabled: true, hideMode: 'blur'}, function() {
        console.log("BotBlocker installed with default settings");
    });
});

// This background script can be expanded in the future to handle more complex tasks,
// such as updating the bot detection algorithm or managing data that needs to persist
// across browser sessions.