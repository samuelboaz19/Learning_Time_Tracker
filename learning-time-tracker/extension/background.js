// background.js
// MV3 service worker. This is the tracking engine: it maintains a single
// "current session" describing the domain the user is actively looking at,
// and closes that session out into a stored event whenever tracking should
// stop or switch domains.
//
// Because MV3 service workers can be suspended and woken up at any time,
// the in-progress session is mirrored into chrome.storage.session (which
// survives worker restarts but is cleared on browser restart) and is also
// checkpointed to durable storage on a recurring alarm, so at most ~1
// minute of data can ever be lost to a crash.
import {
  appendEvent,
  getCategoryMap,
  cleanupOldData,
  syncPendingEvents
} from "./storage.js";
import { classifyDomain } from "./categories.js";


const CHECKPOINT_ALARM = "ltt-checkpoint";
const CLEANUP_ALARM = "ltt-cleanup";
const IDLE_THRESHOLD_SECONDS = 60;
const SYNC_ALARM = "ltt-sync";

// In-memory mirror of chrome.storage.session's "currentSession".
let currentSession = null; // { tabId, windowId, domain, category, startTime }
let isIdle = false;
let isWindowFocused = true;

function isTrackableUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

async function loadSessionFromStorage() {
  const data = await chrome.storage.session.get("currentSession");
  currentSession = data.currentSession || null;
}

async function saveSessionToStorage() {
  if (currentSession) {
    await chrome.storage.session.set({ currentSession });
  } else {
    await chrome.storage.session.remove("currentSession");
  }
}

/** Close the current session, writing out an event for the elapsed time. */
async function closeSession(endTime = Date.now()) {
  if (!currentSession) return;

  const durationSeconds = Math.max(
    0,
    Math.round((endTime - currentSession.startTime) / 1000)
  );

  if (durationSeconds > 0) {
    await appendEvent({
      timestamp: new Date(currentSession.startTime).toISOString(),
      domain: currentSession.domain,
      duration_seconds: durationSeconds,
      category: currentSession.category,
    });
  }

  currentSession = null;
  await saveSessionToStorage();
}

/** Flush elapsed time for a still-open session, then keep it running. */
async function checkpointSession(now = Date.now()) {
  if (!currentSession) return;

  const durationSeconds = Math.max(
    0,
    Math.round((now - currentSession.startTime) / 1000)
  );

  if (durationSeconds > 0) {
    await appendEvent({
      timestamp: new Date(currentSession.startTime).toISOString(),
      domain: currentSession.domain,
      duration_seconds: durationSeconds,
      category: currentSession.category,
    });
  }

  currentSession.startTime = now;
  await saveSessionToStorage();
}

async function startSession(tabId, windowId, url) {
  const domain = getDomain(url);
  if (!domain) return;

  const categoryMap = await getCategoryMap();
  const category = classifyDomain(domain, categoryMap);

  currentSession = { tabId, windowId, domain, category, startTime: Date.now() };
  await saveSessionToStorage();
}

function shouldTrack() {
  return !isIdle && isWindowFocused;
}

/**
 * Central decision point: figure out what (if anything) should currently
 * be tracked, and reconcile currentSession with reality. Called on every
 * relevant browser event.
 */
async function refreshActiveTab() {
  await loadSessionFromStorage();

  if (!shouldTrack()) {
    await closeSession();
    return;
  }

  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  } catch {
    tab = null;
  }

  if (!tab || !isTrackableUrl(tab.url)) {
    await closeSession();
    return;
  }

  const domain = getDomain(tab.url);

  // Already tracking exactly this tab + domain: nothing to do.
  if (currentSession && currentSession.tabId === tab.id && currentSession.domain === domain) {
    return;
  }

  await closeSession();
  await startSession(tab.id, tab.windowId, tab.url);
}

// --- Event wiring -----------------------------------------------------

chrome.tabs.onActivated.addListener(() => {
  refreshActiveTab();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    refreshActiveTab();
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await loadSessionFromStorage();
  if (currentSession && currentSession.tabId === tabId) {
    await closeSession();
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  isWindowFocused = windowId !== chrome.windows.WINDOW_ID_NONE;
  await refreshActiveTab();
});

chrome.idle.onStateChanged.addListener(async (state) => {
  isIdle = state !== "active";
  await refreshActiveTab();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {

  if (alarm.name === CHECKPOINT_ALARM) {

    await loadSessionFromStorage();
    await checkpointSession();

  } else if (alarm.name === SYNC_ALARM) {

    await syncPendingEvents();

  } else if (alarm.name === CLEANUP_ALARM) {

    await cleanupOldData();
  }
});

async function initialize() {
  chrome.idle.setDetectionInterval(IDLE_THRESHOLD_SECONDS);

  chrome.alarms.create(CHECKPOINT_ALARM, { periodInMinutes: 1 });

  // Retry unsynced events every minute
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 1 });

  chrome.alarms.create(CLEANUP_ALARM, { periodInMinutes: 60 * 24 });

  // Try syncing any pending events immediately
  await syncPendingEvents();

  await refreshActiveTab();
}


chrome.runtime.onInstalled.addListener(() => {
  initialize();
});

chrome.runtime.onStartup.addListener(() => {
  // Browser just (re)started. chrome.storage.session is cleared
  // automatically by Chrome on browser restart, so currentSession will
  // correctly come back empty -- no stale session to worry about.
  initialize();
});
