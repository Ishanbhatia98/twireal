document.addEventListener('DOMContentLoaded', function () {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const status = document.getElementById('status');
  const blockedListElement = document.getElementById('blockedList');
  const hiddenCountElement = document.getElementById('hiddenCount');

  // Load toggle switch state and blocked users on popup load
  chrome.storage.local.get(['isEnabled', 'blockedUsers', 'hiddenPostsCount'], function (data) {
    const { isEnabled = false, blockedUsers = [], hiddenPostsCount = 0 } = data;

    // Set toggle switch state
    toggleSwitch.checked = isEnabled;
    updateStatus(isEnabled);

    // Display hidden post count
    hiddenCountElement.textContent = `Hidden posts/comments: ${hiddenPostsCount}`;

    // Display blocked usernames
    updateBlockedUsers(blockedUsers);
  });

  // Toggle BotBlocker state
  toggleSwitch.addEventListener('change', function () {
    const isEnabled = toggleSwitch.checked;
    chrome.storage.local.set({ isEnabled: isEnabled }, function () {
      updateStatus(isEnabled);
    });
  });

  // Update BotBlocker status text
  function updateStatus(isEnabled) {
    status.textContent = isEnabled ? 'BotBlocker is on' : 'BotBlocker is off';
  }

  // Update the list of blocked users in the popup
  function updateBlockedUsers(blockedUsers) {
    blockedListElement.innerHTML = ''; // Clear current list

    if (blockedUsers.length === 0) {
      blockedListElement.innerHTML = '<li>No users blocked</li>';
      return;
    }

    blockedUsers.forEach(username => {
      const listItem = document.createElement('li');
      listItem.textContent = username;
      blockedListElement.appendChild(listItem);
    });
  }
});
