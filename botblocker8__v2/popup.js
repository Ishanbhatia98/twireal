document.addEventListener('DOMContentLoaded', function () {
  const toggleBlocker = document.getElementById('toggle-blocker');
  const hideBlurOption = document.getElementById('hide-blur');
  const blockedAccountsTable = document.getElementById('blocked-accounts');

  // Load preferences from chrome.storage
  chrome.storage.local.get(['botBlockerEnabled', 'hideOrBlur', 'blockedUsers'], function (data) {
    toggleBlocker.checked = data.botBlockerEnabled ?? true;
    hideBlurOption.value = data.hideOrBlur ?? 'hide';
    updateBlockedAccounts(data.blockedUsers || {});
  });

  // Toggle BotBlocker on/off
  toggleBlocker.addEventListener('change', function () {
    const isEnabled = toggleBlocker.checked;
    chrome.storage.local.set({ botBlockerEnabled: isEnabled }, function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { message: "update_settings", botBlockerEnabled: isEnabled });
      });
    });
  });

  // Change between hide or blur action
  hideBlurOption.addEventListener('change', function () {
    const action = hideBlurOption.value;
    chrome.storage.local.set({ hideOrBlur: action }, function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { message: "update_settings", hideOrBlur: action });
      });
    });
  });

  function updateBlockedAccounts(blockedUsers) {
    blockedAccountsTable.innerHTML = ''; // Clear the table before updating
    for (const username in blockedUsers) {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${username}</td><td>${blockedUsers[username].tweetsBlocked}</td>`;
      blockedAccountsTable.appendChild(row);
    }
  }

  // Listen for updates from the content script
  chrome.runtime.onMessage.addListener(function (request) {
    if (request.message === "update_popup") {
      updateBlockedAccounts(request.blockedUsers);
    }
  });
});
