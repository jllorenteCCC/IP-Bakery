# IP Bakery

**IP Bakery** is a Google Chrome extension designed to simplify the process of checking multiple IP addresses using the [AbuseIPDB](https://www.abuseipdb.com/) API.  
It automates queries, displays results in a clear table, and provides filtering and exporting options, improving the workflow for system administrators, security analysts, and SOC teams.  

---

## Main Features

### Bulk IP Lookup
- Allows entering one or multiple IP addresses in a text area.  
- Processes all IPs in seconds through the AbuseIPDB API.  
- Eliminates the need to manually check each IP on the website.  

### Interactive Results Table
- Displays results in a table with the following columns:  
  - IP Address  
  - Abuse Confidence Score  
  - Total Reports (last 365 days)  
  - Last Reported  
  - ISP  
  - Usage Type  
  - Country / City  
  - ASN  
  - Hostnames  
  - Domain  

- Clickable headers to sort results by IP, score, reports, dates, etc.  
- Risk-based color coding:  
  - No risk (0%)  
  - Low risk (1–25%)  
  - Medium risk (26–50%)  
  - High risk (51–74%)  
  - Critical risk (75–100%)  
- IP addresses are clickable and open directly in AbuseIPDB.  

### Advanced Filters
- Filter results by:  
  - Specific column (e.g., country, ISP, score).  
  - Numeric ranges (e.g., `>50`, `10-30`, `<=75`).  
  - Date range for the *Last Reported* field.  
- Filters can be applied without losing data.  
- Option to copy only the filtered IPs to the clipboard.  

### Data Persistence
- The extension automatically saves:  
  - API Key.  
  - IP list.  
  - Results table.  
  - Applied filters.  
- Data is preserved even after closing and reopening Chrome.  

### Export Options
- Export results as a CSV file.  
- Only visible rows (after filtering) are included in the export.  

### User Interface
- Clean, responsive design with a structured layout.  
- Clear separation between input form, filters, and results.  
- Risk-based colors for fast visual analysis.  
- Loading spinner displayed while queries are processed.  

### Dark / Light Mode
- Toggle between dark and light mode from the header.  
- White sun and moon icons next to the switch.  
- Dark mode includes:  
  - Dark backgrounds.  
  - Light gray text for readability.  
  - Adjusted table colors for each risk level.  

---

## Project Structure
- `manifest.json` → Extension configuration.  
- `popup.html` → Main UI structure.  
- `popup.css` → Styles for light/dark mode and score-based colors.  
- `popup.js` → Core logic: API queries, filtering, storage, CSV export, etc.  
- `background.js` → Handles extension popup window creation.  
- `/Images/` → Logos and icons.  

---

## Installation and Usage
1. Clone the repository.  
2. In Chrome, go to `chrome://extensions/`.  
3. Enable **Developer Mode**.  
4. Click **Load unpacked** and select the project folder.  
5. Enter your AbuseIPDB **API Key** in the form.  
6. Paste one or multiple IPs.  
7. Click **Check** to query AbuseIPDB.  
8. Filter, sort, copy, or export the results as needed.  

---

## Benefits
- Saves time compared to manual IP lookups.  
- Provides centralized management of abuse report data.  
- Helps prioritize risks and detect malicious IPs.  
- Easy export of results for reporting or integration with other tools.  

---

## Future Improvements
- Support for additional threat intelligence APIs.
- Being able to process .csv files and select which column of IPs to process
- Integration with Splunk or ELK stack for automated ingestion.  
