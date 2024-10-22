(function () {
  let blockedUsers = {};
  let hideOrBlur = 'hide'; // Default action is to hide tweets
  let apiDataProcessed = false; // Flag to track if API data has been processed
  let apiCallMade = false; // Flag to track if API call has been made (updated to prevent multiple requests)
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
        processTimelineFromDOM(); // Initial DOM processing
      }, loadDelay);
    });

    // Add scroll event listener with a delay before processing tweets
    window.addEventListener('scroll', debounce(() => {
      if (apiDataProcessed) { // Only process DOM if API data has been fetched
        setTimeout(() => {
          console.log(`BotBlocker: Running 5 seconds after scrolling...`);
          processTimelineFromDOM();
        }, scrollDelay);
      } else {
        console.warn("BotBlocker: Skipping tweet processing since API data hasn't been processed yet.");
      }
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

  // Process the HomeLatestTimeline API payload
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.message === "process_homelatest_timeline") {
      if (apiCallMade) {
        console.log("BotBlocker: API call already made, skipping.");
        return; // Prevent multiple API calls
      }

      apiCallMade = true; // Set flag as soon as API request starts

      const url = request.url;
      const headers = request.headers;
      const payload = request.payload;

      console.log("BotBlocker: Received HomeLatestTimeline API data.");
      console.log("BotBlocker: URL:", url);
      console.log("BotBlocker: Headers:", headers);
      console.log("BotBlocker: Payload:", payload);

      fetchHomeLatestTimeline(url, headers, payload);
    }

    if (request.message === "reprocess_tweets") {
      if (apiDataProcessed) {
        processTimelineFromDOM();
      } else {
        console.warn("BotBlocker: Cannot reprocess tweets without API data.");
      }
    }

    if (request.message === "update_settings") {
      hideOrBlur = request.hideOrBlur;
      console.log(`BotBlocker: Settings updated - Action: ${hideOrBlur}`);
    }
  });

  // Function to make the API call to HomeLatestTimeline and process the response
  function fetchHomeLatestTimeline(url, headers, payload) {
    const fetchHeaders = new Headers();
    headers.forEach(header => {
      fetchHeaders.append(header.name, header.value);
    });

    // Make the API call
    fetch(url, {
      method: 'POST',
      credentials: 'include', // Include credentials like cookies
      headers: fetchHeaders,
      body: JSON.stringify(payload) // Sending the payload in the body
    })
      .then(response => {
        if (!response.ok) {
          apiCallMade = false; // Reset flag if there was an error to allow retries
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json(); // Parse the JSON response
      })
      .then(data => {
        console.log("BotBlocker: Successfully fetched HomeLatestTimeline API response:", data);
        processTimelineFromAPI(data); // Pass the response data to be processed
      })
      .catch(error => {
        console.error("BotBlocker: Error fetching HomeLatestTimeline API data:", error);
      });
  }

  // Process the API response to cache user data
  function processTimelineFromAPI(data) {
    const instructions = data?.data?.home?.home_timeline_urt?.instructions || [];

    if (instructions.length === 0) {
      console.warn("BotBlocker: No instructions found in the API response.");
      return;
    }

    console.log(`BotBlocker: ${instructions.length} instructions to process...`);

    instructions.forEach(instruction => {
      const entries = instruction?.entries || [];
      console.log(`BotBlocker: ${entries.length} entries to process in the HomeTimeline API...`);
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

    apiDataProcessed = true; // Mark API data as processed
  }

  // Define the processTimelineFromDOM function to scan the DOM for tweets
  function processTimelineFromDOM() {
    if (!apiDataProcessed) {
      console.warn("BotBlocker: Skipping tweet processing since API data hasn't been processed yet.");
      return;
    }

    console.log("BotBlocker: Scanning DOM for tweets...");
    const tweets = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
    console.log(`BotBlocker: Found ${tweets.length} tweets in the DOM.`);

    tweets.forEach(tweet => {
      const usernameLink = tweet.querySelector('a[href*="/"]');
      if (usernameLink) {
        const username = usernameLink.getAttribute('href').split('/').pop();

        const userData = getUserDataFromCache(username);
        if (!userData) {
          console.warn(`BotBlocker: No data found in cache for ${username}. Skipping tweet.`);
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

  function isBot(followersCount, followingCount) {
    return followingCount < followersCount * 1000;
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

  function getUserDataFromCache(username) {
    const userData = userCache[username];
    if (!userData) {
      console.error(`BotBlocker: No data found in cache for ${username}`);
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
