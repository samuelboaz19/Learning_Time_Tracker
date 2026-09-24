// popup.js
import {
  getDateKey,
  getStatsForDate,
  getEventsForDate,
  setCategoryForDomain,
} from "./storage.js";
import { CATEGORIES } from "./categories.js";

const MAX_TOP_SITES = 8;
const MAX_RECENT_EVENTS = 10;

function formatDuration(totalSeconds) {
  const minutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0 && mins === 0) return "<1m";
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatClock(isoTimestamp) {
  const d = new Date(isoTimestamp);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function buildCategoryOptions(selected) {
  return CATEGORIES.map((c) => {
    const isSelected = c === selected ? "selected" : "";
    return `<option value="${c}" ${isSelected}>${c}</option>`;
  }).join("");
}

async function renderTotal(stats) {
  const totalSeconds = Object.values(stats).reduce((sum, s) => sum + s.seconds, 0);
  document.getElementById("totalTime").textContent = formatDuration(totalSeconds);
}

async function renderTopSites(stats) {
  const listEl = document.getElementById("siteList");
  const entries = Object.entries(stats).sort((a, b) => b[1].seconds - a[1].seconds);

  if (entries.length === 0) {
    listEl.innerHTML = `<li class="empty-state">No activity tracked yet today.</li>`;
    return;
  }

  const maxSeconds = entries[0][1].seconds;
  listEl.innerHTML = entries
    .slice(0, MAX_TOP_SITES)
    .map(([domain, data]) => {
      const pct = Math.max(4, Math.round((data.seconds / maxSeconds) * 100));
      return `
        <li class="site-row" data-domain="${domain}">
          <div class="site-row__top">
            <span class="site-row__name">${domain}</span>
            <span class="site-row__time">${formatDuration(data.seconds)}</span>
          </div>
          <div class="site-row__bar"><div class="site-row__bar-fill" style="width:${pct}%"></div></div>
          <div class="site-row__meta">
            <select class="category-select" data-domain="${domain}">
              ${buildCategoryOptions(data.category)}
            </select>
          </div>
        </li>`;
    })
    .join("");

  listEl.querySelectorAll(".category-select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const domain = e.target.getAttribute("data-domain");
      await setCategoryForDomain(domain, e.target.value);
    });
  });
}

async function renderRecentActivity(events) {
  const listEl = document.getElementById("activityList");
  if (events.length === 0) {
    listEl.innerHTML = `<li class="empty-state">Nothing recorded yet.</li>`;
    return;
  }

  const recent = events.slice(-MAX_RECENT_EVENTS).reverse();
  listEl.innerHTML = recent
    .map((ev) => {
      const start = new Date(ev.timestamp);
      const end = new Date(start.getTime() + ev.duration_seconds * 1000);
      return `
        <li class="activity-row">
          <span class="activity-row__time">${formatClock(start)}-${formatClock(end)}</span>
          <span class="activity-row__label">${ev.domain}</span>
          <span class="activity-row__category">${ev.category}</span>
        </li>`;
    })
    .join("");
}

async function render() {
  const dateKey = getDateKey();
  document.getElementById("dateLabel").textContent = dateKey;

  const [stats, events] = await Promise.all([
    getStatsForDate(dateKey),
    getEventsForDate(dateKey),
  ]);

  await renderTotal(stats);
  await renderTopSites(stats);
  await renderRecentActivity(events);
}

document.addEventListener("DOMContentLoaded", render);

// Keep the popup live if it's left open while browsing.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") render();
});
