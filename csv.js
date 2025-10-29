(function () {
    const btn = document.getElementById("btnUploadCsv");
    const input = document.getElementById("fileCsv");
    const csvTable = document.getElementById("csvTable");
    const csvThead = csvTable.querySelector("thead");
    const csvTbody = csvTable.querySelector("tbody");
    const columnSelect = document.getElementById("columnSelect");
    const processColumnBtn = document.getElementById("processColumnBtn");

    // ========= Utilitiees =========

    function parseCSV(text) {
        const rows = [];
        let i = 0, field = "", row = [], inQuotes = false;
        while (i < text.length) {
            const c = text[i];
            if (inQuotes) {
                if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
                if (c === '"') { inQuotes = false; i++; continue; }
                field += c; i++; continue;
            } else {
                if (c === ",") { row.push(field); field = ""; i++; continue; }
                if (c === '"') { inQuotes = true; i++; continue; }
                if (c === "\r") { i++; continue; }
                if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; i++; continue; }
                field += c; i++; continue;
            }
        }
        row.push(field); rows.push(row);
        if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") rows.pop();
        return rows;
    }

    function extractIP(text) {
        if (!text) return null;

        const ipv4Regex = /\b(?:(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?:\.(?!$)|$)){4}\b/;

        const ipv6Regex = /\b(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\b/;

        let match = text.match(ipv4Regex);
        if (match) return match[0];

        match = text.match(ipv6Regex);
        if (match) return match[0];

        return null;
    }



    function renderTableFromCSV(rows) {
        if (!rows || !rows.length) return;

        const headers = rows[0];
        csvThead.innerHTML = "";
        const trh = document.createElement("tr");
        headers.forEach(h => {
            const th = document.createElement("th");
            th.textContent = h;
            trh.appendChild(th);
        });
        csvThead.appendChild(trh);

        csvTbody.innerHTML = "";
        for (let r = 1; r < Math.min(rows.length, 8); r++) {
            const tr = document.createElement("tr");
            rows[r].forEach(val => {
                const td = document.createElement("td");
                td.innerText = val;
                td.title = val;
                tr.appendChild(td);
            });
            csvTbody.appendChild(tr);
        }

        columnSelect.innerHTML = "";
        headers.forEach((h, colIndex) => {
            const hasIp = rows.some((row, rIndex) => {
                if (rIndex === 0) return false;
                return extractIP(row[colIndex]) !== null;
            });

            if (hasIp) {
                const opt = document.createElement("option");
                opt.value = h;
                opt.dataset.colIndex = colIndex;
                opt.textContent = h;
                columnSelect.appendChild(opt);
            }
        });

        chrome.storage.local.get("csvSelectedColumn", data => {
            if (data.csvSelectedColumn && headers.includes(data.csvSelectedColumn)) {
                columnSelect.value = data.csvSelectedColumn;
            }
        });

        document.getElementById("columnProcessor").style.display = "block";
    }



    btn.addEventListener("click", () => {
        input.value = "";
        input.click();
    });

    input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = reader.result;
                const rows = parseCSV(text);
                renderTableFromCSV(rows);
                chrome.storage.local.set({ csvProcessorData: rows });
            } catch (e) {
                alert("Error al procesar el CSV.");
            }
        };
        reader.readAsText(file);
    });

    columnSelect.addEventListener("change", () => {
        chrome.storage.local.set({ csvSelectedColumn: columnSelect.value });
    });

    processColumnBtn.addEventListener("click", () => {
        const selectedOpt = columnSelect.options[columnSelect.selectedIndex];
        if (!selectedOpt) return;
        const colIndex = parseInt(selectedOpt.dataset.colIndex, 10);
        if (isNaN(colIndex)) return;

        const ips = [];
        csvTbody.querySelectorAll("tr").forEach(tr => {
            const cell = tr.children[colIndex];
            if (cell) {
                const ip = extractIP(cell.textContent);
                if (ip) ips.push(ip);
            }
        });

        const uniqueIps = [...new Set(ips)];

        if (uniqueIps.length === 0) {
            alert("The selected column does not contain valid IPs.");
            return;
        }

        chrome.storage.local.set(
            { ipList: uniqueIps.join("\n"), autoStart: true, csvSelectedColumn: selectedOpt.value },
            () => { window.location.href = "popup.html"; }
        );
    });


    chrome.storage.local.get(["csvProcessorData", "csvSelectedColumn"], data => {
        if (data.csvProcessorData) {
            renderTableFromCSV(data.csvProcessorData);
            if (data.csvSelectedColumn) {
                columnSelect.value = data.csvSelectedColumn;
            }
        }
    });
})();



// ========= Dark Mode Toggle =========
function wireDarkToggle() {
    const darkToggle = document.getElementById("darkModeToggle");
    if (!darkToggle) return;
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
    });
}

wireDarkToggle();
document.addEventListener("DOMContentLoaded", wireDarkToggle);


document.addEventListener("click", (e) => {
    let td = null;

    if (e.target.tagName === "TD") {
        td = e.target;
    } else if (e.target.closest("td")) {
        td = e.target.closest("td");
    }

    if (!td) return;

    if (td.classList.contains("expanded")) {
        td.classList.remove("expanded");
        return;
    }

    document.querySelectorAll("#csvTable td.expanded").forEach(cell => {
        cell.classList.remove("expanded");
    });

    td.classList.add("expanded");
});

