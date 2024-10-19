(function () {
  if (window.botBlockerInitialized) {
    console.log('BotBlocker: Already initialized, skipping');
    return;
  }
  window.botBlockerInitialized = true;

  console.log('BotBlocker: Content script started');

  const processedUsers = new Set();
  let hiddenPostsCount = 0;
  const blockedUsers = new Set();

  // Load existing blocked users and hidden post counts
  chrome.storage.local.get(['blockedUsers', 'hiddenPostsCount'], (data) => {
    const { blockedUsers: storedBlockedUsers = [], hiddenPostsCount: storedHiddenPostsCount = 0 } = data;
    storedBlockedUsers.forEach(user => blockedUsers.add(user));
    hiddenPostsCount = storedHiddenPostsCount;
    console.log(`BotBlocker: Loaded ${blockedUsers.size} blocked users and ${hiddenPostsCount} hidden posts.`);
  });

  // Function to check if a user is a potential bot based on followers/following ratio
  function isLikelyBot(userStats) {
    console.log('BotBlocker: Checking if user is a bot', userStats);
    // return true;
    return userStats.followers < userStats.following;
  }

  // Extract user stats from the HTML elements
  function extractUserStats(element) {
    console.log('BotBlocker: Extracting user stats from element', element);
    const statsElement = element.querySelector('[data-testid="UserCell-number"]');
    if (!statsElement) {
      console.log('BotBlocker: Could not find UserCell-number element');
      return null;
    }

    const statsText = statsElement.textContent;
    const [followers, following] = statsText.split(' · ').map(num => parseInt(num.replace(/[^0-9]/g, ''), 10));
    
    return { followers, following };
  }

  // Hide the element containing the bot content
  function hideElement(element, username) {
    element.style.display = 'none';
    hiddenPostsCount++;
    console.log(`BotBlocker: Content from ${username} hidden. Total hidden: ${hiddenPostsCount}`);
  }

  // Process each element (post/comment) and check if the user is a bot
  function processElement(element) {
    const userElement = element.querySelector('div[data-testid="User-Name"] a[role="link"][href^="/"]') || 
                        element.querySelector('a[role="link"][href^="/"]');

    if (!userElement) {
      console.log('BotBlocker: Could not find user element');
      return;
    }

    const hrefAttr = userElement.getAttribute('href');
    const username = hrefAttr ? hrefAttr.split('/')[1] : null;

    if (!username || processedUsers.has(username)) {
      console.log('BotBlocker: Username already processed or is empty, skipping');
      return;
    }

    processedUsers.add(username);

    const userStats = extractUserStats(element) || { followers: 0, following: 0 };
    const isBot = isLikelyBot(userStats);

    if (isBot) {
      blockedUsers.add(username);
      hideElement(element, username);
    }
  }

  // Process all posts and comments on the page
  function processContent() {
    const posts = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
    posts.forEach(post => processElement(post));

    const comments = document.querySelectorAll('div[data-testid="tweet"]');
    comments.forEach(comment => processElement(comment));

    hideBlockedUsersContent();
  }

  // Hide content from blocked users
  function hideBlockedUsersContent() {
    const elements = document.querySelectorAll('div[data-testid="cellInnerDiv"], div[data-testid="tweet"]');
    elements.forEach(element => {
      const userLink = element.querySelector('div[data-testid="User-Name"] a[role="link"][href^="/"]') ||
                       element.querySelector('a[role="link"][href^="/"]');
      if (userLink) {
        const hrefAttr = userLink.getAttribute('href');
        const username = hrefAttr ? hrefAttr.split('/')[1] : null;
        if (username && blockedUsers.has(username)) {
          hideElement(element, username);
        }
      }
    });
  }

  // Throttle storage updates to avoid frequent calls
  let storageUpdatePending = false;
  function updateStorage() {
    if (!storageUpdatePending) {
      storageUpdatePending = true;
      setTimeout(() => {
        chrome.storage.local.set({
          blockedUsers: Array.from(blockedUsers),
          hiddenPostsCount: hiddenPostsCount
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('BotBlocker: Error updating storage:', chrome.runtime.lastError.message);
          } else {
            console.log('BotBlocker: Storage updated successfully');
          }
          storageUpdatePending = false;  // Reset throttle flag
        });
      }, 3000); // Throttle updates to every 3 seconds max
    }
  }

  // Process initial content on page load
  processContent();
  updateStorage();

  // Set up observer to watch for new content (e.g., infinite scrolling)
  const observer = new MutationObserver(() => {
    processContent();
    updateStorage();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  console.log('BotBlocker: Content script fully initialized');
})();
