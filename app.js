let allData = [];
let map;
let markers = [];

async function init() {
  allData = await fetchSheetData();
  renderShopList(allData);
  initMap();
}

// Render shop list
function renderShopList(data) {
  const list = document.getElementById("shopList");
  list.innerHTML = "";
  // Add "All Shops" option
  let allItem = document.createElement("li");
  allItem.className = "collection-item blue-text";
  allItem.innerText = "All Shops";
  allItem.onclick = () => showAllShops();
  list.appendChild(allItem);

  data.forEach((shop) => {
    let li = document.createElement("li");
    li.className = "collection-item";
    li.innerText = shop["Shop Name"];
    li.onclick = () => showShop(shop);
    list.appendChild(li);
  });
}

function showShop(shop) {
  document.getElementById("details").innerHTML = `
    <h5>${shop["Shop Name"]}</h5>
    <p>${shop["REmark"] || ""}</p>
    <p>Rating: ${shop["Rating"] || "N/A"} ⭐</p>
    ${shop["Photo URL"] ? `<img src="${shop["Photo URL"]}" />` : ""}
  `;
  clearMarkers();
  const lat = parseFloat(shop["Latitude"]);
  const lng = parseFloat(shop["Longitude"]);
  if (!isNaN(lat) && !isNaN(lng)) {
    const position = { lat, lng };
    const marker = new google.maps.Marker({ position, map });
    markers.push(marker);
    map.setCenter(position);
    map.setZoom(15);
  }
}

function showAllShops(data = allData) {
  document.getElementById("details").innerHTML = "<h5>All Shops on Map</h5>";
  clearMarkers();
  data.forEach(shop => {
    const lat = parseFloat(shop["Latitude"]);
    const lng = parseFloat(shop["Longitude"]);
    if (!isNaN(lat) && !isNaN(lng)) {
      const marker = new google.maps.Marker({position: {lat, lng}, map, title: shop["Shop Name"]});
      markers.push(marker);
    }
  });
  if (markers.length > 0) {
    let bounds = new google.maps.LatLngBounds();
    markers.forEach(m => bounds.extend(m.getPosition()));
    map.fitBounds(bounds);
  }
}

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 16.8661, lng: 96.1951 },
    zoom: 12
  });
}

function clearMarkers() {
  markers.forEach(m => m.setMap(null));
  markers = [];
}

// Buttons
document.getElementById("filterBtn").addEventListener("click", () => {
  const rating = prompt("Enter minimum rating (1-5):");
  if (!rating) return;
  const filtered = allData.filter(s => parseInt(s["Rating"] || 0) >= parseInt(rating));
  renderShopList(filtered);
  showAllShops(filtered);
  M.toast({html: `Filtered by ⭐${rating}+`});
});

document.getElementById("groupBtn").addEventListener("click", () => {
  const rating = prompt("Enter exact rating group (1-5):");
  if (!rating) return;
  const grouped = allData.filter(s => parseInt(s["Rating"] || 0) === parseInt(rating));
  renderShopList(grouped);
  showAllShops(grouped);
  M.toast({html: `Grouped shops with ⭐${rating}`});
});

document.getElementById("viewAllBtn").addEventListener("click", () => {
  renderShopList(allData);
  showAllShops(allData);
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  let csvContent = "data:text/csv;charset=utf-8,";
  const headers = Object.keys(allData[0]);
  csvContent += headers.join(",") + "\\n";
  allData.forEach(shop => {
    csvContent += headers.map(h => shop[h] || "").join(",") + "\\n";
  });
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "shops_data.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

init();
