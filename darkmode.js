const darkToggle = document.getElementById("darkModeToggle");

if (darkToggle) {
  chrome.storage.local.get("darkMode", data => {
    if (data.darkMode) {
      document.body.classList.add("dark");
      darkToggle.checked = true;
    }
  });


  darkToggle.addEventListener("change", () => {
    if (darkToggle.checked) {
      document.body.classList.add("dark");
      chrome.storage.local.set({ darkMode: true });
    } else {
      document.body.classList.remove("dark");
      chrome.storage.local.set({ darkMode: false });
    }

    if (window.__updateMapTheme && typeof leafletMap !== "undefined" && leafletMap) {
      window.__updateMapTheme();
    }
  });
}
