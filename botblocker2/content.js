(function () {
    if (window.botBlockerInitialized) {
      console.log('BotBlocker: Already initialized, skipping initialization.');
      return;
    }
  
    window.botBlockerInitialized = true;
    console.log('BotBlocker: Content script started');
  
    const originalFetch = window.fetch;
  
    window.fetch = function (...args) {
      const fetchUrl = args[0];
      console.log(`BotBlocker: Fetch request intercepted - URL: ${fetchUrl}`);
  
      return originalFetch.apply(this, args).then(response => {
        if (fetchUrl.includes('HomeLatestTimeline')) {
          console.log('BotBlocker: Intercepted HomeLatestTimeline API request.');
  
          // Clone the response to preserve original behavior
          const clonedResponse = response.clone();
  
          // Parse the response and handle it
          clonedResponse.json().then(data => {
            console.log('BotBlocker: Processing Timeline API response...', data);
            // Send the response data to be processed
            processTimelineResponse(data);
          });
        }
        return response;
      });
    };
  
    // Function to process the API response
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
      if (following > followers) {
        console.log(`BotBlocker: User ${username} is identified as a bot`);
        hideUserPosts(username);
      }
    }
  
    function hideUserPosts(username) {
      const posts = document.querySelectorAll(`a[href*="/${username}"]`);
      posts.forEach(post => {
        const tweet = post.closest('div[data-testid="tweet"]');
        if (tweet) {
          tweet.style.display = 'none';
        }
      });
    }
  })();
  