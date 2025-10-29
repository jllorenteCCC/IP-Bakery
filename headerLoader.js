// headerLoader.js
document.addEventListener("DOMContentLoaded", () => {
  const headerURL = chrome.runtime.getURL("header.html");

  fetch(headerURL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then((html) => {
      // Insert header
      document.body.insertAdjacentHTML("afterbegin", html);

      const path = (window.location.pathname.split("/").pop() || "").toLowerCase();
      const isLoginPage = path.includes("login.html");
      const isBatchPage = path.includes("popup.html") || path.includes("csv.html");

      const tabBatch = document.getElementById("tabBatch");
      const tabCsv   = document.getElementById("tabCsv");
      if (path.includes("popup.html") && tabBatch) tabBatch.classList.add("active");
      if (path.includes("csv.html")   && tabCsv)   tabCsv.classList.add("active");

      if (!document.querySelector('script[src="darkmode.js"]')) {
        const darkScript = document.createElement("script");
        darkScript.src = "darkmode.js";
        document.body.appendChild(darkScript);
      }

      const tabs = document.getElementById("mainTabs");
      if (tabs && isLoginPage) {
        tabs.innerHTML = '<a href="login.html" class="tab active" id="tabLogin">Login Processor</a>';
      }

      // Side menu 
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

      // Open-in-new-tab logic for menu items
      const menuLogin = document.getElementById("menuLogin");
      const menuBatch = document.getElementById("menuBatch");

      if (menuLogin) {
        menuLogin.addEventListener("click", (e) => {
          e.preventDefault();
          if (isLoginPage) { 
            closeMenu();
            return;
          }
          window.open("login.html", "_blank");
          closeMenu();
        });
      }

      if (menuBatch) {
        menuBatch.addEventListener("click", (e) => {
          e.preventDefault();
          if (isBatchPage) {
            if (!path.includes("popup.html")) {
              window.location.href = "popup.html";
            } else {
              closeMenu(); 
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
