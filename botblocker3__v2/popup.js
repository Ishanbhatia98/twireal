document.addEventListener('DOMContentLoaded', function () {
  const toggleBlocker = document.getElementById('toggle-blocker');
  const hideBlurOption = document.getElementById('hide-blur');
  const blockedAccountsTable = document.getElementById('blocked-accounts');
  const refreshButton = document.getElementById('refresh-button'); 

  // Load saved preferences from chrome.storage.local
  chrome.storage.local.get(['botBlockerEnabled', 'hideOrBlur', 'blockedUsers'], function (data) {
    console.log("BotBlocker: Loaded settings from storage:", data);
    toggleBlocker.checked = data.botBlockerEnabled ?? true;
    hideBlurOption.value = data.hideOrBlur ?? 'hide';
    updateBlockedAccounts(data.blockedUsers || {});
  });

  // Toggle bot blocker on/off
  toggleBlocker.addEventListener('change', function () {
    const isEnabled = toggleBlocker.checked;
    chrome.storage.local.set({ botBlockerEnabled: isEnabled }, function() {
      console.log("BotBlocker: Bot blocker toggled:", isEnabled);

      // If the BotBlocker is turned on, send a message to re-evaluate all users
      if (isEnabled) {
        console.log("BotBlocker: Sending message to re-evaluate users...");
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, { message: "reprocess_tweets" });
        });
      }
    });
  });

  // Set hide or blur preference
  hideBlurOption.addEventListener('change', function () {
    const hideOrBlur = hideBlurOption.value;
    chrome.storage.local.set({ hideOrBlur: hideOrBlur }, function() {
      console.log("BotBlocker: Hide/Blur option changed to:", hideOrBlur);
    });
  });

  // Update the blocked accounts table dynamically
  function updateBlockedAccounts(blockedUsers) {
    console.log("BotBlocker: Updating blocked accounts table...");
    blockedAccountsTable.innerHTML = ''; // Clear the table

    for (const username in blockedUsers) {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${username}</td><td>${blockedUsers[username].tweetsBlocked}</td>`;
      blockedAccountsTable.appendChild(row);
      console.log(`BotBlocker: Added ${username} to blocked accounts.`);
    }

    if (Object.keys(blockedUsers).length === 0) {
      console.log("BotBlocker: No blocked users to display.");
    }
  }

  // Handle refresh button click event
  refreshButton.addEventListener('click', function () {
    console.log("BotBlocker: Refresh button clicked. Clearing table...");

    // Retrieve blocked users from chrome.storage.local and refresh the table
    chrome.storage.local.get('blockedUsers', function (data) {
      console.log("BotBlocker: Retrieved blocked users from storage for refresh:", data.blockedUsers);
      const blockedUsers = data.blockedUsers || {};
      
      // Clear the table and re-add only the currently blocked users
      updateBlockedAccounts(blockedUsers);
      console.log("BotBlocker: Refreshed blocked accounts.");
    });
  });

  // Listen for messages from content.js to update the popup
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.message === "update_popup") {
      console.log("BotBlocker: Popup received update:", request.blockedUsers);
      updateBlockedAccounts(request.blockedUsers);
    }
  });
});
