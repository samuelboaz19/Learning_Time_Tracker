const MAX_EVENTS_PER_DAY = 3000;
const DEFAULT_RETENTION_DAYS = 60;

const API_URL = "http://127.0.0.1:8000";

function pad(n) {
  return n.toString().padStart(2, "0");
}


// --------------------------------------------------
// DATE
// --------------------------------------------------

export function getDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}


// --------------------------------------------------
// EVENT ID
// --------------------------------------------------

function createEventId() {
  return crypto.randomUUID();
}


// --------------------------------------------------
// APPEND EVENT
// --------------------------------------------------

export async function appendEvent(event) {

  // Every event gets a permanent ID.
  // This lets us identify the same event during retries.
  const eventWithId = {
    event_id: event.event_id || createEventId(),
    timestamp: event.timestamp,
    domain: event.domain,
    duration_seconds: event.duration_seconds,
    category: event.category,
    synced: false
  };

  const dateKey = getDateKey(new Date(eventWithId.timestamp));
  const eventsKey = `events:${dateKey}`;

  // ------------------------------------------------
  // 1. ALWAYS save locally first
  // ------------------------------------------------

  const existing = await chrome.storage.local.get(eventsKey);
  const events = existing[eventsKey] || [];

  events.push(eventWithId);

  if (events.length > MAX_EVENTS_PER_DAY) {
    events.splice(0, events.length - MAX_EVENTS_PER_DAY);
  }

  await chrome.storage.local.set({
    [eventsKey]: events
  });

  // ------------------------------------------------
  // 2. Update local statistics
  // ------------------------------------------------

  await updateStats(
    dateKey,
    eventWithId.domain,
    eventWithId.category,
    eventWithId.duration_seconds
  );

  // ------------------------------------------------
  // 3. Try sending immediately
  // ------------------------------------------------

  await syncEvent(eventWithId);
}


// --------------------------------------------------
// SEND ONE EVENT TO FASTAPI
// --------------------------------------------------

async function syncEvent(event) {

  try {

    const response = await fetch(
      `${API_URL}/usage`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          event_id: event.event_id,
          timestamp: event.timestamp,
          website: event.domain,
          duration_seconds: event.duration_seconds,
          category: event.category
        })
      }
    );

    if (!response.ok) {

      console.error(
        "FastAPI error:",
        response.status,
        await response.text()
      );

      return false;
    }

    // FastAPI accepted the event.
    await markEventSynced(event.event_id);

    console.log(
      "Event synced:",
      event.event_id
    );

    return true;

  } catch (error) {

    // FastAPI is probably OFF.
    // Event remains synced:false.
    console.log(
      "FastAPI unavailable. Event kept locally:",
      event.event_id
    );

    return false;
  }
}


// --------------------------------------------------
// MARK EVENT AS SYNCED
// --------------------------------------------------

async function markEventSynced(eventId) {

  const all = await chrome.storage.local.get(null);

  const updates = {};

  for (const [key, value] of Object.entries(all)) {

    if (!key.startsWith("events:")) {
      continue;
    }

    if (!Array.isArray(value)) {
      continue;
    }

    let changed = false;

    const updatedEvents = value.map(event => {

      if (event.event_id === eventId) {

        changed = true;

        return {
          ...event,
          synced: true
        };
      }

      return event;
    });

    if (changed) {
      updates[key] = updatedEvents;
    }
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
}


// --------------------------------------------------
// SYNC ALL PENDING EVENTS
// --------------------------------------------------

export async function syncPendingEvents() {

  const all = await chrome.storage.local.get(null);

  for (const [key, value] of Object.entries(all)) {

    if (!key.startsWith("events:")) {
      continue;
    }

    if (!Array.isArray(value)) {
      continue;
    }

    for (const event of value) {

      // Old events created before event_id existed
      // get an ID automatically.
      if (!event.event_id) {

        event.event_id = createEventId();
        event.synced = false;

        await chrome.storage.local.set({
          [key]: value
        });
      }

      if (event.synced === true) {
        continue;
      }

      await syncEvent(event);
    }
  }
}


// --------------------------------------------------
// STATS
// --------------------------------------------------

export async function updateStats(
  dateKey,
  domain,
  category,
  seconds
) {

  const statsKey = `stats:${dateKey}`;

  const existing =
    await chrome.storage.local.get(statsKey);

  const stats = existing[statsKey] || {};

  if (!stats[domain]) {

    stats[domain] = {
      seconds: 0,
      category
    };
  }

  stats[domain].seconds += seconds;
  stats[domain].category = category;

  await chrome.storage.local.set({
    [statsKey]: stats
  });
}


// --------------------------------------------------
// GET STATS
// --------------------------------------------------

export async function getStatsForDate(dateKey) {

  const key = `stats:${dateKey}`;

  const data =
    await chrome.storage.local.get(key);

  return data[key] || {};
}


// --------------------------------------------------
// GET EVENTS
// --------------------------------------------------

export async function getEventsForDate(dateKey) {

  const key = `events:${dateKey}`;

  const data =
    await chrome.storage.local.get(key);

  return data[key] || [];
}


// --------------------------------------------------
// CATEGORY MAP
// --------------------------------------------------

export async function getCategoryMap() {

  const data =
    await chrome.storage.local.get("categoryMap");

  return data.categoryMap || {};
}


export async function setCategoryForDomain(
  domain,
  category
) {

  const map = await getCategoryMap();

  map[domain] = category;

  await chrome.storage.local.set({
    categoryMap: map
  });

  const dateKey = getDateKey();

  const stats =
    await getStatsForDate(dateKey);

  if (stats[domain]) {

    stats[domain].category = category;

    await chrome.storage.local.set({
      [`stats:${dateKey}`]: stats
    });
  }
}


// --------------------------------------------------
// CLEANUP OLD DATA
// --------------------------------------------------

export async function cleanupOldData(
  retentionDays = DEFAULT_RETENTION_DAYS
) {

  const all =
    await chrome.storage.local.get(null);

  const cutoff = new Date();

  cutoff.setDate(
    cutoff.getDate() - retentionDays
  );

  const cutoffKey =
    getDateKey(cutoff);

  const keysToRemove =
    Object.keys(all).filter((key) => {

      const match =
        key.match(
          /^(events|stats):(\d{4}-\d{2}-\d{2})$/
        );

      if (!match) {
        return false;
      }

      return match[2] < cutoffKey;
    });

  if (keysToRemove.length > 0) {

    await chrome.storage.local.remove(
      keysToRemove
    );
  }
}