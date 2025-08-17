
# Shop Locator PWA

A mobile-friendly PWA that reads shop data from **Google Sheets (read-only)** and displays:
- Left sidebar: shop list + search + **All Shops** button
- Right pane: shop details (submit time, remark, rating, photo) + map
- All Shops map view with pins
- PWA features: installable + offline for core UI

## 1) Data format (Google Sheets)
Create a sheet with headers in row 1:

```
Submit Time | Shop Name | REmark | Rating | Latitude | Longitude | Photo URL
```

> Tip: Publish your sheet for public viewing and **Share** -> **Anyone with the link** (Viewer).

## 2) Enable Google Sheets API (API key)
- In Google Cloud Console, create an **API key** and **restrict** it to:
  - API: Google Sheets API
  - Application restrictions: HTTP referrers (set your domain)
- Put the key in `sheets.js` as `API_KEY`.

## 3) Get your Sheet ID
From your sheet URL: `https://docs.google.com/spreadsheets/d/THIS_IS_THE_SHEET_ID/edit#gid=...`
Place it in `sheets.js` as `SHEET_ID`. If your sheet tab is not `Sheet1`, change `SHEET_NAME` too.

## 4) Google Maps API (optional, for map)
- Create a **Google Maps JavaScript API** key.
- Put it in `sheets.js` as `GOOGLE_MAPS_API_KEY`.

> Without a Maps key, the app still works but will not render maps.

## 5) Run locally
Open a terminal in this folder and start a simple static server, e.g.:

```bash
# Python 3
python -m http.server 8080
# then open http://localhost:8080
```

## 6) Deploy
Upload the folder to any static hosting (Firebase Hosting, Vercel, Netlify, GitHub Pages).  
PWA install works best on HTTPS.

## 7) Notes
- If the sheet is empty or keys are missing, the app loads **demo data** so you can preview the UI.
- All data is **view-only** in the app.
- Service Worker caches core assets for offline; network-first for APIs.
