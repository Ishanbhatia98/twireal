(function () {
  let blockedUsers = {};
  let hideOrBlur = 'hide'; // Default action is to hide tweets
  let apiDataProcessed = false; // Flag to track if API data has been processed
  let apiCallMade = false; // Flag to track if API call has been made (updated to prevent multiple requests)
  const loadDelay = 3000; // Delay of 3 seconds (adjust to 5-10 seconds as needed)
  const scrollDelay = 2000; // Delay of 2 seconds after scrolling
  let retryCount = 0;
  const maxRetries = 3;

  function initializeBotBlocker() {
    if (window.botBlockerInitialized) {
      console.log("BotBlocker: Already initialized.");
      return;
    }

    window.botBlockerInitialized = true;
    console.log("BotBlocker: Content script started.");

    // Reset flags on page load
    window.addEventListener('load', function () {
      resetFlags(); // Reset flags after page load
      setTimeout(() => {
        console.log(`BotBlocker: Running after ${loadDelay / 1000} seconds delay...`);
        processTimelineFromDOM(); // Initial DOM processing
      }, loadDelay);
    });

    // Add scroll event listener with a delay before processing tweets
    window.addEventListener('scroll', debounce(() => {
      if (apiDataProcessed) { // Only process DOM if API data has been fetched
        setTimeout(() => {
          console.log("BotBlocker: Running after scrolling...");
          processTimelineFromDOM();
        }, scrollDelay);
      } else {
        console.warn("BotBlocker: Skipping tweet processing since API data hasn't been processed yet.");
      }
    }, scrollDelay));
  }

  // Reset all flags on load
  function resetFlags() {
    console.log("BotBlocker: Resetting flags...");
    apiCallMade = false;
    apiDataProcessed = false;
    retryCount = 0;
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
      console.log("BotBlocker: Received message to process HomeLatestTimeline");
      if (apiCallMade) {
        console.log("BotBlocker: API call already made, skipping.");
        return; // Prevent multiple API calls
      }

      apiCallMade = true; // Set flag as soon as API request starts

      const url = request.url;
      const headers = request.headers;
      const payload = request.payload;

      console.log("BotBlocker: URL:", url);
      console.log("BotBlocker: Headers:", headers);
      console.log("BotBlocker: Payload:", payload);

      fetchWithRetry(url, headers, payload); // Fetch data with retry mechanism
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

  // Retry logic to handle failed API calls
  function fetchWithRetry(url, headers, payload) {
    const fetchHeaders = new Headers();
    headers.forEach(header => {
      fetchHeaders.append(header.name, header.value);
    });

    // Ensure the request is only retried a maximum of `maxRetries` times
    function attemptFetch(retryCount) {
      console.log(`BotBlocker: Attempting fetch, retryCount: ${retryCount}`);
      fetch(url, {
        method: 'POST',
        credentials: 'include', // Include credentials like cookies
        headers: fetchHeaders,
        body: JSON.stringify(payload) // Sending the payload in the body
      })
        .then(response => {
          if (!response.ok) {
            if (response.status === 403) {
              console.error("403 Forbidden: Check API permissions or authentication.");
            } else if (response.status === 400) {
              console.error("400 Bad Request: Likely a payload or headers issue.");
            }

            if (retryCount < maxRetries) {
              console.log(`Retry attempt ${retryCount + 1}`);
              setTimeout(() => attemptFetch(retryCount + 1), 1000 * (retryCount + 1)); // Retry with delay
            } else {
              console.error("Max retry attempts reached.");
              apiCallMade = false; // Reset for future API requests
            }
            return;
          }
          return response.json();
        })
        .then(data => {
          if (data) {
            console.log("BotBlocker: Successfully fetched HomeLatestTimeline API response:", data);
            processTimelineFromAPI(data); // Pass the response data to be processed
            apiCallMade = false; // Allow future API requests
          }
        })
        .catch(error => {
          console.error("Error fetching HomeLatestTimeline API data:", error);
          apiCallMade = false; // Reset in case of failure
        });
    }

    // Begin first attempt
    attemptFetch(0); // Retry count starts from 0
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

          storeUserData(username, followersCount, followingCount); // Store user data

          console.log(`BotBlocker: Processed user ${username} - Followers: ${followersCount}, Following: ${followingCount}`);
        } else {
          console.warn("BotBlocker: Tweet results not found for entry.");
        }
      });
    });

    apiDataProcessed = true; // Mark API data as processed
    console.log("BotBlocker: API data processed, ready to scan DOM.");
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
