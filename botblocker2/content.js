// content.js
let isEnabled = true;
let hideMode = 'blur'; // 'hide' or 'blur'
let whitelist = new Set();
let blockedCount = 0;
let blockedAccounts = {};

function isBotAccount(accountInfo) {
    const followersCount = accountInfo.followersCount;
    const followingCount = accountInfo.followingCount;
    
    // Simple bot detection: following count is 100 times more than followers count
    return followingCount > followersCount * 100;
}

function getAccountInfo(tweetElement) {
    // This function would need to be adapted based on Twitter's actual DOM structure
    const followersElement = tweetElement.querySelector('.followers-count');
    const followingElement = tweetElement.querySelector('.following-count');
    
    return {
        username: tweetElement.querySelector('.username').textContent,
        followersCount: parseInt(followersElement.textContent.replace(',', '')),
        followingCount: parseInt(followingElement.textContent.replace(',', ''))
    };
}

function handleTweet(tweetElement) {
    const accountInfo = getAccountInfo(tweetElement);
    
    if (whitelist.has(accountInfo.username)) return;
    
    if (isBotAccount(accountInfo)) {
        blockedCount++;
        if (blockedAccounts[accountInfo.username]) {
            blockedAccounts[accountInfo.username]++;
        } else {
            blockedAccounts[accountInfo.username] = 1;
        }
        
        if (hideMode === 'hide') {
            tweetElement.style.display = 'none';
        } else {
            tweetElement.classList.add('botblocker-blur');
        }
        
        // Add a small animation
        tweetElement.classList.add('botblocker-removed');
        setTimeout(() => tweetElement.classList.remove('botblocker-removed'), 500);
        
        // Update popup with new data
        chrome.runtime.sendMessage({
            action: 'updateStats',
            blockedCount: blockedCount,
            blockedAccounts: blockedAccounts
        });
    }
}

// Observer to watch for new tweets being added to the feed
const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
        for (let node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && node.matches('.tweet')) {
                handleTweet(node);
            }
        }
    }
});

// Start observing the document with the configured parameters
observer.observe(document.body, { childList: true, subtree: true });

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleEnabled') {
        isEnabled = request.enabled;
    } else if (request.action === 'setHideMode') {
        hideMode = request.mode;
    } else if (request.action === 'addToWhitelist') {
        whitelist.add(request.username);
    } else if (request.action === 'removeFromWhitelist') {
        whitelist.delete(request.username);
    }
});