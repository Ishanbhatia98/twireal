// Function to hide a tweet
function hideTweet(tweetElement) {
    tweetElement.style.display = 'none';
  }
  
  // Function to check if a tweet should be hidden
  function shouldHideTweet(tweetElement) {
    const screenName = tweetElement.querySelector('a[role="link"][href^="/"]')?.textContent.replace('@', '');
    
    // Get the list of blocked accounts from Chrome storage
    chrome.storage.local.get(['blockedAccounts'], function(result) {
      const blockedAccounts = result.blockedAccounts || [];
      if (blockedAccounts.includes(screenName)) {
        hideTweet(tweetElement);
      }
    });
  }
  
  // Observe the timeline for new tweets
  const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      for (let node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the added node is a tweet
          if (node.querySelector('[data-testid="tweet"]')) {
            shouldHideTweet(node);
          }
        }
      }
    }
  });
  
  // Start observing the timeline
  const timeline = document.querySelector('[data-testid="primaryColumn"]');
  if (timeline) {
    observer.observe(timeline, { childList: true, subtree: true });
  }