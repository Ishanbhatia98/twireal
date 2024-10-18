// content.js
const botPatterns = [
  /^[a-zA-Z0-9]+$/,
  /^[a-zA-Z0-9]+_[a-zA-Z0-9]+$/,
  /bot/i,
  /xyz$/i,
];

const config = { childList: true, subtree: true };
let removedCount = 0;
let lastScrollPosition = 0;
const BATCH_SIZE = 20;
const SCROLL_THRESHOLD = 200;

function isBotUsername(username) {
  return botPatterns.some(pattern => pattern.test(username));
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function removeBotPosts() {
  const posts = document.querySelectorAll('article[data-testid="tweet"]:not([data-processed])');
  let batchCount = 0;

  for (const post of posts) {
    if (batchCount >= BATCH_SIZE) break;

    const usernameElement = post.querySelector('div[data-testid="User-Name"] > div:last-child > span');
    if (usernameElement) {
      const username = usernameElement.textContent.trim().toLowerCase();
      if (isBotUsername(username)) {
        post.style.display = 'none';
        removedCount++;
        batchCount++;
      }
    }
    post.dataset.processed = 'true';
  }

  if (batchCount > 0) {
    updateExtensionBadge();
  }
}

const debouncedRemoveBotPosts = debounce(removeBotPosts, 250);

function handleScroll() {
  const currentScrollPosition = window.scrollY;
  if (Math.abs(currentScrollPosition - lastScrollPosition) > SCROLL_THRESHOLD) {
    lastScrollPosition = currentScrollPosition;
    debouncedRemoveBotPosts();
  }
}

function updateExtensionBadge() {
  chrome.runtime.sendMessage({ action: "updateBadge", count: removedCount });
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      debouncedRemoveBotPosts();
      break;
    }
  }
});

window.addEventListener('scroll', handleScroll, { passive: true });
observer.observe(document.body, config);

// Initial check
debouncedRemoveBotPosts();