function detectDelimiter(text) {
  const firstLine = (text.split(/\r?\n/)[0] || "");
  const counts = {
    ",": (firstLine.match(/,/g) || []).length,
    ";": (firstLine.match(/;/g) || []).length,
    "\t": (firstLine.match(/\t/g) || []).length
  };
  let best = ",";
  let max = -1;
  for (const d of Object.keys(counts)) {
    if (counts[d] > max) { max = counts[d]; best = d; }
  }
  return best;
}

function preFixMissingDelimiterAfterIP(text, delim) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines.length <= 1) return text;

  const header = lines[0];
  const body = lines.slice(1);

  const ipv4 = /\b(?:(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?:\.(?!$)|$)){4}\b/;
  const ipv6 =
    /\b(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\b/;

  const fixedBody = body.map(line => {
    if (!line) return line;
    const m = line.match(ipv4) || line.match(ipv6);
    if (!m) return line;
    const start = m.index;
    const len = m[0].length;
    const nextChar = line[start + len] || "";
    if (nextChar && nextChar !== delim && nextChar !== "\n") {
      const escapedDelim = delim === "\t" ? "\\t" : delim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tail = line.slice(start + len, start + len + 3);
      if (!new RegExp("^\\s*" + escapedDelim).test(tail)) {
        return line.slice(0, start + len) + delim + line.slice(start + len);
      }
    }
    return line;
  });

  return [header, ...fixedBody].join("\n");
}

function parseCSV(text) {
  text = String(text || "");
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const delim = detectDelimiter(text);
  text = preFixMissingDelimiterAfterIP(text, delim);

  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQuotes = false; i++; continue; }
      field += c; i++; continue;
    } else {
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === "\r") { i++; continue; }
      if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; i++; continue; }
      if (c === delim) { row.push(field); field = ""; i++; continue; }
      field += c; i++; continue;
    }
  }
  row.push(field); rows.push(row);
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") rows.pop();
  return rows;
}

// ================= IP helpers =================
function extractIP(text) {
  if (!text) return null;
  const ipv4Regex = /\b(?:(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?:\.(?!$)|$)){4}\b/;
  const ipv6Regex =
    /\b(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\b/;
  let m = text.match(ipv4Regex);
  if (m) return m[0];
  m = text.match(ipv6Regex);
  if (m) return m[0];
  return null;
}

function ipv4ToInt(ip) {
  const parts = ip.split(".").map(n => parseInt(n, 10));
  if (parts.length !== 4 || parts.some(n => isNaN(n) || n < 0 || n > 255)) return null;
  return (parts[0] << 24) >>> 0 | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

function parseCIDR(cidr) {
  const [ip, maskStr] = String(cidr || "").split("/");
  const n = parseInt(maskStr, 10);
  if (isNaN(n) || n < 0 || n > 32) return null;
  const ipInt = ipv4ToInt(ip);
  if (ipInt === null) return null;
  const mask = n === 0 ? 0 : (~((1 << (32 - n)) - 1)) >>> 0;
  const start = (ipInt & mask) >>> 0;
  const end = (start | (~mask >>> 0)) >>> 0;
  return { start, end };
}

function isValidIPv4(ip) { return ipv4ToInt(ip) !== null; }
function isValidIPv6(ip) {
  const ipv6Regex =
    /\b(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\b/;
  return ipv6Regex.test(ip);
}

// ================= State =================
let whitelistItems = [];
let whitelistCIDRs = [];
let whitelistIPs = new Set();
let loginHeaders = [];
let loginRows = [];


let resultRows = [];
let pageSize = 10;
let currentPage = 1;


const pageSizeSelect = document.getElementById("pageSizeSelect");
const pageInfoEl = document.getElementById("pageInfo");
const firstPageLink = document.getElementById("firstPage");
const prevPageLink = document.getElementById("prevPage");
const nextPageLink = document.getElementById("nextPage");
const lastPageLink = document.getElementById("lastPage");
const copyIpsBtn = document.getElementById("copyIps");


let whitelistValid = false;
let loginsValid = false;

// ================= DOM =================
const btnUploadWhitelist = document.getElementById("btnUploadWhitelist");
const fileWhitelist = document.getElementById("fileWhitelist");
const whitelistInfo = document.getElementById("whitelistInfo");

const btnUploadLogins = document.getElementById("btnUploadLogins");
const fileLogins = document.getElementById("fileLogins");
const loginsInfo = document.getElementById("loginsInfo");

const btnProcess = document.getElementById("btnProcess");
const resultsSection = document.getElementById("resultsSection");
const resultsTable = document.getElementById("loginResultsTable");
const thead = resultsTable.querySelector("thead tr");
const tbody = resultsTable.querySelector("tbody");

const modal = document.getElementById("invalidWhitelistModal");
const modalList = document.getElementById("invalidWhitelistList");
const modalClose = document.getElementById("invalidWhitelistClose");
if (modalClose) {
  modalClose.addEventListener("click", () => { modal.style.display = "none"; });
}
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && modal.style.display === "block") {
    modal.style.display = "none";
  }
});
if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });
}

// ================= UI helpers =================
function renderTableHeader(headers) {
  thead.innerHTML = "";
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    thead.appendChild(th);
  });
}

function renderTableBody(rows) {
  tbody.innerHTML = "";

  resultRows = Array.isArray(rows) ? rows.slice() : [];

  const total = resultRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);
  const pageRows = resultRows.slice(startIdx, endIdx);

  if (!pageRows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = loginHeaders.length;
    td.style.textAlign = "center";
    td.style.fontStyle = "italic";
    td.textContent = "No unauthorized attempts found.";
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    const cols = loginHeaders.length;
    pageRows.forEach(r => {
      const tr = document.createElement("tr");
      const rr = Array.isArray(r) ? r.slice() : [];
      if (rr.length < cols) while (rr.length < cols) rr.push("");
      else if (rr.length > cols) rr.length = cols;
      rr.forEach(val => {
        const td = document.createElement("td");
        td.textContent = val ?? "";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  updatePagerUI();
}

function updatePagerUI() {
  const total = resultRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const pageCount = totalPages;
  const totalRows = total;
  if (copyIpsBtn) copyIpsBtn.style.display = totalRows ? "inline" : "none";
  const showingFrom = (totalRows === 0) ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = Math.min(currentPage * pageSize, totalRows);

  pageInfoEl.textContent = `Page ${currentPage} of ${pageCount} (${totalRows} rows) — showing ${showingFrom}–${showingTo}`;

  const atFirst = currentPage <= 1;
  const atLast = currentPage >= pageCount;

  togglePagerLink(firstPageLink, !atFirst);
  togglePagerLink(prevPageLink, !atFirst);
  togglePagerLink(nextPageLink, !atLast);
  togglePagerLink(lastPageLink, !atLast);
}

function togglePagerLink(el, enabled) {
  if (!el) return;
  if (enabled) {
    el.classList.remove("disabled");
    el.setAttribute("aria-disabled", "false");
  } else {
    el.classList.add("disabled");
    el.setAttribute("aria-disabled", "true");
  }
}

function goToPage(n) {
  const totalPages = Math.max(1, Math.ceil(resultRows.length / pageSize));
  currentPage = Math.min(Math.max(1, n), totalPages);
  renderTableBody(resultRows);
  persistPageState();
}

function changePageSize(n) {
  pageSize = n;
  currentPage = 1;
  renderTableBody(resultRows);
  persistPageState();
}

function persistPageState() {
  chrome?.storage?.local?.set?.({
    loginResultsPageSize: pageSize,
    loginResultsCurrentPage: currentPage
  });
}



function showResults(headers, rows) {
  loginHeaders = headers.slice();
  renderTableHeader(loginHeaders);
  currentPage = 1;
  renderTableBody(rows);
  resultsSection.style.display = "block";
}


function persistResults(headers, rows) {
  chrome?.storage?.local?.set?.({
    loginResultsHeaders: headers,
    loginResultsRows: rows,
    loginResultsPageSize: pageSize,
    loginResultsCurrentPage: currentPage
  });
}

function clearResults() {
  resultsSection.style.display = "none";
  thead.innerHTML = "";
  tbody.innerHTML = "";
  resultRows = [];
  chrome?.storage?.local?.remove?.([
    "loginResultsHeaders",
    "loginResultsRows",
    "loginResultsPageSize",
    "loginResultsCurrentPage"
  ]);
}


function normHeader(h) {
  return String(h || "").toLowerCase().replace(/[\s_\-()]/g, "");
}
function findSourceCol(headers) {
  return headers.findIndex(h => {
    const n = normHeader(h);
    return n === "sourceip" || n === "sourceipaddress" || n === "ip" || n === "source";
  });
}

function updateProcessAvailability() {
  const ok = whitelistValid && loginsValid;
  btnProcess.disabled = !ok;
  btnProcess.title = ok
    ? ""
    : "You must load a valid whitelist and a valid login CSV (with 'Source IP' column) before processing.";
}

// ================= Buttons =================
btnUploadWhitelist.addEventListener("click", () => {
  fileWhitelist.value = "";
  fileWhitelist.click();
});
btnUploadLogins.addEventListener("click", () => {
  fileLogins.value = "";
  fileLogins.click();
});

fileWhitelist.addEventListener("change", () => {
  clearResults();
  const file = fileWhitelist.files && fileWhitelist.files[0];
  if (!file) { whitelistValid = false; updateProcessAvailability(); return; }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result || "");
      const rows = parseCSV(text);

      const colIndex = 0;
      const items = [];
      for (let r = 0; r < rows.length; r++) {
        const cellRaw = rows[r][colIndex];
        const cell = (cellRaw == null ? "" : String(cellRaw)).trim();
        if (!cell) continue;
        if (r === 0 && /^allowed\s*ips$/i.test(cell)) continue;
        items.push(cell);
      }

      const invalid = [];
      whitelistItems = items;
      whitelistIPs.clear();
      whitelistCIDRs = [];

      items.forEach(item => {
        const s = String(item).trim();
        if (!s) return;
        if (s.includes("/")) {
          const cidr = parseCIDR(s);
          if (cidr) whitelistCIDRs.push(cidr);
          else invalid.push(s);
        } else {
          if (isValidIPv4(s) || isValidIPv6(s)) {
            whitelistIPs.add(s);
          } else {
            invalid.push(s);
          }
        }
      });

      whitelistInfo.textContent =
        `Whitelist loaded: ${items.length} entries (${whitelistIPs.size} exact IPs, ${whitelistCIDRs.length} CIDR blocks).`;

      chrome?.storage?.local?.set?.({ loginWhitelistItems: whitelistItems });

      if (invalid.length && modal && modalList) {
        modalList.innerHTML = "";
        invalid.forEach(bad => {
          const li = document.createElement("li");
          li.textContent = bad;
          modalList.appendChild(li);
        });
        modal.style.display = "block";
      }

      whitelistValid = (whitelistIPs.size + whitelistCIDRs.length) > 0 && invalid.length === 0;
      updateProcessAvailability();

    } catch (e) {
      whitelistValid = false;
      updateProcessAvailability();
      alert("Error processing whitelist CSV.");
      console.error(e);
    }
  };
  reader.readAsText(file);
});

fileLogins.addEventListener("change", () => {
  clearResults();
  const file = fileLogins.files && fileLogins.files[0];
  if (!file) { loginsValid = false; updateProcessAvailability(); return; }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result || "");
      const rows = parseCSV(text);
      if (!rows.length) {
        loginsValid = false;
        updateProcessAvailability();
        alert("Login CSV is empty.");
        return;
      }
      loginHeaders = rows[0];
      loginRows = rows.slice(1);

      const cols = loginHeaders.length;
      loginRows = loginRows.map(r => {
        const a = Array.isArray(r) ? r.slice() : [];
        if (a.length < cols) while (a.length < cols) a.push("");
        else if (a.length > cols) a.length = cols;
        return a;
      });

      loginsInfo.textContent =
        `Login CSV loaded: ${loginRows.length} rows, ${loginHeaders.length} columns.`;

      const srcIdx = findSourceCol(loginHeaders);
      loginsValid = loginRows.length > 0 && srcIdx !== -1;
      updateProcessAvailability();

      chrome?.storage?.local?.set?.({ loginHeaders, loginRows });

    } catch (e) {
      loginsValid = false;
      updateProcessAvailability();
      alert("Error processing login CSV.");
      console.error(e);
    }
  };
  reader.readAsText(file);
});

btnProcess.addEventListener("click", () => {
  if (!whitelistValid || !loginsValid) {
    alert("You must load a valid whitelist and a valid login CSV (with 'Source IP' column) before processing.");
    return;
  }

  const sourceColIndex = findSourceCol(loginHeaders);
  if (sourceColIndex === -1) {
    alert('The "Source IP" column was not found in the login CSV.');
    return;
  }

  const notAllowed = [];
  for (const row of loginRows) {
    const raw = row[sourceColIndex] ?? "";
    const ip = extractIP(String(raw));
    if (!ip) { notAllowed.push(row); continue; }
    if (!isWhitelisted(ip)) notAllowed.push(row);
  }

  showResults(loginHeaders, notAllowed);
  persistResults(loginHeaders, notAllowed);
});


if (pageSizeSelect) {
  pageSizeSelect.addEventListener("change", () => {
    const v = parseInt(pageSizeSelect.value, 10);
    if (!isNaN(v)) changePageSize(v);
  });
}
if (firstPageLink) firstPageLink.addEventListener("click", () => goToPage(1));
if (prevPageLink) prevPageLink.addEventListener("click", () => goToPage(currentPage - 1));
if (nextPageLink) nextPageLink.addEventListener("click", () => goToPage(currentPage + 1));
if (lastPageLink) lastPageLink.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(resultRows.length / pageSize));
  goToPage(totalPages);
});

if (copyIpsBtn) {
  copyIpsBtn.addEventListener("click", async () => {
    const col = findSourceCol(loginHeaders);
    if (col === -1) {
      alert("Column source_ip not found.");
      return;
    }
    const set = new Set();
    for (const row of resultRows) {
      const raw = (row[col] ?? "");
      const ip = extractIP(String(raw));
      if (ip) set.add(ip);
    }
    const text = Array.from(set).join(", ");
    if (!text) {
      alert("No IPs to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      const orig = copyIpsBtn.textContent;
      copyIpsBtn.textContent = "Copied!";
      setTimeout(() => copyIpsBtn.textContent = orig, 1500);
    } catch (e) {
      alert("Could not copy to clipboard.");
    }
  });
}




// ================= Whitelist check =================
function isWhitelisted(ipStr) {
  if (whitelistIPs.has(ipStr)) return true;
  const ipInt = ipv4ToInt(ipStr);
  if (ipInt !== null) {
    for (const { start, end } of whitelistCIDRs) {
      if (ipInt >= start && ipInt <= end) return true;
    }
  }
  return false;
}

// ================= Restore persisted state on load =================
chrome?.storage?.local?.get?.(
  ["loginWhitelistItems", "loginHeaders", "loginRows",
    "loginResultsHeaders", "loginResultsRows",
    "loginResultsPageSize", "loginResultsCurrentPage"
  ],
  (data) => {
    // Restore whitelist
    if (Array.isArray(data?.loginWhitelistItems) && data.loginWhitelistItems.length) {
      whitelistItems = data.loginWhitelistItems.slice();
      whitelistIPs.clear();
      whitelistCIDRs = [];
      const invalid = [];
      whitelistItems.forEach(s => {
        const x = String(s || "").trim();
        if (!x) return;
        if (x.includes("/")) {
          const cidr = parseCIDR(x);
          if (cidr) whitelistCIDRs.push(cidr);
          else invalid.push(x);
        } else {
          if (isValidIPv4(x) || isValidIPv6(x)) whitelistIPs.add(x);
          else invalid.push(x);
        }
      });
      whitelistInfo.textContent =
        `Whitelist loaded: ${whitelistItems.length} entries (${whitelistIPs.size} exact IPs, ${whitelistCIDRs.length} CIDR blocks).`;
      whitelistValid = (whitelistIPs.size + whitelistCIDRs.length) > 0 && invalid.length === 0;
    }

    if (Array.isArray(data?.loginHeaders) && Array.isArray(data?.loginRows)) {
      loginHeaders = data.loginHeaders;
      loginRows = data.loginRows;
      loginsInfo.textContent =
        `Login CSV loaded: ${loginRows.length} rows, ${loginHeaders.length} columns.`;
      loginsValid = loginRows.length > 0 && findSourceCol(loginHeaders) !== -1;
    }

    if (Array.isArray(data?.loginResultsHeaders) && Array.isArray(data?.loginResultsRows)) {
      if (Number.isInteger(data.loginResultsPageSize)) {
        pageSize = data.loginResultsPageSize;
        if (pageSizeSelect) pageSizeSelect.value = String(pageSize);
      }
      if (Number.isInteger(data.loginResultsCurrentPage)) {
        currentPage = Math.max(1, data.loginResultsCurrentPage);
      }
      renderTableHeader(data.loginResultsHeaders);
      resultsSection.style.display = "block";
      renderTableBody(data.loginResultsRows);
    }


    updateProcessAvailability();
  }
);
