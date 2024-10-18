document.addEventListener('DOMContentLoaded', function() {
    const accountList = document.getElementById('accountList');
    const addAccountForm = document.getElementById('addAccountForm');
    const accountInput = document.getElementById('accountInput');

    // Load and display the list of hidden accounts
    function loadAccounts() {
        chrome.storage.sync.get(['hiddenAccounts'], function(result) {
            const hiddenAccounts = result.hiddenAccounts || [];
            accountList.innerHTML = '';
            hiddenAccounts.forEach(account => {
                const accountElement = document.createElement('div');
                accountElement.className = 'account-item';
                accountElement.innerHTML = `
                    <span>@${account}</span>
                    <button class="remove-btn" data-account="${account}">Remove</button>
                `;
                accountList.appendChild(accountElement);
            });
        });
    }

    // Add a new account to hide
    addAccountForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const newAccount = accountInput.value.trim().replace('@', '');
        if (newAccount) {
            chrome.storage.sync.get(['hiddenAccounts'], function(result) {
                const hiddenAccounts = result.hiddenAccounts || [];
                if (!hiddenAccounts.includes(newAccount)) {
                    hiddenAccounts.push(newAccount);
                    chrome.storage.sync.set({hiddenAccounts: hiddenAccounts}, function() {
                        loadAccounts();
                        accountInput.value = '';
                    });
                }
            });
        }
    });

    // Remove an account from the hidden list
    accountList.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-btn')) {
            const accountToRemove = e.target.getAttribute('data-account');
            chrome.storage.sync.get(['hiddenAccounts'], function(result) {
                const hiddenAccounts = result.hiddenAccounts || [];
                const updatedAccounts = hiddenAccounts.filter(account => account !== accountToRemove);
                chrome.storage.sync.set({hiddenAccounts: updatedAccounts}, function() {
                    loadAccounts();
                });
            });
        }
    });

    // Initial load of accounts
    loadAccounts();
});