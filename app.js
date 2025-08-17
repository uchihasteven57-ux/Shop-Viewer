// app.js
const {
  SHEET_CSV_URL,
  DEFAULT_CENTER = [16.8409, 96.1735],
  DEFAULT_ZOOM = 12
} = window.CONFIG || {};

const state = {
  allShops: [],
  filteredShops: [],
  selectedShop: null,
  minRating: 0, // filter (min)
  groupRatings: new Set([5, 4, 3, 2, 1, 0]),
  view: "map" // 'map' | 'detail'
};

let map, detailMap, markersLayer, boundsAll;

// Marker colors per rating
const ratingColors = {
  5: "#10b981", // green
  4: "#22d3ee", // cyan
  3: "#3b82f6", // blue
  2: "#f59e0b", // orange
  1: "#ef4444", // red
  0: "#9ca3af"  // gray
};

// UI elements
const el = {
  allShopsBtn: document.getElementById("allShopsBtn"),
  shopList: document.getElementById("shopList"),
  searchInput: document.getElementById("searchInput"),
  mapView: document.getElementById("mapView"),
  detailView: document.getElementById("detailView"),
  detailImage: document.getElementById("detailImage"),
  detailName: document.getElementById("detailName"),
  detailRating: document.getElementById("detailRating"),
  detailCategory: document.getElementById("detailCategory"),
  detailAddress: document.getElementById("detailAddress"),
  detailPhone: document.getElementById("detailPhone"),
  detailDescription: document.getElementById("detailDescription"),
  backToList: document.getElementById("backToList"),
  filterBtn: document.getElementById("filterBtn"),
  groupBtn: document.getElementById("groupBtn"),
  viewAllBtn: document.getElementById("viewAllBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  filterDialog: document.getElementById("filterDialog"),
  groupDialog: document.getElementById("groupDialog"),
  legend: document.getElementById("legend"),
  installBtn: document.getElementById("installBtn"),
};

let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  el.installBtn.style.display = "block";
});
el.installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  el.installBtn.style.display = "none";
});

// Init
window.addEventListener("DOMContentLoaded", async () => {
  if (!SHEET_CSV_URL || SHEET_CSV_URL.includes("REPLACE_WITH")) {
    alert("Please set CONFIG.SHEET_CSV_URL in index.html to your published CSV URL.");
  }
  initMap();
  await loadData();
  wireUI();
  renderAll();
  registerSW();
});

function initMap() {
  map = L.map("map", { zoomControl: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

function initDetailMap() {
  if (detailMap) {
    detailMap.remove();
  }
  detailMap = L.map("detailMap", { zoomControl: false, attributionControl: false });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(detailMap);
}

async function loadData() {
  try {
    const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    const csv = await res.text();
    const rows = parseCSV(csv);
    const shops = normalizeRows(rows);
    // keep last dataset offline
    localStorage.setItem("shops_csv_cache", csv);
    applyData(shops);
  } catch (e) {
    console.warn("Fetch failed, trying cache", e);
    const cached = localStorage.getItem("shops_csv_cache");
    if (cached) {
      const rows = parseCSV(cached);
      const shops = normalizeRows(rows);
      applyData(shops);
    } else {
      alert("Unable to load data. Please check your internet connection and CSV URL.");
    }
  }
}

function applyData(shops) {
  state.allShops = shops.filter(s => isFinite(s.lat) && isFinite(s.lng));
  state.filteredShops = [...state.allShops];
  // Sort by name
  state.allShops.sort((a, b) => a.name.localeCompare(b.name));
  state.filteredShops.sort((a, b) => a.name.localeCompare(b.name));
}

function renderAll() {
  renderList();
  renderMap();
  renderLegend();
  showMapView();
}

function renderList() {
  const query = (el.searchInput.value || "").toLowerCase();
  const list = state.filteredShops.filter(s =>
    s.name.toLowerCase().includes(query) ||
    (s.category && s.category.toLowerCase().includes(query)) ||
    (s.address && s.address.toLowerCase().includes(query))
  );

  el.shopList.innerHTML = "";
  for (const shop of list) {
    const tile = document.createElement("div");
    tile.className = "shop-tile";
    tile.title = shop.name;
    tile.addEventListener("click", () => openDetail(shop));

    const avatar = document.createElement("div");
    avatar.className = "shop-avatar";
    avatar.style.background = gradientForRating(shop.rating);
    avatar.textContent = initials(shop.name);

    const info = document.createElement("div");
    info.className = "shop-info";
    const name = document.createElement("div");
    name.className = "shop-name";
    name.textContent = shop.name;
    const meta = document.createElement("div");
    meta.className = "shop-meta";
    meta.innerHTML = `${renderStarsInline(shop.rating)} • ${shop.category || "—"}`;

    info.appendChild(name);
    info.appendChild(meta);
    tile.appendChild(avatar);
    tile.appendChild(info);

    el.shopList.appendChild(tile);
  }
}

function renderMap() {
  markersLayer.clearLayers();
  const visible = state.filteredShops.filter(s => state.groupRatings.has(ratingBucket(s.rating)));
  if (!visible.length) return;

  boundsAll = L.latLngBounds();

  for (const shop of visible) {
    const color = colorForRating(shop.rating);
    const marker = L.circleMarker([shop.lat, shop.lng], {
      radius: 8,
      color,
      weight: 2,
      opacity: 0.9,
      fillColor: color,
      fillOpacity: 0.6
    })
    .on("click", () => openDetail(shop))
    .bindTooltip(`${escapeHtml(shop.name)} (${renderStarsText(shop.rating)})`, { direction: "top" });

    marker.addTo(markersLayer);
    boundsAll.extend([shop.lat, shop.lng]);
  }

  if (boundsAll.isValid()) {
    map.fitBounds(boundsAll.pad(0.2));
  } else {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  }
}

function renderLegend() {
  const groups = [5, 4, 3, 2, 1, 0];
  el.legend.innerHTML = groups.map(g => {
    const color = ratingColors[g];
    const label = g === 0 ? "unrated" : `${g}★`;
    const active = state.groupRatings.has(g) ? "" : "opacity:0.3;";
    return `<div class="row" style="${active}"><span class="dot" style="background:${color}"></span> ${label}</div>`;
  }).join("");
}

function openDetail(shop) {
  state.selectedShop = shop;
  el.detailName.textContent = shop.name;
  el.detailCategory.textContent = shop.category || "";
  el.detailAddress.textContent = shop.address || "";
  el.detailPhone.textContent = shop.phone || "";
  el.detailDescription.textContent = shop.description || "";
  el.detailImage.src = shop.imageURL || "";
  el.detailImage.alt = shop.name;
  el.detailImage.style.display = shop.imageURL ? "block" : "none";
  el.detailRating.innerHTML = renderStarsInline(shop.rating);

  initDetailMap();
  detailMap.setView([shop.lat, shop.lng], 16);
  L.circleMarker([shop.lat, shop.lng], {
    radius: 10,
    color: colorForRating(shop.rating),
    weight: 3,
    fillColor: colorForRating(shop.rating),
    fillOpacity: 0.6
  }).addTo(detailMap);

  showDetailView();
}

function showMapView() {
  state.view = "map";
  el.mapView.classList.remove("hidden");
  el.detailView.classList.add("hidden");
  el.allShopsBtn.classList.add("active");
}

function showDetailView() {
  state.view = "detail";
  el.mapView.classList.add("hidden");
  el.detailView.classList.remove("hidden");
  el.allShopsBtn.classList.remove("active");
}

// Events
function wireUI() {
  el.allShopsBtn.addEventListener("click", () => showMapView());
  el.backToList.addEventListener("click", () => showMapView());
  el.searchInput.addEventListener("input", applyFilters);

  el.viewAllBtn.addEventListener("click", () => {
    showMapView();
    if (boundsAll && boundsAll.isValid()) {
      map.fitBounds(boundsAll.pad(0.2));
    }
  });

  // Filter dialog
  el.filterBtn.addEventListener("click", () => el.filterDialog.showModal());
  el.filterDialog.addEventListener("close", () => {
    if (el.filterDialog.returnValue === "apply") {
      const selected = [...el.filterDialog.querySelectorAll("input[name='minRating']")]
        .find(r => r.checked)?.value || "0";
      state.minRating = parseInt(selected, 10);
      applyFilters();
    }
  });

  // Group dialog
  el.groupBtn.addEventListener("click", () => el.groupDialog.showModal());
  el.groupDialog.addEventListener("close", () => {
    if (el.groupDialog.returnValue === "apply") {
      const checks = [...el.groupDialog.querySelectorAll("input[name='groups']")];
      const selected = checks.filter(c => c.checked).map(c => parseInt(c.value, 10));
      state.groupRatings = new Set(selected);
      renderMap();
      renderLegend();
    }
  });

  // Download
  el.downloadBtn.addEventListener("click", downloadCSV);
}

// Filtering logic
function applyFilters() {
  const query = (el.searchInput.value || "").toLowerCase();
  state.filteredShops = state.allShops
    .filter(s => (isNaN(state.minRating) ? true : s.rating >= state.minRating))
    .filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.category && s.category.toLowerCase().includes(query)) ||
      (s.address && s.address.toLowerCase().includes(query))
    );
  renderList();
  renderMap();
}

// CSV parsing and normalization
function parseCSV(text) {
  // Simple RFC4180-ish parser
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  function endCell() { row.push(cell); cell = ""; }
  function endRow() { rows.push(row); row = []; }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") endCell();
      else if (ch === "\n") { endCell(); endRow(); }
      else if (ch === "\r") { /* skip */ }
      else cell += ch;
    }
  }
  // last cell/row
  endCell(); endRow();
  // remove trailing empty row if any
  if (rows.length && rows[rows.length - 1].every(c => c === "")) rows.pop();
  return rows;
}

function normalizeRows(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(h => (h || "").trim());
  const idx = indexMap(headers);
  const items = [];
  for (let r = 1; r < rows.length; r++) {
    const raw = rows[r];
    if (!raw || raw.every(c => (c || "").trim() === "")) continue;

    const get = (i) => (i >= 0 && i < raw.length ? raw[i].trim() : "");
    const name = coalesce(get(idx.name), get(idx.shopName), get(idx.store), get(idx.title)) || `Shop ${r}`;
    const lat = parseFloat(coalesce(get(idx.lat), get(idx.latitude)));
    const lng = parseFloat(coalesce(get(idx.lng), get(idx.lon), get(idx.long), get(idx.longitude)));
    const rating = parseFloat((get(idx.rating) || "").replace(/[^\d.]/g, "")) || 0;
    const address = coalesce(get(idx.address), get(idx.location), get(idx.addr));
    const category = coalesce(get(idx.category), get(idx.type), get(idx.segment));
    const phone = coalesce(get(idx.phone), get(idx.tel), get(idx.contact));
    const imageURL = coalesce(get(idx.image), get(idx.imageURL), get(idx.photo), get(idx.thumbnail));
    const description = coalesce(get(idx.description), get(idx.notes), get(idx.remark));

    items.push({ name, lat, lng, rating, address, category, phone, imageURL, description, raw });
  }
  return items;
}

function indexMap(headers) {
  // normalize header variants
  const map = {};
  function idxOf(...cands) {
    for (const c of cands) {
      const i = headers.findIndex(h => h.toLowerCase() === c);
      if (i !== -1) return i;
    }
    return -1;
  }
  map.name = idxOf("name", "shop name", "store", "outlet", "branch");
  map.shopName = idxOf("shop", "shop_name");
  map.store = idxOf("store name", "title");
  map.title = idxOf("title");
  map.lat = idxOf("lat", "latitude", "gps lat", "gps_lat");
  map.latitude = idxOf("latitude");
  map.lng = idxOf("lng", "lon", "long", "longitude", "gps lng", "gps_long");
  map.lon = idxOf("lon");
  map.long = idxOf("long");
  map.longitude = idxOf("longitude");
  map.rating = idxOf("rating", "stars", "star", "score");
  map.address = idxOf("address", "addr", "location");
  map.location = idxOf("location");
  map.addr = idxOf("addr");
  map.category = idxOf("category", "type", "segment", "group");
  map.type = idxOf("type");
  map.segment = idxOf("segment");
  map.phone = idxOf("phone", "tel", "contact", "mobile");
  map.tel = idxOf("tel");
  map.contact = idxOf("contact");
  map.image = idxOf("image", "image url", "photo", "thumbnail");
  map.imageURL = idxOf("imageurl", "image_url");
  map.photo = idxOf("photo");
  map.thumbnail = idxOf("thumbnail");
  map.description = idxOf("description", "notes", "remark", "details");
  map.notes = idxOf("notes");
  map.remark = idxOf("remark");
  return map;
}

// Helpers
function ratingBucket(r) {
  const n = Math.floor(Number(r) || 0);
  if (n >= 5) return 5;
  if (n <= 0) return 0;
  return n;
}
function colorForRating(r) { return ratingColors[ratingBucket(r)] || "#9ca3af"; }
function gradientForRating(r) {
  const c = colorForRating(r);
  return `linear-gradient(135deg, ${c} 0%, rgba(255,255,255,0.1) 100%)`;
}
function initials(name) {
  const parts = (name || "").split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "S").toUpperCase();
}
function renderStarsInline(r) {
  const full = Math.round(Number(r) || 0);
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<svg class="star" width="16" height="16" viewBox="0 0 24 24" fill="${i < full ? "#f59e0b" : "none"}" stroke="#f59e0b" stroke-width="2"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/></svg>`
  ).join("");
  return stars;
}
function renderStarsText(r) {
  const full = Math.round(Number(r) || 0);
  return `${"★".repeat(full)}${"☆".repeat(5 - full)}`;
}
function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
}

function downloadCSV() {
  // Use last fetched CSV if available, else rebuild from objects
  const cached = localStorage.getItem("shops_csv_cache");
  let blob;
  if (cached) {
    blob = new Blob([cached], { type: "text/csv;charset=utf-8" });
  } else {
    const header = ["Name","Latitude","Longitude","Rating","Address","Category","Phone","ImageURL","Description"];
    const rows = state.allShops.map(s =>
      [s.name, s.lat, s.lng, s.rating, s.address, s.category, s.phone, s.imageURL, s.description]
        .map(v => {
          const str = (v ?? "").toString();
          return /[,"\n]/.test(str) ? `"${str.replace(/"/g,'""')}"` : str;
        }).join(",")
    );
    blob = new Blob([header.join(",") + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shops.csv";
  a.click();
  URL.revokeObjectURL(url);
}
