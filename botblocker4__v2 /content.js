(function () {
  function initializeBotBlocker() {
    if (window.botBlockerInitialized) {
      console.log("BotBlocker: Already initialized.");
      return;
    }

    window.botBlockerInitialized = true;
    console.log("BotBlocker: Content script started.");

    let blockedUsers = {};
    let botBlockerEnabled = true;
    let hideOrBlur = 'hide'; // Default action is to hide tweets

    // Function to make the HomeTimeline API call and process the response
    function fetchAndProcessTimeline(url) {
      fetch(url, { 
        method: 'GET',
        credentials: 'include'  // Ensures the API call has the proper credentials (cookies, etc.)
      })
      .then(response => response.json())
      .then(data => processTimelineResponse(data))
      .catch(error => console.error("BotBlocker: Error fetching timeline data", error));
    }

    // Process the API response to extract user information and detect bots
    function processTimelineResponse(data) {
      console.log("BotBlocker: Processing HomeTimeline API response...");
      const instructions = data?.data?.home?.home_timeline_urt?.instructions || [];

      instructions.forEach(instruction => {
        const entries = instruction?.entries || [];
        entries.forEach(entry => {
          const tweetResults = entry?.content?.itemContent?.tweet_results?.result?.core?.user_results?.result;
          if (tweetResults) {
            const username = tweetResults?.legacy?.screen_name;
            const followersCount = tweetResults?.legacy?.followers_count;
            const followingCount = tweetResults?.legacy?.friends_count;

            // Simple bot detection logic: following > 100x followers
            if (followingCount > followersCount * 100) {
              console.log(`BotBlocker: User ${username} flagged as a bot.`);
              const tweetElement = document.querySelector(`a[href*="/${username}"]`)?.closest('div[data-testid="tweet"]');
              if (tweetElement) {
                hideOrBlurTweet(tweetElement);
                updateBlockedUsers(username);
              }
            }
          }
        });
      });
    }

    // Function to either hide or blur tweets based on user preferences
    function hideOrBlurTweet(tweetElement) {
      if (hideOrBlur === 'blur') {
        tweetElement.style.filter = 'blur(5px)';
      } else {
        tweetElement.style.display = 'none';
      }
    }

    // Update blocked users and notify the popup
    function updateBlockedUsers(username) {
      if (blockedUsers[username]) {
        blockedUsers[username].tweetsBlocked++;
      } else {
        blockedUsers[username] = { tweetsBlocked: 1 };
      }
      chrome.storage.local.set({ blockedUsers: blockedUsers });
      updatePopup();
    }

    function updatePopup() {
      chrome.runtime.sendMessage({ message: "update_popup", blockedUsers: blockedUsers });
    }

    // Listen for messages from the background script or popup
    chrome.runtime.onMessage.addListener(function (request) {
      if (request.message === "process_timeline" && request.url) {
        console.log("BotBlocker: HomeTimeline URL received, making API call.");
        fetchAndProcessTimeline(request.url);  // Call the API using the provided URL
      }

      if (request.message === "reprocess_tweets") {
        console.log("BotBlocker: Reprocessing tweets after user interaction.");
        processTimelineFromDOM();  // Re-evaluate tweets when requested
      }

      // Update settings from the popup (enable/disable BotBlocker, hide/blur preference)
      if (request.message === "update_settings") {
        botBlockerEnabled = request.botBlockerEnabled;
        hideOrBlur = request.hideOrBlur;
        console.log(`BotBlocker: Settings updated - Enabled: ${botBlockerEnabled}, Action: ${hideOrBlur}`);
      }
    });
  }

  initializeBotBlocker();  // Start BotBlocker
})();
