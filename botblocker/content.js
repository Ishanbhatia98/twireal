(function() {
  if (window.botBlockerInitialized) {
    console.log('BotBlocker: Already initialized, skipping');
    return;
  }
  window.botBlockerInitialized = true;

  console.log('BotBlocker: Content script started');

  const processedUsers = new Set();
  let hiddenPostsCount = 0;
  const blockedUsers = new Set();

  function isLikelyBot(userStats) {
    console.log('BotBlocker: Checking if user is a bot', userStats);
    return true; // Temporarily return true for all users
  }

  function extractUserStats(tweet) {
    console.log('BotBlocker: Extracting user stats from tweet', tweet);
    const statsElement = tweet.querySelector('[data-testid="UserCell-number"]');
    if (!statsElement) {
      console.log('BotBlocker: Could not find UserCell-number element');
      return null;
    }

    const statsText = statsElement.textContent;
    console.log('BotBlocker: Found stats text:', statsText);
    const [followers, following] = statsText.split(' · ').map(num => parseInt(num.replace(/[^0-9]/g, ''), 10));

    return { followers, following };
  }

  function processTweet(tweet) {
    console.log('BotBlocker: Processing tweet', tweet);
    
    // Try different selectors to find the username
    const userElement = tweet.querySelector('div[data-testid="User-Name"] a[role="link"][href^="/"]') || 
                        tweet.querySelector('a[role="link"][href^="/"]');
    
    if (!userElement) {
      console.log('BotBlocker: Could not find user element in tweet');
      return;
    }

    const username = userElement.textContent.trim().split('@')[1] || userElement.textContent.trim();
    console.log('BotBlocker: Found username:', username);
    
    if (!username) {
      console.log('BotBlocker: Username is empty, skipping');
      return;
    }

    if (processedUsers.has(username)) {
      console.log('BotBlocker: User already processed, skipping');
      return;
    }

    processedUsers.add(username);

    const userStats = extractUserStats(tweet) || { followers: 0, following: 0 };
    console.log('BotBlocker: User stats:', userStats);

    const isBot = isLikelyBot(userStats);
    console.log(`BotBlocker: Evaluated user: ${username} - Bot: ${isBot ? 'Yes' : 'No'} (Followers: ${userStats.followers}, Following: ${userStats.following})`);

    if (isBot) {
      console.log(`BotBlocker: Attempting to hide tweet from bot: ${username}`);
      tweet.style.display = 'none';
      hiddenPostsCount++;
      blockedUsers.add(username);
      console.log(`BotBlocker: Tweet hidden. New hidden count: ${hiddenPostsCount}`);
    }
  }

  function processTweets() {
    const tweets = document.querySelectorAll('[data-testid="cellInnerDiv"]');
    console.log(`BotBlocker: Found ${tweets.length} tweets to process`);
    tweets.forEach((tweet, index) => {
      console.log(`BotBlocker: Processing tweet ${index + 1} of ${tweets.length}`);
      processTweet(tweet);
    });
  }

  function logBlockedStatus() {
    console.log(`BotBlocker: Currently hidden ${hiddenPostsCount} posts/comments`);
    console.log(`BotBlocker: Blocked users: ${Array.from(blockedUsers).join(', ')}`);
  }

  // Call processTweets initially
  console.log('BotBlocker: Performing initial tweet processing');
  processTweets();
  logBlockedStatus();

  // Set up scroll listener
  window.addEventListener('scroll', () => {
    console.log('BotBlocker: Scroll detected, processing tweets');
    processTweets();
    logBlockedStatus();
  });

  // Set up MutationObserver
  const observer = new MutationObserver((mutations) => {
    console.log('BotBlocker: DOM mutation detected, processing tweets');
    processTweets();
    logBlockedStatus();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  console.log('BotBlocker: Content script fully initialized');
})();