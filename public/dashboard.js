function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function normalize(s) {
  return (s ?? "").toString().toLowerCase().trim();
}

async function loadDashboard() {
  const res = await fetch("/items");
  const items = await res.json();

  // Controls
  const searchText = normalize(document.getElementById("searchInput").value);
  const selectedLocation = document.getElementById("locationFilter").value;

  // Filter
  const filtered = items.filter(item => {
    const haystack = [
      item.fullName,
      item.staffNumber,
      item.location,
    ].map(normalize).join(" ");

    const matchesSearch = !searchText || haystack.includes(searchText);
    const matchesLocation = !selectedLocation || item.location === selectedLocation;

    return matchesSearch && matchesLocation;
  });

  // Build unique locations for filter
  const locations = [...new Set(items.map(i => i.location).filter(Boolean))].sort();
  const filterEl = document.getElementById("locationFilter");
  const current = filterEl.value;
  filterEl.innerHTML = `<option value="">All locations</option>` + locations
    .map(loc => `<option value="${loc}">${loc}</option>`)
    .join("");
  filterEl.value = current; // keep selection

  // Stats
  const total = items.length;
  const shown = filtered.length;
  const uniqueLocCount = locations.length;

  const statsRow = document.getElementById("statsRow");
  statsRow.innerHTML = `
    <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">Total records</div></div>
    <div class="stat-card"><div class="stat-num">${uniqueLocCount}</div><div class="stat-label">Locations</div></div>
    <div class="stat-card"><div class="stat-num">${shown}</div><div class="stat-label">Showing</div></div>
  `;

  // Group by location
  const byLocation = {};
  for (const item of filtered) {
    const loc = item.location || "Unknown";
    byLocation[loc] ??= [];
    byLocation[loc].push(item);
  }

  // Render
  const grid = document.getElementById("locationsGrid");
  const sortedLocs = Object.keys(byLocation).sort();

  grid.innerHTML = sortedLocs.map(loc => {
    const staffCards = byLocation[loc]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")) // newest first
      .map(i => `
        <div class="warden-card">
          <div class="warden-name">${i.fullName ?? "—"}</div>
          <div class="warden-meta">Staff #: ${i.staffNumber ?? "—"}</div>
          <div class="warden-meta">Logged: ${formatDateTime(i.createdAt)}</div>
        </div>
      `).join("");

    return `
      <div class="location-card">
        <div class="location-title">
          <span>${loc}</span>
          <span class="location-count">${byLocation[loc].length}</span>
        </div>
        <div class="warden-list">
          ${staffCards || `<div class="muted">No records</div>`}
        </div>
      </div>
    `;
  }).join("");

  if (sortedLocs.length === 0) {
    grid.innerHTML = `<div class="muted">No matching records.</div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("refreshBtn").addEventListener("click", loadDashboard);
  document.getElementById("searchInput").addEventListener("input", loadDashboard);
  document.getElementById("locationFilter").addEventListener("change", loadDashboard);

  loadDashboard();
});
