// headerLoader.js
document.addEventListener("DOMContentLoaded", () => {
  const headerURL = chrome.runtime.getURL("header.html");

  fetch(headerURL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then((html) => {
      // 1) Insert header
      document.body.insertAdjacentHTML("afterbegin", html);

      // 2) Page context
      const path = (window.location.pathname.split("/").pop() || "").toLowerCase();
      const isLoginPage = path.includes("login.html");
      const isBatchPage = path.includes("popup.html") || path.includes("csv.html");

      // 3) Mark active tab (only for popup/csv)
      const tabBatch = document.getElementById("tabBatch");
      const tabCsv   = document.getElementById("tabCsv");
      if (path.includes("popup.html") && tabBatch) tabBatch.classList.add("active");
      if (path.includes("csv.html")   && tabCsv)   tabCsv.classList.add("active");

      // 4) Inject darkmode.js if not already present
      if (!document.querySelector('script[src="darkmode.js"]')) {
        const darkScript = document.createElement("script");
        darkScript.src = "darkmode.js";
        document.body.appendChild(darkScript);
      }

      // 5) Adapt header tabs for login.html (only show Login Processor)
      const tabs = document.getElementById("mainTabs");
      if (tabs && isLoginPage) {
        tabs.innerHTML = '<a href="login.html" class="tab active" id="tabLogin">Login Processor</a>';
      }

      // 6) Side menu (hamburger) wiring
      const menuBtn  = document.getElementById("menuToggle");
      const sideMenu = document.getElementById("sideMenu");

      function closeMenu() {
        if (!sideMenu) return;
        sideMenu.hidden = true;
        if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
        document.removeEventListener("keydown", escHandler);
        document.removeEventListener("click", outsideHandler, true);
      }
      function escHandler(e) {
        if (e.key === "Escape") closeMenu();
      }
      function outsideHandler(e) {
        if (!sideMenu.contains(e.target) && e.target !== menuBtn) {
          closeMenu();
        }
      }

      if (menuBtn && sideMenu) {
        menuBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const isOpen = !sideMenu.hidden;
          if (isOpen) {
            closeMenu();
          } else {
            sideMenu.hidden = false;
            menuBtn.setAttribute("aria-expanded", "true");
            setTimeout(() => {
              document.addEventListener("keydown", escHandler);
              document.addEventListener("click", outsideHandler, true);
            }, 0);
          }
        });
      }

      // 7) Open-in-new-tab logic for menu items
      const menuLogin = document.getElementById("menuLogin");
      const menuBatch = document.getElementById("menuBatch");

      // Login Processor: open new tab only if NOT already on login.html
      if (menuLogin) {
        menuLogin.addEventListener("click", (e) => {
          e.preventDefault();
          if (isLoginPage) { // already on login
            closeMenu();
            return;
          }
          window.open("login.html", "_blank");
          closeMenu();
        });
      }

      // IP Batch: if on popup/csv, navigate in SAME tab to popup.html; otherwise open new tab
      if (menuBatch) {
        menuBatch.addEventListener("click", (e) => {
          e.preventDefault();
          if (isBatchPage) {
            if (!path.includes("popup.html")) {
              window.location.href = "popup.html";
            } else {
              closeMenu(); // already there
            }
            return;
          }
          window.open("popup.html", "_blank");
          closeMenu();
        });
      }
    })
    .catch((err) => {
      console.error("Header load failed:", err);
    });
});
