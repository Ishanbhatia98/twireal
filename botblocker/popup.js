document.addEventListener('DOMContentLoaded', function() {
    const toggleSwitch = document.getElementById('toggleSwitch');
    const status = document.getElementById('status');
  
    chrome.storage.sync.get('isEnabled', function(data) {
      toggleSwitch.checked = data.isEnabled;
      updateStatus(data.isEnabled);
    });
  
    toggleSwitch.addEventListener('change', function() {
      const isEnabled = toggleSwitch.checked;
      chrome.storage.sync.set({isEnabled: isEnabled}, function() {
        updateStatus(isEnabled);
      });
    });
  
    function updateStatus(isEnabled) {
      status.textContent = isEnabled ? 'BotBlocker is on' : 'BotBlocker is off';
    }
  });