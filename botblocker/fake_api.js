chrome.runtime.sendMessage({action: "getOriginalResponse", url: window.location.href}, function(response) {
    if (response.data) {
      let modifiedData = modifyApiResponse(response.data);
      document.dispatchEvent(new CustomEvent('TwitterAPIResponse', { detail: modifiedData }));
    } else {
      console.error('Error fetching original response:', response.error);
    }
  });
  
  function modifyApiResponse(responseText) {
    let data = JSON.parse(responseText);
    // Apply your filtering logic here
    // For example:
    data.data.home.home_timeline_urt.instructions[0].entries = data.data.home.home_timeline_urt.instructions[0].entries.filter(entry => {
      let user = entry.content.itemContent.tweet_results.result.core.user_results.result.legacy;
      return user.followers_count < 2 * user.friends_count;
    });
    return JSON.stringify(data);
  }