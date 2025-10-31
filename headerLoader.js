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
      const tabCsv = document.getElementById("tabCsv");
      if (path.includes("popup.html") && tabBatch) tabBatch.classList.add("active");
      if (path.includes("csv.html") && tabCsv) tabCsv.classList.add("active");

      if (!document.querySelector('script[src="darkmode.js"]')) {
        const darkScript = document.createElement("script");
        darkScript.src = "darkmode.js";
        document.body.appendChild(darkScript);
      }

      const tabs = document.getElementById("mainTabs");
      if (tabs && isLoginPage) {
        tabs.innerHTML = '<a href="login.html" class="tab active" id="tabLogin">Login Processor</a>';
      }

      const menuBtn = document.getElementById("menuToggle");
      const drawer = document.getElementById("sideDrawer");
      const overlay = document.getElementById("menuOverlay");
      const drawerClose = document.getElementById("drawerClose");

      function openDrawer() {
        if (!drawer || !overlay) return;
        drawer.hidden = false;
        overlay.hidden = false;
        requestAnimationFrame(() => {
          drawer.classList.add("open");
          overlay.classList.add("show");
        });
        document.body.classList.add("drawer-open");
        menuBtn?.setAttribute("aria-expanded", "true");
        drawer.setAttribute("aria-hidden", "false");
        setTimeout(() => drawerClose?.focus(), 50);
      }
      function closeDrawer() {
        if (!drawer || !overlay) return;
        drawer.classList.remove("open");
        overlay.classList.remove("show");
        document.body.classList.remove("drawer-open");
        menuBtn?.setAttribute("aria-expanded", "false");
        drawer.setAttribute("aria-hidden", "true");
        setTimeout(() => { drawer.hidden = true; overlay.hidden = true; }, 280);
      }

      function onEsc(e) { if (e.key === "Escape") closeDrawer(); }
      function onOverlayClick(e) { if (e.target === overlay) closeDrawer(); }

      if (menuBtn && drawer && overlay) {
        menuBtn.addEventListener("click", (e) => {
          e.preventDefault();
          if (drawer.classList.contains("open")) { closeDrawer(); } else { openDrawer(); }
        });
        overlay.addEventListener("click", onOverlayClick);
        drawerClose?.addEventListener("click", closeDrawer);
        document.addEventListener("keydown", onEsc);
      }


      const menuLogin = document.getElementById("menuLogin");
      const menuBatch = document.getElementById("menuBatch");

      if (menuLogin) {
        menuLogin.addEventListener("click", (e) => {
          e.preventDefault();
          if (isLoginPage) { closeDrawer(); return; }
          closeDrawer(); // cerrar inmediatamente
          chrome.runtime.sendMessage(
            { type: "OPEN_OR_FOCUS", primaryPath: "login.html", altPaths: [] },
            (resp) => { if (!resp || resp.ok !== true) window.open("login.html", "_blank"); }
          );
        });
      }

      if (menuBatch) {
        menuBatch.addEventListener("click", (e) => {
          e.preventDefault();
          if (isBatchPage) {
            closeDrawer(); // cerrar igualmente aunque ya estés en sección batch
            if (!path.includes("popup.html")) window.location.href = "popup.html";
            return;
          }
          closeDrawer(); // cerrar inmediatamente
          chrome.runtime.sendMessage(
            { type: "OPEN_OR_FOCUS", primaryPath: "popup.html", altPaths: ["csv.html"] },
            (resp) => { if (!resp || resp.ok !== true) window.open("popup.html", "_blank"); }
          );
        });
      }
    })
    .catch((err) => {
      console.error("Failed to load header:", err);
    });
});
