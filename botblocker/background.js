chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: [1],
  addRules: [{
    id: 1,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      responseHeaders: [{
        header: 'Content-Security-Policy',
        operation: 'remove'
      }]
    },
    condition: {
      urlFilter: '|https://x.com/i/api/graphql/E6AtJXVPtK7nIHAntKc5fA/HomeTimeline',
      resourceTypes: ['xmlhttprequest']
    }
  }]
});