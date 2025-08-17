let allData = [];

async function init() {
  allData = await fetchSheetData();
  renderShopList(allData);
  initMap(); // New initMap function (non-Google Maps)
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
  showShopOnMap(shop);
}

function showAllShops(data = allData) {
  document.getElementById("details").innerHTML = "<h5>All Shops</h5>";
  initMap(); // reset map
  data.forEach(shop => {
    addMarker(shop.Latitude, shop.Longitude, shop["Shop Name"], `
      ${shop.REmark || ""}<br>
      Rating: ${shop.Rating || "-"} ⭐<br>
      <img src="${shop["Photo URL"] || ""}" style="width:100px; margin-top:5px"/>
    `);
  });
}

// New map-related functions (you can customize them further)

// Initialize map once when app starts
function initMap(lat = 16.8661, lng = 96.1951, zoom = 12) {
  // Replace this with your custom map logic or just leave as a placeholder
  console.log(`Map initialized at (${lat}, ${lng}) with zoom ${zoom}`);
}

// When a shop is clicked (detail view)
function showShopOnMap(shop) {
  initMap(shop.Latitude, shop.Longitude, 15);
  clearMarkers();
  addMarker(shop.Latitude, shop.Longitude, shop["Shop Name"], `
    ${shop.REmark || ""}<br>
    Rating: ${shop.Rating || "-"} ⭐<br>
    <img src="${shop["Photo URL"] || ""}" style="width:100px; margin-top:5px"/>
  `);
}

// Add marker placeholder
function addMarker(lat, lng, title, content) {
  console.log(`Marker added at (${lat}, ${lng}) for "${title}" with content: ${content}`);
}

// Clear markers placeholder
function clearMarkers() {
  console.log("Markers cleared");
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
  csvContent += headers.join(",") + "\n";
  allData.forEach(shop => {
    csvContent += headers.map(h => shop[h] || "").join(",") + "\n";
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
