// map.js (Leaflet version)

let map;
let markers = [];

// Initialize Leaflet map
function initMap(lat = 16.8, lng = 96.15, zoom = 13) {
  if (!map) {
    map = L.map("map").setView([lat, lng], zoom);

    // OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
  } else {
    map.setView([lat, lng], zoom);
  }
}

// Add a single marker
function addMarker(lat, lng, title, infoHtml = "") {
  const marker = L.marker([lat, lng]).addTo(map);

  if (infoHtml) {
    marker.bindPopup(`<b>${title}</b><br>${infoHtml}`);
  }

  markers.push(marker);
  return marker;
}

// Clear markers
function clearMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
}

// Show all shops on map
function showAllShops(shops) {
  clearMarkers();

  const bounds = [];
  shops.forEach(shop => {
    if (shop.Latitude && shop.Longitude) {
      const marker = addMarker(
        shop.Latitude,
        shop.Longitude,
        shop["Shop Name"],
        `
        ${shop.REmark || ""}<br>
        Rating: ${shop.Rating || "-"} ⭐<br>
        <img src="${shop["Photo URL"] || ""}" style="width:100px; margin-top:5px"/>
        `
      );
      bounds.push([shop.Latitude, shop.Longitude]);
    }
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds);
  }
}
