// ---- boot log para verificar que el worker carga ----
console.log("[IP Bakery] Service worker loaded");

// ---- abrir/enfocar por mensaje (lo que ya usabas) ----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "OPEN_OR_FOCUS") return;
  const primaryPath = msg.primaryPath || "popup.html";
  const altPaths = Array.isArray(msg.altPaths) ? msg.altPaths : ["login.html", "csv.html"];
  openOrFocus(primaryPath, altPaths).then((res) => sendResponse(res));
  return true;
});

// ---- abrir/enfocar al CLICK del icono ----
chrome.action.onClicked.addListener(async () => {
  await openOrFocus("popup.html", ["login.html", "csv.html"]);
});

// ---- función común abrir/enfocar ----
async function openOrFocus(primaryPath, altPaths) {
  const primaryURL = chrome.runtime.getURL(primaryPath);
  const altURLs = (altPaths || []).map((p) => chrome.runtime.getURL(p));
  const candidates = [primaryURL, ...altURLs];

  const matches = (u) => !!u && candidates.some((c) => u === c || u.startsWith(c + "#") || u.startsWith(c + "?"));

  // 1) Busca en la ventana actual
  let tabs = await chrome.tabs.query({ currentWindow: true });
  let found = tabs.find((t) => matches(t.url));
  if (found) {
    if (found.windowId) await chrome.windows.update(found.windowId, { focused: true });
    await chrome.tabs.update(found.id, { active: true });
    return { ok: true, focused: true, tabId: found.id };
  }

  // 2) Busca en todas las ventanas
  tabs = await chrome.tabs.query({});
  found = tabs.find((t) => matches(t.url));
  if (found) {
    if (found.windowId) await chrome.windows.update(found.windowId, { focused: true });
    await chrome.tabs.update(found.id, { active: true });
    return { ok: true, focused: true, tabId: found.id };
  }

  // 3) Crea pestaña nueva
  const created = await chrome.tabs.create({ url: primaryURL, active: true });
  return { ok: true, created: true, tabId: created?.id || null };
}
