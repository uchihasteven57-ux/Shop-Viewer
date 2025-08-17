document.addEventListener('DOMContentLoaded', () => {
    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Service Worker registered.'))
                .catch(err => console.error('Service Worker registration failed: ', err));
        });
    }

    // --- CONFIGURATION ---
    // Use a direct CSV export link for your specific sheet
    const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQUyjM9WjlMz2-T9d2rDQJV65gWL7swVtDAkg-ODkzonKOjnuykUKr2NlmGN0zqp35sYulYYJLmoUo6/pub?output=csv';
    
    // --- STATE ---
    let shopData = [];
    let map;
    let markers = [];

    // --- DOM ELEMENTS ---
    const shopListEl = document.getElementById('shop-list');
    const shopDetailsEl = document.getElementById('shop-details');
    const mapEl = document.getElementById('map');

    /**
     * Fetches and processes the data from Google Sheets
     */
    async function fetchData() {
        try {
            const response = await fetch(sheetURL);
            if (!response.ok) throw new Error("Network response was not ok.");
            const text = await response.text();
            
            shopData = csvToJSON(text);
            initializeApp();
        } catch (error) {
            console.error("Failed to fetch shop data:", error);
            shopDetailsEl.innerHTML = `<p style="color: red;">Error: Could not load data. Please ensure the Google Sheet is public and the link is correct.</p>`;
            shopDetailsEl.style.display = 'block';
        }
    }

    /**
     * Converts CSV text to a JSON array
     */
    function csvToJSON(csv) {
        const lines = csv.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const obj = {};
            const currentline = lines[i].split(',');

            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentline[j] ? currentline[j].trim().replace(/"/g, '') : '';
            }
            result.push(obj);
        }
        return result;
    }
    
    /**
     * Initializes the application, map, and event listeners
     */
    function initializeApp() {
        map = L.map('map').setView([16.8409, 96.1735], 12); // Default center on Yangon
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        populateShopList(shopData);
        addMarkersToMap(shopData);
        setupEventListeners();
        
        // Ensure map is visible on initial load
        showMapView();
    }
    
    /**
     * Sets up all the event listeners for buttons and filters
     */
    function setupEventListeners() {
        document.getElementById('all-shops-btn').addEventListener('click', showMapView);
        document.getElementById('view-all-btn').addEventListener('click', showMapView);
        document.getElementById('download-data-btn').addEventListener('click', () => downloadData(shopData, 'shops.json'));

        document.getElementById('rating-filter').addEventListener('change', (e) => {
            const minRating = parseInt(e.target.value);
            const filteredShops = minRating === 0 ? shopData : shopData.filter(shop => parseInt(shop.Rating) >= minRating);
            populateShopList(filteredShops);
            addMarkersToMap(filteredShops);
        });

        document.getElementById('rating-group').addEventListener('change', (e) => {
            const targetRating = parseInt(e.target.value);
            const groupedShops = targetRating === 0 ? shopData : shopData.filter(shop => parseInt(shop.Rating) == targetRating);
            addMarkersToMap(groupedShops);
            showMapView();
        });
    }

    /**
     * Populates the sidebar with shop names
     */
    function populateShopList(shops) {
        shopListEl.innerHTML = ''; // Clear previous list
        shops.forEach(shop => {
            const li = document.createElement('li');
            li.textContent = shop['Shop Name'];
            li.dataset.shopId = shop.ID;
            li.addEventListener('click', (e) => {
                displayShopDetails(shop);
                document.querySelectorAll('#shop-list li').forEach(item => item.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
            shopListEl.appendChild(li);
        });
    }

    /**
     * Displays details for a single selected shop
     */
    function displayShopDetails(shop) {
        shopDetailsEl.style.display = 'block';
        mapEl.style.display = 'none';

        shopDetailsEl.innerHTML = `
            <h2>${shop['Shop Name']}</h2>
            <p><strong>Address:</strong> ${shop.Address}</p>
            <p><strong>Rating:</strong> ${'⭐'.repeat(parseInt(shop.Rating))}</p>
            <p><strong>Description:</strong> ${shop.Description}</p>
        `;
    }

    /**
     * Adds markers to the map for the given shops
     */
    function addMarkersToMap(shops) {
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        shops.forEach(shop => {
            const lat = parseFloat(shop.Latitude);
            const lon = parseFloat(shop.Longitude);
            if (!isNaN(lat) && !isNaN(lon)) {
                const marker = L.marker([lat, lon])
                    .bindPopup(`<b>${shop['Shop Name']}</b><br>${shop.Address}`);
                markers.push(marker);
            }
        });

        if (markers.length > 0) {
            const featureGroup = L.featureGroup(markers).addTo(map);
            map.fitBounds(featureGroup.getBounds().pad(0.1));
        }
    }

    /**
     * Shows the map view and hides the details view
     */
    function showMapView() {
        shopDetailsEl.style.display = 'none';
        mapEl.style.display = 'block';
        document.querySelectorAll('#shop-list li').forEach(item => item.classList.remove('active'));
        
        // ** THE MOST IMPORTANT FIX **
        // This tells the map to re-calculate its size after being shown.
        setTimeout(() => {
            map.invalidateSize();
        }, 10);
    }

    /**
     * Downloads data as a JSON file
     */
    function downloadData(data, filename) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- INITIALIZATION ---
    fetchData();
});
