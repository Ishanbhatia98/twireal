(function () {
  function initializeBotBlocker() {
    if (window.botBlockerInitialized) {
      console.log('BotBlocker: Already initialized.');
      return;
    }

    window.botBlockerInitialized = true;
    console.log('BotBlocker: Content script started.');

    let blockedUsers = {}; // Keeps track of blocked users and tweet count

    function updateBlockedUsers(username) {
      if (blockedUsers[username]) {
        blockedUsers[username].tweetsBlocked++;
      } else {
        blockedUsers[username] = { tweetsBlocked: 1 };
      }
      chrome.storage.local.set({ blockedUsers: blockedUsers });
      updatePopup();
    }

    // Update the popup display with the latest blocked users
    function updatePopup() {
      chrome.runtime.sendMessage({ message: "update_popup", blockedUsers: blockedUsers });
    }

    // Function to process the API response from Twitter and detect bots
    function processTimelineResponse(data) {
      console.log('BotBlocker: Start processing API response...');
      const entries = data?.data?.home?.timeline?.instructions?.[0]?.entries || [];

      entries.forEach(entry => {
        const tweetResults = entry?.content?.itemContent?.tweet_results?.result?.core?.user_results?.result;
        if (tweetResults) {
          const username = tweetResults?.legacy?.screen_name;
          const followersCount = tweetResults?.legacy?.followers_count;
          const followingCount = tweetResults?.legacy?.friends_count;

          if (followersCount !== undefined && followingCount !== undefined) {
            console.log(`BotBlocker: User: ${username}, Followers: ${followersCount}, Following: ${followingCount}`);
            processUserContent(username, followersCount, followingCount);
          }
        }
      });
    }

    // Function to process and hide bot user posts
    function processUserContent(username, followers, following) {
      if (following > followers * 100) {
        console.log(`BotBlocker: User ${username} is identified as a bot`);
        hideUserPosts(username);
        updateBlockedUsers(username);
      }
    }

    // Hide the posts from a detected bot user
    function hideUserPosts(username) {
      console.log(`BotBlocker: Hiding posts from user ${username}`);
      const posts = document.querySelectorAll(`a[href*="/${username}"]`);
      posts.forEach(post => {
        const tweet = post.closest('div[data-testid="cellInnerDiv"]');
        if (tweet) {
          tweet.style.display = 'none';
          console.log(`BotBlocker: Tweet from ${username} hidden.`);
        }
      });
    }

    // Re-evaluate all tweets on the page
    function reprocessTweets() {
      console.log('BotBlocker: Reprocessing all tweets on the page...');
      const tweets = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
      console.log(`BotBlocker: Found ${tweets.length} tweets for reprocessing.`);
      
      // Simulate a re-evaluation logic (replace this with actual bot detection if needed)
      tweets.forEach(tweet => {
        const userLink = tweet.querySelector('a[href]');
        if (userLink) {
          const username = userLink.href.split('/').pop();
          console.log(`BotBlocker: Reprocessing tweet from user: ${username}`);
          // You can apply your bot detection logic here, or just log
          hideUserPosts(username);
        }
      });
    }

    // Listen for messages from background.js or popup.js
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      if (request.message === "process_timeline") {
        console.log("BotBlocker: Message received from background.js to process timeline.");
        processTimelineResponse(request.data);
      }
      if (request.message === "reprocess_tweets") {
        console.log("BotBlocker: Message received to reprocess all tweets.");
        reprocessTweets(); // Re-evaluate tweets when BotBlocker is turned on
      }
    });
  }

  // Watch for page navigation events and reinitialize the content script if necessary
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) =>
