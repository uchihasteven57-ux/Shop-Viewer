document.addEventListener('DOMContentLoaded', () => {
    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service worker registered.', reg))
            .catch(err => console.error('Service worker not registered.', err));
    }

    // --- CONFIGURATION ---
    // IMPORTANT: Paste your published Google Sheet CSV URL here
    const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQUyjM9WjlMz2-T9d2rDQJV65gWL7swVtDAkg-ODkzonKOjnuykUKr2NlmGN0zqp35sYulYYJLmoUo6/pub?output=csv'; // Example URL, replace with your actual link
    
    // --- STATE ---
    let shopData = [];
    let map;
    let markers = [];

    // --- DOM ELEMENTS ---
    const shopListEl = document.getElementById('shop-list');
    const shopDetailsEl = document.getElementById('shop-details');
    const mapEl = document.getElementById('map');

    // --- FUNCTIONS ---
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
            shopDetailsEl.innerHTML = `<p>Error loading data. Please check your connection and the sheet URL.</p>`;
            shopDetailsEl.style.display = 'block';
        }
    }

    /**
     * Converts CSV text to a JSON array
     */
    function csvToJSON(csv) {
        const lines = csv.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            const obj = {};
            const currentline = lines[i].split(',');
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentline[j] ? currentline[j].trim() : '';
            }
            result.push(obj);
        }
        return result;
    }

    /**
     * Initializes the application, map, and event listeners
     */
    function initializeApp() {
        // Initialize Leaflet map
        map = L.map('map').setView([16.8409, 96.1735], 12); // Centered on Yangon
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        populateShopList(shopData);
        addMarkersToMap(shopData);
        setupEventListeners();
        
        // Show the map by default
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
            const filteredShops = minRating === 0 ? shopData : shopData.filter(shop => shop.Rating >= minRating);
            populateShopList(filteredShops);
            addMarkersToMap(filteredShops);
        });

        document.getElementById('rating-group').addEventListener('change', (e) => {
            const targetRating = parseInt(e.target.value);
            const groupedShops = targetRating === 0 ? shopData : shopData.filter(shop => shop.Rating == targetRating);
            addMarkersToMap(groupedShops);
            showMapView();
        });
    }

    /**
     * Populates the sidebar with shop names
     */
    function populateShopList(shops) {
        shopListEl.innerHTML = '';
        shops.forEach(shop => {
            const li = document.createElement('li');
            li.textContent = shop['Shop Name'];
            li.dataset.shopId = shop.ID; // Assuming an 'ID' column exists
            li.addEventListener('click', (e) => {
                displayShopDetails(shop);
                // Highlight active item
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
            <p><strong>Rating:</strong> ${'⭐'.repeat(shop.Rating)}</p>
            <p><strong>Description:</strong> ${shop.Description}</p>
        `;
    }

    /**
     * Adds markers to the map for the given shops
     */
    function addMarkersToMap(shops) {
        // Clear existing markers
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        shops.forEach(shop => {
            if (shop.Latitude && shop.Longitude) {
                const marker = L.marker([shop.Latitude, shop.Longitude])
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
        map.invalidateSize(); // Fixes map rendering issues
        document.querySelectorAll('#shop-list li').forEach(item => item.classList.remove('active'));
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