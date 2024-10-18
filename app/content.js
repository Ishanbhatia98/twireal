// Function to hide a tweet
function hideTweet(tweetElement) {
    tweetElement.style.display = 'none';
}

// Function to check if a tweet should be hidden
function shouldHideTweet(tweetElement) {
    const screenName = tweetElement.querySelector('a[role="link"][href^="/"]')?.textContent.replace('@', '');
    
    if (screenName) {
        chrome.storage.sync.get(['hiddenAccounts'], function(result) {
            const hiddenAccounts = result.hiddenAccounts || [];
            if (hiddenAccounts.includes(screenName.toLowerCase())) {
                hideTweet(tweetElement);
            }
        });
    }
}

// Function to process tweets
function processTweets() {
    const tweets = document.querySelectorAll('[data-testid="tweet"]:not([data-processed])');
    tweets.forEach(tweet => {
        shouldHideTweet(tweet);
        tweet.setAttribute('data-processed', 'true');
    });
}

// Observe the timeline for new tweets
const observer = new MutationObserver((mutations) => {
    processTweets();
});

// Start observing the timeline
function startObserving() {
    const timeline = document.querySelector('[data-testid="primaryColumn"]');
    if (timeline) {
        observer.observe(timeline, { childList: true, subtree: true });
        processTweets(); // Process existing tweets
    } else {
        setTimeout(startObserving, 1000); // Retry after 1 second if timeline is not found
    }
}

startObserving();

// Listen for changes in hidden accounts
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync' && changes.hiddenAccounts) {
        processTweets(); // Reprocess tweets when the list of hidden accounts changes
    }
});