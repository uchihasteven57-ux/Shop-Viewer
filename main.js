const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUyjM9WjlMz2-T9d2rDQJV65gWL7swVtDAkg-ODkzonKOjnuykUKr2NlmGN0zqp35sYulYYJLmoUo6/pub?output=csv";

const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');
const toggleViewBtn = document.getElementById('toggleViewBtn');

let data = [];
let groupedView = false;

function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? 'red' : 'inherit';
}

async function fetchCsv(url) {
  const u = new URL(url);
  u.searchParams.set('ts', Date.now());
  const res = await fetch(u, {
    mode: 'cors',
    cache: 'no-store',
    headers: { 'Accept': 'text/csv' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.text()).replace(/^\uFEFF/, '');
}

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inQuotes) {
      if (c === '"' && n === '"') { cell += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cell += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c !== '\r') { cell += c; }
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function toObjects(rows) {
  const [headers, ...body] = rows;
  return body
    .filter(r => r.some(val => val.trim() !== ''))
    .map(r => Object.fromEntries(headers.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}

function ratingClass(rating) {
  const val = parseFloat(rating);
  if (!isNaN(val)) {
    if (val >= 4) return 'rating-high';
    if (val >= 2.5) return 'rating-medium';
    return 'rating-low';
  }
  return '';
}

function renderList(items) {
  outputEl.innerHTML = '';
  items.forEach(obj => {
    const card = document.createElement('div');
    card.className = `card ${ratingClass(obj['Rating'])}`;
    card.innerHTML = `
      <strong>${obj['Shop Name'] || 'Unnamed Shop'}</strong><br/>
      <em>Rating: ${obj['Rating'] || 'N/A'}</em><br/>
      ${obj['Address'] || ''}<br/>
      ${obj['Phone'] || ''}
    `;
    outputEl.appendChild(card);
  });
}

function renderGroupedByRating(items) {
  outputEl.innerHTML = '';
  const groups = {};
  items.forEach(obj => {
    const rating = obj['Rating'] || 'No Rating';
    if (!groups[rating]) groups[rating] = [];
    groups[rating].push(obj);
  });

  Object.keys(groups).sort((a, b) => parseFloat(b) - parseFloat(a)).forEach(rating => {
    const div = document.createElement('div');
    div.className = 'group';
    div.innerHTML = `<h3>Rating: ${rating}</h3>`;
    groups[rating].forEach(obj => {
      const card = document.createElement('div');
      card.className = `card ${ratingClass(rating)}`;
      card.innerHTML = `
        <strong>${obj['Shop Name'] || 'Unnamed Shop'}</strong><br/>
        <em>Rating: ${obj['Rating'] || 'N/A'}</em><br/>
        ${obj['Address'] || ''}<br/>
        ${obj['Phone'] || ''}
      `;
      div.appendChild(card);
    });
    outputEl.appendChild(div);
  });
}

toggleViewBtn.addEventListener('click', () => {
  groupedView = !groupedView;
  toggleViewBtn.textContent = groupedView ? 'Show Flat List' : 'Group by Rating';
  if (groupedView) {
    renderGroupedByRating(data);
  } else {
    renderList(data);
  }
});

(async () => {
  try {
    const csvText = await fetchCsv(CSV_URL);
    data = toObjects(parseCSV(csvText));
    showStatus(`Loaded ${data.length} records`);
    renderList(data);
  } catch (err) {
    console.error(err);
    showStatus(`Unable to load data: ${err.message}`, true);
  }
})();