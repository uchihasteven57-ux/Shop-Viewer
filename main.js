const { SHEET_CSV_URL, DEFAULT_CENTER, DEFAULT_ZOOM } = window.CONFIG;

let data = [];
let groupedView = false;

// Map init
const map = L.map("map").setView(DEFAULT_CENTER, DEFAULT_ZOOM);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
}).addTo(map);

// DOM elements
const shopListEl = document.getElementById("shopList");
const toggleViewBtn = document.getElementById("groupByBtn");
const viewAllBtn = document.getElementById("viewAllBtn");

// CSV fetch
async function fetchCsv(url) {
  const u = new URL(url);
  u.searchParams.set("ts", Date.now()); // cache‑buster
  const res = await fetch(u, { mode: "cors", cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.text()).replace(/^\uFEFF/, "");
}

// CSV parse to objects
function parseCSV(text) {
  const rows = text.split("\n").map(r => r.split(","));
  const [headers, ...body] = rows;
  return body
    .filter(r => r.some(val => val.trim() !== ""))
    .map(r => Object.fromEntries(headers.map((h, i) => [h.trim(), (r[i] || "").trim()])));
}

// Rating style helper
function ratingClass(rating) {
  const val = parseFloat(rating);
  if (!isNaN(val)) {
    if (val >= 4) return "rating-high";
    if (val >= 2.5) return "rating-medium";
    return "rating-low";
  }
  return "";
}

// Marker + list rendering
function renderList(items) {
  shopListEl.innerHTML = "";
  items.forEach(obj => {
    const { Latitude, Longitude } = obj;
    if (Latitude && Longitude) {
      const marker = L.marker([parseFloat(Latitude), parseFloat(Longitude)])
        .addTo(map)
        .bindPopup(`<strong>${obj["Shop Name"] || "Unnamed Shop"}</strong><br>${obj["Address"] || ""}`);
    }

    const card = document.createElement("li");
    card.className = `card ${ratingClass(obj["Rating"])}`;
    card.innerHTML = `
      <strong>${obj["Shop Name"] || "Unnamed Shop"}</strong><br/>
      <em>Rating: ${obj["Rating"] || "N/A"}</em><br/>
      ${obj["Address"] || ""}<br/>
      ${obj["Phone"] || ""}
    `;
    shopListEl.appendChild(card);
  });
}

function renderGroupedByRating(items) {
  shopListEl.innerHTML = "";
  const groups = {};
  items.forEach(obj => {
    const rating = obj["Rating"] || "No Rating";
    if (!groups[rating]) groups[rating] = [];
    groups[rating].push(obj);
  });

  Object.keys(groups)
    .sort((a, b) => parseFloat(b) - parseFloat(a))
    .forEach(rating => {
      const groupHeader = document.createElement("h3");
      groupHeader.textContent = `Rating: ${rating}`;
      shopListEl.appendChild(groupHeader);

      groups[rating].forEach(obj => {
        const { Latitude, Longitude } = obj;
        if (Latitude && Longitude) {
          L.marker([parseFloat(Latitude), parseFloat(Longitude)])
            .addTo(map)
            .bindPopup(`<strong>${obj["Shop Name"] || "Unnamed Shop"}</strong><br>${obj["Address"] || ""}`);
        }

        const card = document.createElement("li");
        card.className = `card ${ratingClass(obj["Rating"])}`;
        card.innerHTML = `
          <strong>${obj["Shop Name"] || "Unnamed Shop"}</strong><br/>
          <em>Rating: ${obj["Rating"] || "N/A"}</em><br/>
          ${obj["Address"] || ""}<br/>
          ${obj["Phone"] || ""}
        `;
        shopListEl.appendChild(card);
      });
    });
}

// Buttons
toggleViewBtn.addEventListener("click", () => {
  groupedView = !groupedView;
  toggleViewBtn.textContent = groupedView ? "Show Flat List" : "Group by Rating";
  map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });
  groupedView ? renderGroupedByRating(data) : renderList(data);
});

viewAllBtn.addEventListener("click", () => {
  if (!data.length) return;
  const bounds = L.latLngBounds(
    data
      .filter(d => d.Latitude && d.Longitude)
      .map(d => [parseFloat(d.Latitude), parseFloat(d.Longitude)])
  );
  map.fitBounds(bounds);
});

// Load data + render
(async () => {
  try {
    const csvText = await fetchCsv(SHEET_CSV_URL);
    data = parseCSV(csvText);
    renderList(data);
  } catch (err) {
    console.error("Unable to load data:", err);
  }
})();
