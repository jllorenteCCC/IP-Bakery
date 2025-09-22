const countryMap = {
    DE: "Germany", ES: "Spain", US: "United States", NL: "Netherlands", FR: "France", IT: "Italy",
    GB: "United Kingdom", RU: "Russia", CN: "China", BR: "Brazil", RO: "Romania", IN: "India", CA: "Canada",
    AU: "Australia", JP: "Japan", PL: "Poland", SE: "Sweden", AT: "Austria", CH: "Switzerland", BE: "Belgium",
    DK: "Denmark", NO: "Norway", FI: "Finland", PT: "Portugal", GR: "Greece", HU: "Hungary", CZ: "Czech Republic",
    HK: "Hong Kong", TR: "Turkey", TW: "Taiwan", VN: "Vietnam", KR: "Republic of Korea", BG: "Bulgaria",
    IE: "Ireland", SG: "Singapore", IR: "Iran", ZA: "South Africa", ID: "Indonesia",
    BO: "Bolivia", CL: "Chile", AR: "Argentina", MX: "Mexico", PH: "Philippines", TH: "Thailand",
    TJ: "Tajikistan", KZ: "Kazakhstan", UA: "Ukraine", BY: "Belarus", BD: "Bangladesh", PK: "Pakistan",
};

const downloadBtn = document.getElementById("downloadCsv");
const mapBtn = document.getElementById("openMap");

function setButtonDisabled(btn, disabled) {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? "0.5" : "1";
    btn.style.cursor = disabled ? "not-allowed" : "pointer";
}

chrome.storage.local.get(
    ["apiKey", "ipList", "resultsData", "filterColumn", "filterValue", "dateFrom", "dateTo"],
    (data) => {
        if (data.apiKey) {

            document.getElementById("apiKey").value = data.apiKey;
            updateCheckUsage(data.apiKey);

        }
        if (data.ipList) document.getElementById("ipList").value = data.ipList;

        if (data.resultsData && data.resultsData.length > 0) {
            const tableBody = document.querySelector("#resultsTable tbody");
            tableBody.innerHTML = "";
            data.resultsData.forEach(rowData => {
                const row = document.createElement("tr");
                if (rowData.className) row.className = rowData.className;
                if (rowData.style) row.style.display = rowData.style;

                if (rowData.dataset) {
                    Object.keys(rowData.dataset).forEach(k => {
                        row.dataset[k] = rowData.dataset[k];
                    });
                }

                rowData.cells.forEach(html => {
                    const td = document.createElement("td");
                    td.innerHTML = html;
                    row.appendChild(td);
                });
                tableBody.appendChild(row);
            });

            setButtonDisabled(downloadBtn, false);
            setButtonDisabled(mapBtn, false);
            document.getElementById("filterSection").style.display = "flex";
            document.getElementById("filterActions").style.display = "none";
            const copyBtn = document.getElementById("copyFiltered");
            const hasVisible = Array.from(tableBody.querySelectorAll("tr"))
                .some(r => r.style.display !== "none" && !r.id.includes("noResultRow"));
            copyBtn.style.display = hasVisible ? "inline-block" : "none";
            updateSummary();

        } else {
            setButtonDisabled(downloadBtn, true);
            setButtonDisabled(mapBtn, true);
        }
        if (data.filterColumn) {
            document.getElementById("filterColumn").value = data.filterColumn;
            filterColumn.dispatchEvent(new Event("change"));
        }
        if (data.filterValue) {
            const fv = document.getElementById("filterValue");
            if (fv) fv.value = data.filterValue;
        }
        if (data.dateFrom) {
            const df = document.getElementById("dateFrom");
            if (df) df.value = data.dateFrom;
        }
        if (data.dateTo) {
            const dt = document.getElementById("dateTo");
            if (dt) dt.value = data.dateTo;
        }
    }
);
chrome.storage.local.get(["autoStart", "ipList"], data => {
    if (data.autoStart && data.ipList) {
        chrome.storage.local.set({ autoStart: false });

        const checkBtn = document.querySelector("button[type='submit'], #checkBtn, .check-btn");
        if (checkBtn) checkBtn.click();
    }
});

document.getElementById("apiKey").addEventListener("input", function () {
    chrome.storage.local.set({ apiKey: this.value });
});
document.getElementById("ipList").addEventListener("input", function () {
    chrome.storage.local.set({ ipList: this.value });
});
document.querySelectorAll(".top-tabs .tab").forEach(tab => {
    tab.addEventListener("click", () => {
        const apiKey = document.getElementById("apiKey").value.trim();
        if (apiKey) updateCheckUsage(apiKey);
    });
});


document.getElementById("lookupForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (mapContainer.style.display === "block") {
        mapContainer.style.display = "none";
    }
    const loader = document.getElementById("loader");
    loader.style.display = "block";

    const apiKey = document.getElementById("apiKey").value.trim();
    chrome.storage.local.set({ apiKey });
    const rawInput = document.getElementById("ipList").value;

    const ipList = [
        ...rawInput.matchAll(/\b(?:(?:\d{1,3}(?:\[.\]|\.)){3}\d{1,3}|\[?[A-Fa-f0-9:]+]?)\b/g)
    ]
        .map(match => match[0].replace(/\[\.\]/g, "."))
        .filter((ip, index, self) => self.indexOf(ip) === index);

    if (ipList.length === 0) {
        alert("No valid IP addresses found in the text.");
        return;
    }

    const tableBody = document.querySelector("#resultsTable tbody");
    tableBody.innerHTML = "";
    setButtonDisabled(downloadBtn, true);
    setButtonDisabled(mapBtn, true);

    chrome.storage.local.get(["cachedResults"], async ({ cachedResults = {} }) => {
        const newCache = { ...cachedResults };

        let currentLimit = null;
        let currentRemaining = null;

        for (let ip of ipList) {
            if (currentRemaining !== null && currentRemaining <= 0) {
                alert("API daily check limit exceeded. No more IPs can be processed.");
                break;
            }

            try {
                const abuseRes = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=365`, {
                    headers: { "Key": apiKey, "Accept": "application/json" }
                });
                if (!abuseRes.ok) throw new Error(`API check error: ${abuseRes.status}`);

                currentLimit = parseInt(abuseRes.headers.get("X-RateLimit-Limit"), 10);
                currentRemaining = parseInt(abuseRes.headers.get("X-RateLimit-Remaining"), 10);

                if (currentLimit && currentRemaining !== null) {
                    const used = currentLimit - currentRemaining;
                    document.getElementById("checkUsage").innerText = `${used} / ${currentLimit}`;
                }

                const abuseData = await abuseRes.json();
                const info = abuseData.data;

                const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,as,country,lat,lon,query`);
                const geoData = await geoRes.json();

                const result = { ip, info, geoData };
                newCache[ip] = result;
                tableBody.appendChild(renderRow(result));

            } catch (error) {
                const row = document.createElement("tr");
                const td = document.createElement("td");
                td.colSpan = 12;
                td.innerText = `Error with IP ${ip}: ${error.message}`;
                row.appendChild(td);
                tableBody.appendChild(row);
            }
        }


        chrome.storage.local.set({ cachedResults: newCache });

        const rowsData = [];
        document.querySelectorAll("#resultsTable tbody tr").forEach(row => {
            const cells = Array.from(row.querySelectorAll("td")).map(td => td.innerHTML);
            rowsData.push({
                className: row.className,
                style: row.style.display,
                cells: cells,
                dataset: {
                    ip: row.dataset.ip,
                    city: row.dataset.city,
                    country: row.dataset.country,
                    asn: row.dataset.asn,
                    lat: row.dataset.lat,
                    lon: row.dataset.lon
                }
            });
        });
        chrome.storage.local.set({ resultsData: rowsData });


        if (tableBody.querySelectorAll("tr").length > 0) {
            setButtonDisabled(downloadBtn, false);
            setButtonDisabled(mapBtn, false);
            document.getElementById("filterActions").style.display = "flex";
        }

        loader.style.display = "none";
        updateCheckUsage(apiKey);

        updateSummary();
    });
});

async function updateCheckUsage(apiKey) {
    try {
        const res = await fetch("https://api.abuseipdb.com/api/v2/check?ipAddress=8.8.8.8", {
            headers: { "Key": apiKey, "Accept": "application/json" }
        });

        if (!res.ok) return;

        const limit = res.headers.get("X-RateLimit-Limit");
        const remaining = res.headers.get("X-RateLimit-Remaining");

        if (limit !== null && remaining !== null) {
            const used = parseInt(limit, 10) - parseInt(remaining, 10);
            document.getElementById("checkUsage").innerText = `${used} / ${limit}`;
        }
    } catch (e) {
        console.error("Failed to fetch usage", e);
    }
}



function renderRow(result) {
    const info = result.info;
    const geoData = result.geoData;
    const ip = result.ip;

    const countryName = countryMap[info.countryCode] || info.countryCode || "-";
    const abuseScoreValue = typeof info.abuseConfidenceScore === "number" ? info.abuseConfidenceScore : null;
    const abuseScore = abuseScoreValue !== null ? abuseScoreValue + "%" : "-";
    const hostnames = info.hostnames?.length
        ? info.hostnames.map(h => `<span class="breakable">${h.replace(/([.-])/g, '$1<wbr>')}</span>`).join(", ")
        : "-";
    const domain = info.domain || "-";
    const city = geoData.status === "success" ? (geoData.city || "-") : "-";
    let asn = "-";
    if (geoData.status === "success" && geoData.as) {
        const parts = geoData.as.split(" ");
        asn = parts[0];
    }
    const lat = geoData.status === "success" ? geoData.lat : null;
    const lon = geoData.status === "success" ? geoData.lon : null;
    let lastReported = "-";
    if (info.lastReportedAt) {
        const date = new Date(info.lastReportedAt);
        lastReported = date.toLocaleString("es-ES", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        });
    }

    let scoreClass = "";
    if (abuseScoreValue !== null) {
        if (abuseScoreValue == 0) scoreClass = "score-zero";
        else if (abuseScoreValue >= 1 && abuseScoreValue <= 25) scoreClass = "score-low";
        else if (abuseScoreValue > 25 && abuseScoreValue <= 50) scoreClass = "score-medium";
        else if (abuseScoreValue > 50 && abuseScoreValue <= 74) scoreClass = "score-high";
        else if (abuseScoreValue >= 75) scoreClass = "score-critical";
    }

    const row = document.createElement("tr");
    row.className = scoreClass;
    row.dataset.ip = ip;
    row.dataset.city = city;
    row.dataset.country = countryName;
    row.dataset.asn = asn;
    row.dataset.lat = lat ?? "";
    row.dataset.lon = lon ?? "";

    const cells = [
        { html: `<a href="https://www.abuseipdb.com/check/${ip}" target="_blank" style="color:#000; font-weight:bold; text-decoration:none;">${ip}</a>` },
        { text: abuseScore },
        { text: info.totalReports || 0 },
        { text: lastReported },
        { text: info.isp || "-" },
        { text: info.usageType || "-" },
        { text: countryName },
        { text: city },
        { text: asn },
        { html: hostnames },
        { text: domain }
    ];
    cells.forEach(c => {
        const td = document.createElement("td");
        if (c.html) td.innerHTML = c.html;
        else td.innerText = c.text;
        row.appendChild(td);
    });

    return row;
}


document.getElementById("applyFilter").addEventListener("click", function () {
    const colIndex = parseInt(filterColumn.value, 10);
    if (isNaN(colIndex)) return;
    const rows = document.querySelectorAll("#resultsTable tbody tr");
    let anyVisible = false;
    rows.forEach(row => {
        const cell = row.querySelectorAll("td")[colIndex];
        if (!cell) return;
        const cellText = cell.innerText.trim().toLowerCase();
        let show = true;
        switch (colIndex) {
            case 0: {
                const keyword = document.getElementById("filterValue")?.value.trim();
                if (keyword) show = cellText.startsWith(keyword);
                break;
            }
            case 1:
            case 2: {
                const raw = (document.getElementById("filterValue")?.value || "").trim();
                const cellNum = parseInt(cellText.replace('%', ''), 10);
                if (raw.includes("-")) {
                    const [min, max] = raw.split("-").map(x => parseInt(x.replace('%', '').trim(), 10));
                    show = !isNaN(cellNum) && cellNum >= min && cellNum <= max;
                } else {
                    const m = raw.match(/^(<=|>=|=|<|>)?\s*(\d+)\s*%?$/);
                    if (m) {
                        const op = m[1] || "=";
                        const val = parseInt(m[2], 10);
                        if (!isNaN(cellNum) && !isNaN(val)) {
                            switch (op) {
                                case ">": show = cellNum > val; break;
                                case "<": show = cellNum < val; break;
                                case ">=": show = cellNum >= val; break;
                                case "<=": show = cellNum <= val; break;
                                case "=": default: show = cellNum === val; break;
                            }
                        } else show = false;
                    } else if (raw === "") show = true;
                    else show = false;
                }
                break;
            }
            case 3: {
                const from = document.getElementById("dateFrom")?.value;
                const to = document.getElementById("dateTo")?.value;
                if (from || to) {
                    const cellDate = new Date(cellText.split(",").join(""));
                    if (from && cellDate < new Date(from)) show = false;
                    if (to && cellDate > new Date(to)) show = false;
                }
                break;
            }
            default: {
                const keyword = document.getElementById("filterValue")?.value.trim().toLowerCase();
                if (keyword) show = cellText.includes(keyword);
                break;
            }
        }
        row.style.display = show ? "" : "none";
        if (show) anyVisible = true;
    });
    const tbody = document.querySelector("#resultsTable tbody");
    const noResultRow = document.getElementById("noResultRow");
    const copyBtn = document.getElementById("copyFiltered");
    if (!anyVisible) {
        rows.forEach(row => row.style.display = "none");
        if (!noResultRow) {
            const tr = document.createElement("tr");
            tr.id = "noResultRow";
            const td = document.createElement("td");
            td.colSpan = document.querySelectorAll("#resultsTable thead th").length;
            td.style.textAlign = "center";
            td.style.fontStyle = "italic";
            td.textContent = "No results found";
            tr.appendChild(td);
            tbody.appendChild(tr);
            setButtonDisabled(downloadBtn, true);
            setButtonDisabled(mapBtn, true);
        }
        copyBtn.style.display = "none";
    } else {
        if (noResultRow) noResultRow.remove();
        copyBtn.style.display = "inline-block";
        setButtonDisabled(downloadBtn, false);
        setButtonDisabled(mapBtn, false);
    }
    chrome.storage.local.set({
        filterColumn: document.getElementById("filterColumn").value,
        filterValue: document.getElementById("filterValue")?.value || "",
        dateFrom: document.getElementById("dateFrom")?.value || "",
        dateTo: document.getElementById("dateTo")?.value || ""
    });
    const rowsData = [];
    document.querySelectorAll("#resultsTable tbody tr").forEach(row => {
        const cells = Array.from(row.querySelectorAll("td")).map(td => td.innerHTML);
        rowsData.push({
            className: row.className,
            style: row.style.display,
            cells: cells
        });
    });
    chrome.storage.local.set({ resultsData: rowsData });
    updateSummary();

});

downloadBtn.addEventListener("click", function () {
    const rows = document.querySelectorAll("#resultsTable tbody tr");
    const visibleRows = Array.from(rows).filter(
        r => r.style.display !== "none" && !r.id.includes("noResultRow")
    );
    if (visibleRows.length === 0) {
        alert("No results to download.");
        return;
    }
    let csvContent = "";
    const headers = document.querySelectorAll("#resultsTable thead th");
    const headerRow = Array.from(headers).map(h => `"${h.innerText}"`).join(",");
    csvContent += headerRow + "\n";
    visibleRows.forEach(row => {
        const cols = row.querySelectorAll("td");
        const rowData = Array.from(cols).map(col => `"${col.innerText}"`).join(",");
        csvContent += rowData + "\n";
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ipabuse_results.csv";
    link.click();
});

const filterColumn = document.getElementById("filterColumn");
const filterOptions = document.getElementById("filterOptions");

filterColumn.addEventListener("change", function () {
    const selected = filterColumn.value;
    filterOptions.innerHTML = "";
    if (selected === "") return;
    switch (selected) {
        case "0":
            filterOptions.innerHTML = `<label>IP or Range:</label><br><input type="text" id="filterValue">`;
            break;
        case "1":
        case "2":
            filterOptions.innerHTML = `<label>Value or Range:</label><br><input type="text" id="filterValue" placeholder="Ex: 50, 10-30, >20, <=75">`;
            break;
        case "3":
            filterOptions.innerHTML = `<label>Date Range:</label><br><input type="date" id="dateFrom"> to <input type="date" id="dateTo">`;
            break;
        default:
            filterOptions.innerHTML = `<label>Value:</label><br><input type="text" id="filterValue">`;
            break;
    }
});

document.getElementById("copyFiltered").addEventListener("click", function () {
    const rows = document.querySelectorAll("#resultsTable tbody tr");
    const visibleIps = [];
    rows.forEach(row => {
        if (row.style.display !== "none" && !row.id.includes("noResultRow")) {
            const ipCell = row.querySelector("td");
            if (ipCell) visibleIps.push(ipCell.innerText.trim());
        }
    });
    if (visibleIps.length > 0) {
        navigator.clipboard.writeText(visibleIps.join("\n")).then(() => {
            alert(`${visibleIps.length} IP(s) copied to clipboard`);
        });
    } else {
        alert("No visible IPs to copy.");
    }
});

const headers = document.querySelectorAll("#resultsTable thead th");
let sortState = {};
let originalOrder = [];

function saveOriginalOrder() {
    const tbody = document.querySelector("#resultsTable tbody");
    originalOrder = Array.from(tbody.querySelectorAll("tr")).map(row => {
        return {
            className: row.className,
            style: row.style.display,
            cells: Array.from(row.querySelectorAll("td")).map(td => td.innerHTML)
        };
    });
    chrome.storage.local.set({ originalResultsData: originalOrder });
}

function restoreOriginalOrder() {
    const tbody = document.querySelector("#resultsTable tbody");
    tbody.innerHTML = "";
    if (originalOrder.length > 0) {
        originalOrder.forEach(r => {
            const row = document.createElement("tr");
            if (r.className) row.className = r.className;
            if (r.style) row.style.display = r.style;
            r.cells.forEach(html => {
                const td = document.createElement("td");
                td.innerHTML = html;
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });
    } else {
        chrome.storage.local.get("originalResultsData", data => {
            if (data.originalResultsData) {
                data.originalResultsData.forEach(r => {
                    const row = document.createElement("tr");
                    if (r.className) row.className = r.className;
                    if (r.style) row.style.display = r.style;
                    r.cells.forEach(html => {
                        const td = document.createElement("td");
                        td.innerHTML = html;
                        row.appendChild(td);
                    });
                    tbody.appendChild(row);
                });
            }

        });
    }
}

function sortTable(colIndex) {
    const tbody = document.querySelector("#resultsTable tbody");
    let rows = Array.from(tbody.querySelectorAll("tr")).filter(r => !r.id.includes("noResultRow"));
    if (rows.length === 0) return;
    let state = sortState[colIndex] || "none";
    if (state === "none") state = "asc";
    else if (state === "asc") state = "desc";
    else state = "none";
    sortState = {};
    headers.forEach(th => {
        th.innerText = th.innerText.replace(/[\u2191\u2193\u2194]/g, "");
    });
    sortState[colIndex] = state;
    if (state === "none") {
        restoreOriginalOrder();
        return;
    }
    rows.sort((a, b) => {
        let aText = a.querySelectorAll("td")[colIndex]?.innerText.trim() || "";
        let bText = b.querySelectorAll("td")[colIndex]?.innerText.trim() || "";
        if (colIndex === 0) {
            const aParts = aText.split(".").map(n => parseInt(n, 10));
            const bParts = bText.split(".").map(n => parseInt(n, 10));
            for (let i = 0; i < 4; i++) {
                if ((aParts[i] || 0) < (bParts[i] || 0)) return state === "asc" ? -1 : 1;
                if ((aParts[i] || 0) > (bParts[i] || 0)) return state === "asc" ? 1 : -1;
            }
            return 0;
        }
        function parseSpanishDate(str) {
            const [datePart, timePart] = str.split(" ");
            if (!datePart) return new Date("Invalid");
            const [day, month, year] = datePart.split("/").map(n => parseInt(n, 10));
            let h = 0, m = 0, s = 0;
            if (timePart) [h, m, s] = timePart.split(":").map(n => parseInt(n, 10));
            return new Date(year, month - 1, day, h, m, s);
        }
        if (colIndex === 3) {
            const aDate = parseSpanishDate(aText);
            const bDate = parseSpanishDate(bText);
            if (aDate < bDate) return state === "asc" ? -1 : 1;
            if (aDate > bDate) return state === "asc" ? 1 : -1;
            return 0;
        }
        let aVal = aText.replace("%", "");
        let bVal = bText.replace("%", "");
        if (!isNaN(aVal) && !isNaN(bVal) && aVal !== "" && bVal !== "") {
            aVal = parseFloat(aVal);
            bVal = parseFloat(bVal);
        }
        if (aVal < bVal) return state === "asc" ? -1 : 1;
        if (aVal > bVal) return state === "asc" ? 1 : -1;
        return 0;
    });
    tbody.innerHTML = "";
    rows.forEach(r => tbody.appendChild(r));
    if (state === "asc") headers[colIndex].innerText += " ↑";
    if (state === "desc") headers[colIndex].innerText += " ↓";
}

headers.forEach((th, i) => {
    th.style.cursor = "pointer";
    th.addEventListener("click", () => sortTable(i));
});



const mapContainer = document.getElementById("mapContainer");
let leafletMap = null;
let landVectorLayer = null;
let landDataLoaded = false;


function removeAllTileLayers(map) {
    map.eachLayer(layer => {
        if (layer instanceof L.GridLayer) map.removeLayer(layer);
    });
}

mapBtn.addEventListener("click", () => {
    if (mapContainer.style.display === "none") {
        mapContainer.style.display = "block";

        if (!leafletMap) {
            leafletMap = L.map("mapContainer").setView([20, 0], 2);

            leafletMap.createPane("paneDarken");
            leafletMap.getPane("paneDarken").style.zIndex = 350;
            leafletMap.createPane("paneLand");
            leafletMap.getPane("paneLand").style.zIndex = 400;
            leafletMap.createPane("paneLabels");
            leafletMap.getPane("paneLabels").style.zIndex = 500;

            const oceanDark = L.gridLayer({ pane: "paneDarken" });
            oceanDark.createTile = function (_, done) {
                const tile = document.createElement("div");
                tile.style.width = "256px";
                tile.style.height = "256px";
                tile.style.background = "#000";
                tile.style.opacity = "0.72";

                return tile;
            };


            const darkBase = L.tileLayer(
                "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
                { subdomains: "abcd", maxZoom: 20, className: "tiles-dark-base" }
            );

            async function ensureLandVectorLoaded() {
                if (landDataLoaded) return;

                const resp = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json");
                const topo = await resp.json();
                const geo = topojson.feature(topo, topo.objects.land);

                landVectorLayer = L.geoJSON(geo, {
                    pane: "paneLand",
                    style: {
                        fillColor: "#6e6e6e",
                        color: "#6e6e6e",
                        opacity: 1,
                        weight: 0,
                        fillOpacity: 1
                    }
                });
                landDataLoaded = true;
            }





            const darkLabels = L.tileLayer(
                "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
                { subdomains: "abcd", maxZoom: 20, className: "tiles-dark-labels", pane: "paneLabels" }
            );


            const lightTiles = L.tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                { maxZoom: 19, attribution: "© OpenStreetMap" }
            );


            async function updateMapTheme() {
                if (!leafletMap) return;

                removeAllTileLayers(leafletMap);

                const isDark = document.body.classList.contains("dark");
                if (isDark) {

                    darkBase.addTo(leafletMap);

                    oceanDark.addTo(leafletMap);

                    await ensureLandVectorLoaded();
                    if (landVectorLayer && !leafletMap.hasLayer(landVectorLayer)) {
                        landVectorLayer.addTo(leafletMap);
                    }

                    darkLabels.addTo(leafletMap);
                } else {

                    lightTiles.addTo(leafletMap);

                    if (landVectorLayer && leafletMap.hasLayer(landVectorLayer)) {
                        leafletMap.removeLayer(landVectorLayer);
                    }
                }
            }


            window.__updateMapTheme = updateMapTheme;


            updateMapTheme();


            darkToggle.addEventListener("change", updateMapTheme);


            const legend = L.control({ position: "topright" });
            legend.onAdd = function () {
                const div = L.DomUtil.create("div", "legend");
                div.innerHTML = `
          <div class="item"><span class="color-box" style="background:#95a5a6"></span>0%</div>
          <div class="item"><span class="color-box" style="background:#2ecc71"></span>1–25%</div>
          <div class="item"><span class="color-box" style="background:#f1c40f"></span>26–50%</div>
          <div class="item"><span class="color-box" style="background:#e67e22"></span>51–74%</div>
          <div class="item"><span class="color-box" style="background:#e74c3c"></span>75–100%</div>
        `;
                return div;
            };
            legend.addTo(leafletMap);
        }

        setTimeout(() => {
            leafletMap.invalidateSize();
            mapContainer.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);


        leafletMap.eachLayer(layer => {
            if (layer instanceof L.Marker) leafletMap.removeLayer(layer);
        });

        const rows = Array.from(document.querySelectorAll("#resultsTable tbody tr"))
            .filter(r => r.style.display !== "none" && !r.id.includes("noResultRow"));

        const markers = rows.map(row => {
            const ip = row.dataset.ip || row.querySelector("td")?.innerText || "-";
            const lat = parseFloat(row.dataset.lat);
            const lon = parseFloat(row.dataset.lon);
            const city = row.dataset.city || "-";
            const country = row.dataset.country || "-";
            const asn = row.dataset.asn || "-";
            const isp = row.querySelectorAll("td")[4]?.innerText || "-";
            const usageType = row.querySelectorAll("td")[5]?.innerText || "-";
            const lastReported = row.querySelectorAll("td")[3]?.innerText || "-";
            const abuseScore = parseInt((row.querySelectorAll("td")[1]?.innerText || "").replace("%", ""), 10) || 0;

            if (!isNaN(lat) && !isNaN(lon)) {
                const popupContent = `
          <div class="popup-content">
            <div class="popup-ip">
              <a href="https://www.abuseipdb.com/check/${ip}" target="_blank" style="color:#004085; font-weight:bold; text-decoration:none;">
                ${ip}
              </a>
            </div>
            <div class="popup-location">${city}, ${country}</div>
            <div class="popup-detail"><b>ASN:</b> ${asn}</div>
            <div class="popup-detail"><b>ISP:</b> ${isp}</div>
            <div class="popup-detail"><b>Usage:</b> ${usageType}</div>
            <div class="popup-detail"><b>Last Reported:</b> ${lastReported}</div>
            <div class="popup-detail"><b>Abuse Score:</b> ${abuseScore}%</div>
          </div>
        `;
                L.marker([lat, lon], { icon: createCustomIcon(abuseScore) })
                    .addTo(leafletMap)
                    .bindPopup(popupContent);
                return [lat, lon];
            }
            return null;
        }).filter(p => p);

        if (markers.length > 0) {
            const bounds = L.latLngBounds(markers);
            leafletMap.fitBounds(bounds, { padding: [30, 30] });
        }
    } else {
        mapContainer.style.display = "none";
    }
});


function getMarkerColor(score) {
    if (score === 0) return "#95a5a6";
    if (score >= 1 && score <= 25) return "#2ecc71";
    if (score > 25 && score <= 50) return "#f1c40f";
    if (score > 50 && score <= 74) return "#e67e22";
    if (score >= 75) return "#e74c3c";
    return "#95a5a6";
}

function createCustomIcon(score) {
    const color = getMarkerColor(score);
    return L.divIcon({
        className: "",
        html: `<div class="custom-marker" style="--color:${color}"></div>`,
        iconSize: [22, 30],
        iconAnchor: [11, 30],
        popupAnchor: [0, -28]
    });
}


function updateSummary() {
    const box = document.getElementById("summaryBox");
    const rows = Array.from(document.querySelectorAll("#resultsTable tbody tr"))
        .filter(r => r.style.display !== "none" && !r.id.includes("noResultRow"));

    const total = rows.length;
    if (total === 0) {
        box.style.display = "none";
        box.innerHTML = "";
        return;
    }

    const pct = (n) => Math.round((n / total) * 100);
    const THRESHOLD = 0.20; // 20%

    let lines = [];

    // ========== Countries ==========
    const countsCountry = new Map();
    rows.forEach(r => {
        const country = (r.dataset.country || r.querySelectorAll("td")[6]?.innerText || "-").trim();
        countsCountry.set(country, (countsCountry.get(country) || 0) + 1);
    });
    const sortedCountries = [...countsCountry.entries()].sort((a, b) => b[1] - a[1]);
    const topCountry = sortedCountries[0];
    const ratioTopCountry = topCountry ? topCountry[1] / total : 0;

    if (ratioTopCountry > 0.5) {
        lines.push(`Most ips come from <b>${topCountry[0]}</b>`);
    } else {
        const cands = sortedCountries.filter(([_, c]) => c / total >= 0.33).map(([n]) => n);
        if (cands.length >= 2) lines.push(`Some ips come from <b>${cands[0]}</b> and <b>${cands[1]}</b>`);
        else if (cands.length === 1) lines.push(`Some ips come from <b>${cands[0]}</b>`);
    }

    // ========== Usage type ==========
    const countsUsage = new Map();
    rows.forEach(r => {
        const usage = (r.querySelectorAll("td")[5]?.innerText || "-").trim();
        countsUsage.set(usage, (countsUsage.get(usage) || 0) + 1);
    });
    const sortedUsage = [...countsUsage.entries()].sort((a, b) => b[1] - a[1]);
    const topUsage = sortedUsage[0];
    const ratioTopUsage = topUsage ? topUsage[1] / total : 0;
    if (ratioTopUsage > 0.5) lines.push(`Most ips are used for <b>${topUsage[0]}</b>`);
    else if (ratioTopUsage >= 0.25) lines.push(`Some ips are used for <b>${topUsage[0]}</b>`);

    // ========== ISP ==========
    const countsIsp = new Map();
    rows.forEach(r => {
        const isp = (r.querySelectorAll("td")[4]?.innerText || "-").trim();
        countsIsp.set(isp, (countsIsp.get(isp) || 0) + 1);
    });
    const sortedIsp = [...countsIsp.entries()].sort((a, b) => b[1] - a[1]);
    const topIsp = sortedIsp[0];
    const ratioTopIsp = topIsp ? topIsp[1] / total : 0;
    if (ratioTopIsp > 0.5) lines.push(`Most ips belong to <b>${topIsp[0]}</b>`);
    else {
        const ispCands = sortedIsp.filter(([_, c]) => c / total >= 0.33).map(([n]) => n);
        if (ispCands.length >= 2) lines.push(`Some ips belong to <b>${ispCands[0]}</b> and <b>${ispCands[1]}</b>`);
        else if (ispCands.length === 1) lines.push(`Some ips belong to <b>${ispCands[0]}</b>`);
    }


    const counts24 = new Map();
    const counts16 = new Map();
    const ipv4re = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

    rows.forEach(r => {

        let ip = (r.dataset.ip || r.querySelector("td")?.innerText || "").trim();
        ip = ip.replace(/[^\d.]/g, "").replace(/\.+$/g, "");
        const m = ip.match(ipv4re);
        if (!m) return;
        const pre24 = `${m[1]}.${m[2]}.${m[3]}.*`;
        const pre16 = `${m[1]}.${m[2]}.*.*`;
        counts24.set(pre24, (counts24.get(pre24) || 0) + 1);
        counts16.set(pre16, (counts16.get(pre16) || 0) + 1);
    });

    const hot24 = [...counts24.entries()]
        .filter(([_, c]) => c / total >= THRESHOLD)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    const hot16 = [...counts16.entries()]
        .filter(([_, c]) => c / total >= THRESHOLD)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    if (hot24.length) {
        const txt = hot24.map(([p, c]) => `<b>${p}</b> (${pct(c)}%)`).join(", ");
        lines.push(`Repeated /24 prefixes: ${txt}`);
    }
    if (hot16.length) {
        const txt = hot16.map(([p, c]) => `<b>${p}</b> (${pct(c)}%)`).join(", ");
        lines.push(`Repeated /16 prefixes: ${txt}`);
    }

    // ===== Render =====
    if (lines.length === 0) {
        box.style.display = "none";
        box.innerHTML = "";
        return;
    }
    box.innerHTML = `<ul class="summary-list">${lines.map(li => `<li>${li}</li>`).join("")}</ul>`;
    box.style.display = "block";
    document.addEventListener('input', e => {
        if (e.target && (e.target.id === 'filterValue' || e.target.id === 'dateFrom' || e.target.id === 'dateTo')) {
            chrome.storage.local.set({
                csvFilterValues: {
                    value: document.getElementById('filterValue')?.value || '',
                    dateFrom: document.getElementById('dateFrom')?.value || '',
                    dateTo: document.getElementById('dateTo')?.value || ''
                }
            });
        }
    });

}