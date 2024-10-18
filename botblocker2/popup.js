// popup.js
document.addEventListener('DOMContentLoaded', function() {
    const enableToggle = document.getElementById('enableToggle');
    const hideModeSelect = document.getElementById('hideMode');
    const totalBlockedSpan = document.getElementById('totalBlocked');
    const blockedAccountsTable = document.getElementById('blockedAccountsTable');

    // Load initial state
    chrome.storage.sync.get(['enabled', 'hideMode'], function(result) {
        enableToggle.checked = result.enabled !== false;
        hideModeSelect.value = result.hideMode || 'blur';
    });

    // Event listeners
    enableToggle.addEventListener('change', function() {
        chrome.storage.sync.set({enabled: this.checked});
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleEnabled', enabled: enableToggle.checked});
        });
    });

    hideModeSelect.addEventListener('change', function() {
        chrome.storage.sync.set({hideMode: this.value});
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'setHideMode', mode: hideModeSelect.value});
        });
    });

    // Function to update the blocked accounts table
    function updateBlockedAccountsTable(blockedAccounts) {
        blockedAccountsTable.innerHTML = `
            <tr>
                <th>Username</th>
                <th>Blocked Count</th>
                <th>Action</th>
            </tr>
        `;
        for (let [username, count] of Object.entries(blockedAccounts)) {
            const row = blockedAccountsTable.insertRow();
            row.innerHTML = `
                <td>${username}</td>
                <td>${count}</td>
                <td><button class="whitelist-btn" data-username="${username}">Whitelist</button></td>
            `;
        }
        // Add event listeners to whitelist buttons
        document.querySelectorAll('.whitelist-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const username = this.getAttribute('data-username');
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {action: 'addToWhitelist', username: username});
                });
                this.closest('tr').remove();
            });
        });
    }

    // Listen for updates from content script
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'updateStats') {
            totalBlockedSpan.textContent = request.blockedCount;
            updateBlockedAccountsTable(request.blockedAccounts);
        }
    });
});