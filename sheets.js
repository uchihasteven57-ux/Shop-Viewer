// Google Sheets + API Config
const SHEET_ID = "1NtK77MmwSv8QF14AKjxua-SwNy2k3wF0ekCwO--2vBI"; // 👈 Replace with your Google Sheet ID
const SHEET_NAME = "Sheet1";           // 👈 Replace if your sheet has a different name
const API_KEY = "AIzaSyC56X3hyK_2OJZk9A5yyKeoX-0pVOqSOl0"; 
const GOOGLE_MAPS_API_KEY = "AIzaSyC-w6zlVuf1Lp_kIptIj-8zdWC8SAVQQr8";

const SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;

// Fetch data from Google Sheets
async function fetchSheetData() {
  try {
    const res = await fetch(SHEET_URL);
    const data = await res.json();
    if (!data.values) return demoData;
    const headers = data.values[0];
    return data.values.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
  } catch (e) {
    console.error("Error fetching sheet:", e);
    return demoData;
  }
}

// Demo fallback data (used if API not connected yet)
const demoData = [
  { "Shop Name": "Crystal Store", "REmark": "Popular shop", "Rating": "5", "Latitude": "16.8661", "Longitude": "96.1951", "Photo URL": "https://via.placeholder.com/300" },
  { "Shop Name": "Ruby Mart", "REmark": "Good service", "Rating": "4", "Latitude": "16.8409", "Longitude": "96.1735", "Photo URL": "https://via.placeholder.com/300" },
  { "Shop Name": "Pearl Cafe", "REmark": "Cozy place", "Rating": "3", "Latitude": "16.8351", "Longitude": "96.1570", "Photo URL": "https://via.placeholder.com/300" }
];
