// map.js
function colorByScore(s) {
    if (s === 0) return "#95a5a6";      // gris
    if (s <= 25) return "#2ecc71";      // verde
    if (s <= 50) return "#f1c40f";      // amarillo
    if (s <= 74) return "#e67e22";      // naranja
    return "#e74c3c";                   // rojo
}

document.addEventListener("DOMContentLoaded", () => {
    const map = L.map("map", { zoomControl: true }).setView([20, 0], 2);

    // Capa de teselas OSM
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a target="_blank" href="https://www.openstreetmap.org/copyright">OSM</a>'
    }).addTo(map);

    chrome.storage.local.get("mapMarkers", ({ mapMarkers = [] }) => {
        const layers = [];

        (mapMarkers || []).forEach(m => {
            if (isNaN(m.lat) || isNaN(m.lon)) return;

            const html = `<div class="pin" style="--color:${colorByScore(m.abuseScore)}"></div>`;
            const icon = L.divIcon({
                className: "", html, iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -20]
            });

            const popup = `
            <div class="popup-content">
                <div class="popup-ip">${m.ip}</div>
                <div class="popup-location">${m.city}, ${m.country}</div>
                <div class="popup-detail"><b>ASN:</b> ${m.asn}</div>
                <div class="popup-detail"><b>ISP:</b> ${m.isp}</div>
                <div class="popup-detail"><b>Abuse:</b> ${m.abuseScore}% &nbsp; | &nbsp; <b>Reports:</b> ${m.totalReports}</div>
                <div class="popup-detail"><b>Last:</b> ${m.lastReported}</div>
            </div>
            `;


            const marker = L.marker([m.lat, m.lon], { icon }).bindPopup(popup);
            marker.addTo(map);
            layers.push(marker);
        });

        if (layers.length) {
            const group = L.featureGroup(layers);
            map.fitBounds(group.getBounds().pad(0.2));
        } else {
            map.setView([20, 0], 2);
        }
    });
});
