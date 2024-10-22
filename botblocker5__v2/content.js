(function () {
  let blockedUsers = {};
  let hideOrBlur = 'hide'; // Default action is to hide tweets
  const loadDelay = 7000; // Delay of 7 seconds (adjust to 5-10 seconds as needed)
  const scrollDelay = 5000; // Delay of 5 seconds after scrolling

  function initializeBotBlocker() {
    if (window.botBlockerInitialized) {
      console.log("BotBlocker: Already initialized.");
      return;
    }

    window.botBlockerInitialized = true;
    console.log("BotBlocker: Content script started.");

    // Trigger the script after a delay when the page is fully loaded
    window.addEventListener('load', function () {
      setTimeout(() => {
        console.log(`BotBlocker: Running after ${loadDelay / 1000} seconds delay...`);
        observeTimeline();
        processTimelineFromDOM(); // Initial processing
      }, loadDelay);
    });

    // Add scroll event listener with a delay before processing tweets
    window.addEventListener('scroll', debounce(() => {
      setTimeout(() => {
        console.log(`BotBlocker: Running 5 seconds after scrolling...`);
        processTimelineFromDOM();
      }, scrollDelay);
    }, scrollDelay));
  }

  // Debounce to prevent excessive triggering during scroll
  function debounce(func, delay) {
    let timeout;
    return function () {
      clearTimeout(timeout);
      timeout = setTimeout(func, delay);
    };
  }

  // Mutation Observer to watch for new tweets being added to the timeline
  function observeTimeline() {
    const targetNode = document.querySelector('section[aria-labelledby="accessible-list-2"]'); // Adjust selector if needed
    if (!targetNode) {
      console.error("BotBlocker: Timeline section not found.");
      return;
    }

    const observerConfig = { childList: true, subtree: true };

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.addedNodes.length) {
          console.log("BotBlocker: New tweets detected in DOM...");
          setTimeout(() => processTimelineFromDOM(), scrollDelay); // Trigger processing with a delay
        }
      }
    });

    observer.observe(targetNode, observerConfig);
    console.log("BotBlocker: Mutation observer started.");
  }

  // Define the processTimelineFromDOM function to scan the DOM for tweets
  function processTimelineFromDOM() {
    console.log("BotBlocker: Scanning DOM for tweets...");
    const tweets = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
    console.log(`BotBlocker: ${tweets.length} tweets to process...`);

    tweets.forEach(tweet => {
      const usernameLink = tweet.querySelector('a[href*="/"]');
      if (usernameLink) {
        const username = usernameLink.getAttribute('href').split('/').pop();

        // Use the username to match API data instead of using the DOM for follower/following count
        const userData = getUserDataFromAPI(username);
        if (!userData) {
          console.error(`BotBlocker: No user data found for ${username}`);
          return;
        }

        const followersCount = userData.followersCount || 0;
        const followingCount = userData.followingCount || 0;

        // Log each user being processed from DOM
        console.log(`BotBlocker: Processing user ${username} from DOM - Followers: ${followersCount}, Following: ${followingCount}`);

        if (isBot(followersCount, followingCount)) {
          console.log(`BotBlocker: User ${username} flagged as a bot.`);
          hideOrBlurTweet(tweet);
          updateBlockedUsers(username);
        } else {
          console.log(`BotBlocker: User ${username} is not flagged as a bot.`);
        }
      }
    });
  }

  // Handle message from background.js for HomeLatestTimeline
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.message === "process_homelatest_timeline") {
      const url = request.url;
      const headers = request.headers;
      const payload = request.payload;

      console.log("BotBlocker: Received HomeLatestTimeline API data.");
      console.log("URL:", url);
      console.log("Headers:", headers);
      console.log("Payload:", payload);

      processTimelineFromAPI(payload);
    }

    if (request.message === "reprocess_tweets") {
      processTimelineFromDOM();
    }

    if (request.message === "update_settings") {
      hideOrBlur = request.hideOrBlur;
      console.log(`BotBlocker: Settings updated - Action: ${hideOrBlur}`);
    }
  });

  // Process timeline from API payload
  function processTimelineFromAPI(data) {
    console.log("BotBlocker: Processing HomeLatestTimeline API response...");
    const instructions = data?.data?.home?.home_timeline_urt?.instructions || [];

    if (instructions.length === 0) {
      console.warn("BotBlocker: No instructions found in the API response.");
      return;
    }

    console.log(`BotBlocker: ${instructions.length} instructions to process...`);

    instructions.forEach(instruction => {
      const entries = instruction?.entries || [];
      entries.forEach(entry => {
        const tweetResults = entry?.content?.itemContent?.tweet_results?.result?.core?.user_results?.result;
        if (tweetResults) {
          const username = tweetResults?.legacy?.screen_name;
          const followersCount = tweetResults?.legacy?.followers_count;
          const followingCount = tweetResults?.legacy?.friends_count;

          // Store user data to be retrieved when processing DOM
          storeUserData(username, followersCount, followingCount);

          // Log user data
          console.log(`BotBlocker: Processed user ${username} - Followers: ${followersCount}, Following: ${followingCount}`);
        } else {
          console.warn("BotBlocker: Tweet results not found for entry.");
        }
      });
    });
  }

  function isBot(followersCount, followingCount) {
    return followingCount > followersCount * 100;
  }

  function hideOrBlurTweet(tweetElement) {
    if (hideOrBlur === 'blur') {
      tweetElement.style.filter = 'blur(5px)';
    } else {
      tweetElement.style.display = 'none';
    }
  }

  // Store user data temporarily for quick lookup when processing DOM
  let userCache = {};

  function storeUserData(username, followersCount, followingCount) {
    if (followersCount === undefined || followingCount === undefined) {
      console.warn(`BotBlocker: Incomplete user data for ${username}. Skipping storage.`);
      return;
    }
    userCache[username] = { followersCount, followingCount };
  }

  function getUserDataFromAPI(username) {
    const userData = userCache[username];
    if (!userData) {
      console.error(`BotBlocker: No data found in userCache for ${username}`);
    }
    return userData;
  }

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

  initializeBotBlocker();
})();
