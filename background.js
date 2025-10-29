

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'OPEN_OR_FOCUS') return; 

  const primaryURL = chrome.runtime.getURL(msg.primaryPath);
  const altURLs = Array.isArray(msg.altPaths) ? msg.altPaths.map(p => chrome.runtime.getURL(p)) : [];
  const candidates = [primaryURL, ...altURLs];

  const matches = (tabUrl) => {
    if (!tabUrl) return false;
    return candidates.some(c => tabUrl === c || tabUrl.startsWith(c + '#') || tabUrl.startsWith(c + '?'));
  };
  tryFocus({ currentWindow: true });

  function tryFocus(scope) {
    chrome.tabs.query(scope, tabs => {
      const found = tabs.find(t => matches(t.url));
      if (found) {
        chrome.windows.update(found.windowId, { focused: true }, () => {
          chrome.tabs.update(found.id, { active: true }, () => {
            sendResponse?.({ ok: true, focused: true, tabId: found.id });
          });
        });
      } else {
        if (scope.currentWindow) {
          tryFocus({}); 
        } else {
          chrome.tabs.create({ url: primaryURL, active: true }, (created) => {
            sendResponse?.({ ok: true, created: true, tabId: created?.id });
          });
        }
      }
    });
  }

  return true;
});
