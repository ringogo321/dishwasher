import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const STORAGE_KEY = "dishwasher.v0.21";
const TIME_ZONE = "Europe/Dublin";
const DAILY_GOAL = 5;
const WEEKLY_GOAL = 35;
const INACTIVITY_DAYS = 30;
const INACTIVITY_MS = INACTIVITY_DAYS * 24 * 60 * 60 * 1000;

const CATEGORIES = [
  "Bathroom",
  "Kitchen",
  "Living room",
  "Bedrooms",
  "Office",
];

const firebaseConfig = {
  apiKey: "AIzaSyA0tLd4S_2DnHx7LYz8AFsrPXLw4F9jZ2U",
  authDomain: "dishwasher-e03d6.firebaseapp.com",
  projectId: "dishwasher-e03d6",
  storageBucket: "dishwasher-e03d6.firebasestorage.app",
  messagingSenderId: "743352111363",
  appId: "1:743352111363:web:5e5e5b97788b1c92411936",
  measurementId: "G-5249P2BFXR",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const CLEANING_EMOJIS = [
  "🍽️",
  "🥣",
  "🧼",
  "🧹",
  "🧽",
  "🧺",
  "🧻",
  "🧴",
  "🪣",
  "🪥",
  "🧯",
  "🧤",
  "🗑️",
  "🧊",
  "🧪",
  "🧫",
  "🪟",
  "🚿",
  "🛁",
  "🚽",
  "🛏️",
  "🪠",
];

const defaultChores = [
  { id: cryptoRandomId(), title: "Bathroom · Full clean", points: 0, cooldownMinutes: 5 * 24 * 60, emoji: "🧼", active: true, category: "Bathroom", isBundle: true, includes: [] },
  { id: cryptoRandomId(), title: "Bathroom · Toilet", points: 2, cooldownMinutes: 2 * 24 * 60, emoji: "🚽", active: true, category: "Bathroom", isBundle: false, includes: [] },
  { id: cryptoRandomId(), title: "Bathroom · Shower", points: 2, cooldownMinutes: 2 * 24 * 60, emoji: "🚿", active: true, category: "Bathroom", isBundle: false, includes: [] },
  { id: cryptoRandomId(), title: "Bathroom · Sink", points: 1, cooldownMinutes: 24 * 60, emoji: "🧼", active: true, category: "Bathroom", isBundle: false, includes: [] },
  { id: cryptoRandomId(), title: "Bathroom · Floor", points: 2, cooldownMinutes: 3 * 24 * 60, emoji: "🧹", active: true, category: "Bathroom", isBundle: false, includes: [] },

  { id: cryptoRandomId(), title: "Kitchen · Full clean", points: 0, cooldownMinutes: 3 * 24 * 60, emoji: "🍽️", active: true, category: "Kitchen", isBundle: true, includes: [] },
  { id: cryptoRandomId(), title: "Kitchen · Load dishwasher", points: 1, cooldownMinutes: 120, emoji: "🍽️", active: true, category: "Kitchen", isBundle: false, includes: [] },
  { id: cryptoRandomId(), title: "Kitchen · Empty dishwasher", points: 1, cooldownMinutes: 120, emoji: "🥣", active: true, category: "Kitchen", isBundle: false, includes: [] },
  { id: cryptoRandomId(), title: "Kitchen · Counters", points: 2, cooldownMinutes: 24 * 60, emoji: "🧽", active: true, category: "Kitchen", isBundle: false, includes: [] },
  { id: cryptoRandomId(), title: "Kitchen · Bins out", points: 2, cooldownMinutes: 24 * 60, emoji: "🗑️", active: true, category: "Kitchen", isBundle: false, includes: [] },

  { id: cryptoRandomId(), title: "Living room · Full clean", points: 0, cooldownMinutes: 4 * 24 * 60, emoji: "🧹", active: true, category: "Living room", isBundle: true, includes: [] },
  { id: cryptoRandomId(), title: "Living room · Vacuum", points: 3, cooldownMinutes: 2 * 24 * 60, emoji: "🧹", active: true, category: "Living room", isBundle: false, includes: [] },
  { id: cryptoRandomId(), title: "Living room · Dusting", points: 2, cooldownMinutes: 2 * 24 * 60, emoji: "🧽", active: true, category: "Living room", isBundle: false, includes: [] },
  { id: cryptoRandomId(), title: "Living room · Tidy", points: 1, cooldownMinutes: 12 * 60, emoji: "🧺", active: true, category: "Living room", isBundle: false, includes: [] },

  { id: cryptoRandomId(), title: "Bedrooms · Full clean", points: 0, cooldownMinutes: 5 * 24 * 60, emoji: "🛏️", active: true, category: "Bedrooms", isBundle: true, includes: [] },
  { id: cryptoRandomId(), title: "Bedrooms · Make bed", points: 1, cooldownMinutes: 12 * 60, emoji: "🛏️", active: true, category: "Bedrooms", isBundle: false, includes: [] },
  { id: cryptoRandomId(), title: "Bedrooms · Vacuum", points: 2, cooldownMinutes: 3 * 24 * 60, emoji: "🧹", active: true, category: "Bedrooms", isBundle: false, includes: [] },
  { id: cryptoRandomId(), title: "Bedrooms · Laundry", points: 2, cooldownMinutes: 2 * 24 * 60, emoji: "🧺", active: true, category: "Bedrooms", isBundle: false, includes: [] },

  { id: cryptoRandomId(), title: "Office · Full clean", points: 0, cooldownMinutes: 5 * 24 * 60, emoji: "🧽", active: true, category: "Office", isBundle: true, includes: [] },
  { id: cryptoRandomId(), title: "Office · Desk wipe", points: 1, cooldownMinutes: 24 * 60, emoji: "🧽", active: true, category: "Office", isBundle: false, includes: [] },
  { id: cryptoRandomId(), title: "Office · Floor", points: 2, cooldownMinutes: 3 * 24 * 60, emoji: "🧹", active: true, category: "Office", isBundle: false, includes: [] },
];

const state = {
  householdId: null,
  household: null,
  users: [],
  chores: [],
  logs: [],
  currentUserId: null,
  uid: null,
  unsubscribers: [],
};

const $ = (id) => document.getElementById(id);

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function saveLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setLocalHousehold(householdId, currentUserId) {
  saveLocal({ householdId, currentUserId });
}

function getLocalHousehold() {
  return loadLocal();
}

function clearLocalHousehold() {
  localStorage.removeItem(STORAGE_KEY);
}

function formatIST(date) {
  return new Intl.DateTimeFormat("en-IE", {
    timeZone: TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getDatePartsInTZ(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = getDatePartsInTZ(date, timeZone);
  const utcTime = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return utcTime - date.getTime();
}

function zonedTimeToUtc(year, month, day, hour, minute, second, timeZone) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

function getWeekStartIST(date) {
  const parts = getDatePartsInTZ(date, TIME_ZONE);
  const weekdayProbe = zonedTimeToUtc(parts.year, parts.month, parts.day, 12, 0, 0, TIME_ZONE);
  const weekday = weekdayProbe.getUTCDay();
  const mondayIndex = 1;
  let delta = weekday === 0 ? 6 : weekday - mondayIndex;
  if (weekday === 1 && parts.hour < 5) {
    delta = 7;
  }
  const mondayFiveIST = zonedTimeToUtc(parts.year, parts.month, parts.day, 5, 0, 0, TIME_ZONE);
  const weekStart = new Date(mondayFiveIST.getTime() - delta * 24 * 60 * 60 * 1000);
  return weekStart;
}

function getDayStartIST(date) {
  const parts = getDatePartsInTZ(date, TIME_ZONE);
  return zonedTimeToUtc(parts.year, parts.month, parts.day, 0, 0, 0, TIME_ZONE);
}

function getWeekKey(date) {
  return getWeekStartIST(date).toISOString();
}

function getMonthKey(date) {
  const parts = getDatePartsInTZ(date, TIME_ZONE);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
}

function parseCooldown(value) {
  if (!value) return null;
  const text = value.trim().toLowerCase();
  const match = text.match(/(\d+(?:\.\d+)?)(\s*)(m|h|d|minute|minutes|hour|hours|day|days)$/);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[3];
  if (Number.isNaN(amount)) return null;
  if (unit.startsWith("m")) return Math.round(amount);
  if (unit.startsWith("h")) return Math.round(amount * 60);
  if (unit.startsWith("d")) return Math.round(amount * 24 * 60);
  return null;
}

function formatCooldownMinutes(minutes) {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / (24 * 60))}d`;
}

function timeUntil(timestamp) {
  const diff = Math.max(0, timestamp - Date.now());
  const mins = Math.ceil(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.ceil(mins / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.ceil(hours / 24);
  return `${days}d`;
}

function normalizeChore(chore) {
  return {
    ...chore,
    category: chore.category || "Other",
    isBundle: Boolean(chore.isBundle),
    includes: Array.isArray(chore.includes) ? chore.includes : [],
  };
}

async function touchHousehold(householdRef) {
  try {
    await updateDoc(householdRef, { lastActivity: serverTimestamp() });
  } catch {
    // Ignore if missing permissions or household removed.
  }
}

async function deleteHouseholdIfInactive(householdRef, householdData) {
  const lastActivity = toDate(householdData?.lastActivity || householdData?.createdAt);
  if (!lastActivity) return false;
  if (Date.now() - lastActivity.getTime() < INACTIVITY_MS) return false;
  await deleteHousehold(householdRef);
  clearLocalHousehold();
  resetSubscriptions();
  setState({ householdId: null, household: null, users: [], chores: [], logs: [], currentUserId: null });
  alert("Household removed due to 30 days of inactivity.");
  render();
  return true;
}

async function deleteHouseholdIfEmpty(householdRef) {
  const usersSnap = await getDocs(collection(householdRef, "users"));
  const activeUsers = usersSnap.docs.filter((docSnap) => docSnap.data().active !== false);
  if (activeUsers.length > 0) return;
  await deleteHousehold(householdRef);
}

async function deleteHousehold(householdRef) {
  const collections = ["users", "chores", "logs"];
  for (const col of collections) {
    const snap = await getDocs(collection(householdRef, col));
    for (const docSnap of snap.docs) {
      await deleteDoc(docSnap.ref);
    }
  }
  await deleteDoc(householdRef);
}

function guessCategory(title = "") {
  const text = title.toLowerCase();
  if (text.includes("bathroom")) return "Bathroom";
  if (text.includes("kitchen") || text.includes("dishwasher")) return "Kitchen";
  if (text.includes("living") || text.includes("lounge")) return "Living room";
  if (text.includes("bed")) return "Bedrooms";
  if (text.includes("office")) return "Office";
  return "Kitchen";
}

function ensureChoreSchema(chore, householdRef) {
  const updates = {};
  if (!chore.category) updates.category = guessCategory(chore.title);
  if (typeof chore.isBundle !== "boolean") updates.isBundle = chore.title.toLowerCase().includes("full");
  if (!Array.isArray(chore.includes)) updates.includes = [];
  if (Object.keys(updates).length === 0) return;
  updateDoc(doc(householdRef, "chores", chore.id), updates);
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  return new Date(value);
}

function computeWeeklyScores(logs) {
  const weekKey = getWeekKey(new Date());
  const weekStart = new Date(weekKey);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const scores = new Map();
  for (const user of state.users) scores.set(user.id, 0);
  for (const log of logs) {
    const loggedAt = toDate(log.loggedAt);
    if (!loggedAt) continue;
    if (loggedAt >= weekStart && loggedAt < weekEnd) {
      scores.set(log.userId, (scores.get(log.userId) || 0) + log.points);
    }
  }
  return { weekStart, scores };
}

function computeDailyScores(logs) {
  const dayStart = getDayStartIST(new Date());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const scores = new Map();
  for (const user of state.users) scores.set(user.id, 0);
  for (const log of logs) {
    const loggedAt = toDate(log.loggedAt);
    if (!loggedAt) continue;
    if (loggedAt >= dayStart && loggedAt < dayEnd) {
      scores.set(log.userId, (scores.get(log.userId) || 0) + log.points);
    }
  }
  return { dayStart, scores };
}

function computeWeeklyAwards(scores) {
  const entries = Array.from(scores.entries());
  const values = entries.map(([, value]) => value);
  const max = Math.max(...values, 0);
  const winners = entries.filter(([, value]) => value === max && max > 0);
  const awards = new Map();
  for (const [userId] of entries) awards.set(userId, 0);
  if (winners.length === 1) {
    awards.set(winners[0][0], 3);
  } else if (winners.length > 1) {
    for (const [userId] of winners) awards.set(userId, 2);
  }
  for (const [userId, score] of entries) {
    if (max > 0 && max - score <= 3 && awards.get(userId) === 0) {
      awards.set(userId, 1);
    }
  }
  return awards;
}

function computeYearlyLeague(logs) {
  const year = getDatePartsInTZ(new Date(), TIME_ZONE).year;
  const weeklyBuckets = new Map();
  for (const log of logs) {
    const logDate = toDate(log.loggedAt);
    if (!logDate) continue;
    const logYear = getDatePartsInTZ(logDate, TIME_ZONE).year;
    if (logYear !== year) continue;
    const key = getWeekKey(logDate);
    if (!weeklyBuckets.has(key)) weeklyBuckets.set(key, new Map());
    const bucket = weeklyBuckets.get(key);
    bucket.set(log.userId, (bucket.get(log.userId) || 0) + log.points);
  }

  const leaguePoints = new Map();
  for (const user of state.users) leaguePoints.set(user.id, 0);
  for (const bucket of weeklyBuckets.values()) {
    for (const user of state.users) {
      if (!bucket.has(user.id)) bucket.set(user.id, 0);
    }
    const weeklyAwards = computeWeeklyAwards(bucket);
    for (const [userId, award] of weeklyAwards.entries()) {
      leaguePoints.set(userId, (leaguePoints.get(userId) || 0) + award);
    }
  }

  return { year, leaguePoints };
}

function computeMonthlyBadges(logs) {
  const monthBuckets = new Map();
  for (const log of logs) {
    const logDate = toDate(log.loggedAt);
    if (!logDate) continue;
    const monthKey = getMonthKey(logDate);
    if (!monthBuckets.has(monthKey)) monthBuckets.set(monthKey, new Map());
    const bucket = monthBuckets.get(monthKey);
    bucket.set(log.userId, (bucket.get(log.userId) || 0) + log.points);
  }
  const badges = [];
  for (const [monthKey, bucket] of monthBuckets.entries()) {
    let topScore = 0;
    for (const value of bucket.values()) topScore = Math.max(topScore, value);
    if (topScore === 0) continue;
    for (const [userId, score] of bucket.entries()) {
      if (score === topScore) badges.push({ monthKey, userId, score });
    }
  }
  return badges;
}

function computeDailyStreaks(logs) {
  const streaks = new Map();
  const byUser = new Map();
  for (const user of state.users) byUser.set(user.id, []);
  for (const log of logs) {
    const logDate = toDate(log.loggedAt);
    if (!logDate) continue;
    byUser.get(log.userId)?.push(logDate);
  }
  for (const [userId, dates] of byUser.entries()) {
    if (!dates.length) {
      streaks.set(userId, 0);
      continue;
    }
    dates.sort((a, b) => a - b);
    let streak = 0;
    let dayPointer = getDayStartIST(new Date());
    for (;;) {
      const dayEnd = new Date(dayPointer.getTime() + 24 * 60 * 60 * 1000);
      const dayPoints = logs
        .filter((log) => log.userId === userId)
        .reduce((sum, log) => {
          const logDate = toDate(log.loggedAt);
          if (logDate >= dayPointer && logDate < dayEnd) return sum + log.points;
          return sum;
        }, 0);
      if (dayPoints >= DAILY_GOAL) {
        streak += 1;
        dayPointer = new Date(dayPointer.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
    streaks.set(userId, streak);
  }
  return streaks;
}

function populateEmojiSelects() {
  const targets = ["createUserEmoji", "joinUserEmoji", "newMemberEmoji", "newChoreEmoji"];
  for (const id of targets) {
    const select = $(id);
    if (!select) continue;
    select.innerHTML = "";
    for (const emoji of CLEANING_EMOJIS) {
      const option = document.createElement("option");
      option.value = emoji;
      option.textContent = emoji;
      select.appendChild(option);
    }
  }
}

function populateCategorySelects() {
  const target = $("newChoreCategory");
  if (!target) return;
  target.innerHTML = "";
  for (const category of CATEGORIES) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    target.appendChild(option);
  }
}

function populateRoomSelect() {
  const target = $("roomSelect");
  if (!target) return;
  const current = target.value || "all";
  target.innerHTML = "";
  const optionAll = document.createElement("option");
  optionAll.value = "all";
  optionAll.textContent = "All rooms";
  target.appendChild(optionAll);
  for (const category of CATEGORIES) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    target.appendChild(option);
  }
  target.value = CATEGORIES.includes(current) || current === "all" ? current : "all";
}

function setState(partial) {
  Object.assign(state, partial);
}

function resetSubscriptions() {
  state.unsubscribers.forEach((unsub) => unsub());
  state.unsubscribers = [];
}

async function subscribeToHousehold(householdId) {
  resetSubscriptions();
  const householdRef = doc(db, "households", householdId);
  const householdSnap = await getDoc(householdRef);
  if (!householdSnap.exists()) {
    alert("Household not found.");
    clearLocalHousehold();
    return;
  }

  const householdData = householdSnap.data();
  if (await deleteHouseholdIfInactive(householdRef, householdData)) return;

  setState({ householdId, household: { id: householdId, ...householdData } });

  state.unsubscribers.push(
    onSnapshot(collection(householdRef, "users"), (snapshot) => {
      const users = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((user) => user.active !== false);
      setState({ users });
      if (!state.currentUserId && state.uid) {
        const existing = users.find((u) => u.authUid === state.uid);
        if (existing) state.currentUserId = existing.id;
      }
      if (state.currentUserId && !users.find((u) => u.id === state.currentUserId)) {
        state.currentUserId = users[0]?.id || null;
      }
      render();
    })
  );

  state.unsubscribers.push(
    onSnapshot(collection(householdRef, "chores"), (snapshot) => {
      const chores = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      chores.forEach((chore) => ensureChoreSchema(chore, householdRef));
      setState({ chores });
      render();
    })
  );

  state.unsubscribers.push(
    onSnapshot(collection(householdRef, "logs"), (snapshot) => {
      const logs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setState({ logs });
      render();
    })
  );
}

async function createHousehold({ name, userName, userEmoji }) {
  const householdId = `DW-${cryptoRandomId()}`;
  const householdRef = doc(db, "households", householdId);
  const photoData = await readHouseholdPhoto($("createHouseholdPhoto"));
  await setDoc(householdRef, {
    name: name || "Household",
    timezone: TIME_ZONE,
    createdAt: serverTimestamp(),
    lastActivity: serverTimestamp(),
    photoData: photoData || null,
  });

  const userId = cryptoRandomId();
  await setDoc(doc(householdRef, "users", userId), {
    name: userName || "You",
    emoji: userEmoji || "✨",
    joinedAt: serverTimestamp(),
    authUid: state.uid,
    active: true,
  });

  for (const chore of defaultChores) {
    await setDoc(doc(householdRef, "chores", chore.id), chore);
  }

  for (const chore of defaultChores.filter((c) => c.isBundle)) {
    const includes = defaultChores
      .filter((child) => !child.isBundle && child.category === chore.category)
      .map((child) => child.id);
    await updateDoc(doc(householdRef, "chores", chore.id), { includes });
  }

  await touchHousehold(householdRef);

  setState({ currentUserId: userId });
  setLocalHousehold(householdId, userId);
  await subscribeToHousehold(householdId);
}

async function joinHousehold({ joinCode, userName, userEmoji }) {
  const householdRef = doc(db, "households", joinCode);
  const snap = await getDoc(householdRef);
  if (!snap.exists()) {
    alert("Join code not found.");
    return;
  }

  const userId = cryptoRandomId();
  await setDoc(doc(householdRef, "users", userId), {
    name: userName || "Guest",
    emoji: userEmoji || "✨",
    joinedAt: serverTimestamp(),
    authUid: state.uid,
    active: true,
  });

  await touchHousehold(householdRef);

  setState({ currentUserId: userId });
  setLocalHousehold(joinCode, userId);
  await subscribeToHousehold(joinCode);
}

async function logChore(chore) {
  const householdRef = doc(db, "households", state.householdId);
  await touchHousehold(householdRef);
  await addDoc(collection(householdRef, "logs"), {
    userId: state.currentUserId,
    choreId: chore.id,
    points: chore.points,
    loggedAt: serverTimestamp(),
  });
}

async function logBundle(bundle) {
  const includes = Array.isArray(bundle.includes) ? bundle.includes : [];
  if (!includes.length) {
    alert("No chores included in this bundle yet. Edit it to choose chores.");
    return;
  }
  const householdRef = doc(db, "households", state.householdId);
  const now = Date.now();
  const skipped = [];
  let loggedCount = 0;
  for (const childId of includes) {
    const child = state.chores.find((c) => c.id === childId);
    if (!child) continue;
    const lastLog = state.logs
      .filter((log) => log.userId === state.currentUserId && log.choreId === child.id)
      .sort((a, b) => toDate(b.loggedAt) - toDate(a.loggedAt))[0];
    const lastDate = lastLog ? toDate(lastLog.loggedAt) : null;
    const cooldownUntil = lastDate ? lastDate.getTime() + child.cooldownMinutes * 60000 : 0;
    if (now < cooldownUntil) {
      skipped.push(child.title);
      continue;
    }
    await addDoc(collection(householdRef, "logs"), {
      userId: state.currentUserId,
      choreId: child.id,
      points: child.points,
      loggedAt: serverTimestamp(),
    });
    loggedCount += 1;
  }
  if (loggedCount > 0) {
    await addDoc(collection(householdRef, "logs"), {
      userId: state.currentUserId,
      choreId: bundle.id,
      points: 0,
      loggedAt: serverTimestamp(),
    });
  }
  if (skipped.length) {
    alert(`Some chores were skipped due to cooldown: ${skipped.join(", ")}`);
  }
}

function render() {
  const landing = $("landing");
  const appPanel = $("app");

  if (!state.householdId || !state.household) {
    landing.classList.remove("hidden");
    appPanel.classList.add("hidden");
    $("householdChipText").textContent = "No household";
    renderHouseholdAvatar(null);
    return;
  }

  populateRoomSelect();

  landing.classList.add("hidden");
  appPanel.classList.remove("hidden");
  $("householdName").textContent = state.household.name;
  $("householdChipText").textContent = `${state.household.name} · ${state.users.length} members`;
  renderHouseholdAvatar(state.household.photoData);
  $("editHouseholdName").value = state.household.name;
  $("joinCodeDisplay").textContent = state.householdId;
  renderQrCode(state.householdId);

  const userSelect = $("userSelect");
  userSelect.innerHTML = "";
  for (const user of state.users) {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = `${user.emoji || "✨"} ${user.name}`;
    if (user.id === state.currentUserId) option.selected = true;
    userSelect.appendChild(option);
  }

  const choreList = $("choreList");
  choreList.innerHTML = "";
  const currentUserId = state.currentUserId;
  const selectedRoom = $("roomSelect")?.value || "all";
  const choresByCategory = {};
  for (const rawChore of state.chores.filter((c) => c.active)) {
    const chore = normalizeChore(rawChore);
    const category = chore.category || "Other";
    if (selectedRoom !== "all" && category !== selectedRoom) continue;
    if (!choresByCategory[category]) choresByCategory[category] = [];
    choresByCategory[category].push(chore);
  }

  const orderedCategories = [
    ...CATEGORIES.filter((cat) => choresByCategory[cat]),
    ...Object.keys(choresByCategory).filter((cat) => !CATEGORIES.includes(cat)),
  ];
  orderedCategories.forEach((category) => {
    const details = document.createElement("details");
    details.className = "accordion";
    details.open = selectedRoom === "all" ? false : category === selectedRoom;
    const summary = document.createElement("summary");
    summary.innerHTML = `<span>${category}</span><span class="chevron">▾</span>`;
    details.appendChild(summary);
    const body = document.createElement("div");
    body.className = "accordion-body";

    const chores = choresByCategory[category].slice();
    chores.sort((a, b) => Number(b.isBundle) - Number(a.isBundle));
    for (const chore of chores) {
      const lastLog = state.logs
        .filter((log) => log.userId === currentUserId && log.choreId === chore.id)
        .sort((a, b) => toDate(b.loggedAt) - toDate(a.loggedAt))[0];
      const lastDate = lastLog ? toDate(lastLog.loggedAt) : null;
      const cooldownUntil = lastDate ? lastDate.getTime() + chore.cooldownMinutes * 60000 : 0;
      const ready = Date.now() >= cooldownUntil;

      const card = document.createElement("div");
      card.className = "mini-card";
      card.innerHTML = `
        <div class="mini-title">
          <div>${chore.emoji || "✨"} ${chore.title.replace(/^.*?·\\s*/, "")}</div>
          <div class="point-pill">${chore.isBundle ? "Bundle" : `+${chore.points}`}</div>
        </div>
        <div class="cooldown">Cooldown: ${formatCooldownMinutes(chore.cooldownMinutes)}</div>
        <div class="cooldown">${ready ? "Available now" : `Ready in ${timeUntil(cooldownUntil)}`}</div>
        ${chore.isBundle ? `<div class="bundle-note">Logs all included chores that are available.</div>` : ""}
      `;
      const button = document.createElement("button");
      button.className = "btn";
      button.textContent = ready ? (chore.isBundle ? "Log full clean" : "Log done") : "Cooling down";
      button.disabled = !ready;
      button.addEventListener("click", async () => {
        if (!confirm(`Log ${chore.title}?`)) return;
        if (chore.isBundle) {
          await logBundle(chore);
        } else {
          await logChore(chore);
        }
      });
      card.appendChild(button);
      body.appendChild(card);
    }

    details.appendChild(body);
    choreList.appendChild(details);
  });

  const { weekStart, scores } = computeWeeklyScores(state.logs);
  const dailyScores = computeDailyScores(state.logs);
  const weeklyAwards = computeWeeklyAwards(scores);
  const dailyStreaks = computeDailyStreaks(state.logs);

  const weeklyLeague = $("weeklyLeague");
  weeklyLeague.innerHTML = "";
  const weeklyEntries = state.users.map((user) => ({
    user,
    score: scores.get(user.id) || 0,
    award: weeklyAwards.get(user.id) || 0,
    daily: dailyScores.scores.get(user.id) || 0,
    streak: dailyStreaks.get(user.id) || 0,
  }));
  weeklyEntries.sort((a, b) => b.score - a.score);
  for (const entry of weeklyEntries) {
    const card = document.createElement("div");
    card.className = "card league-stack";
    const dailyPct = Math.min(100, Math.round((entry.daily / DAILY_GOAL) * 100));
    const weeklyPct = Math.min(100, Math.round((entry.score / WEEKLY_GOAL) * 100));
    card.innerHTML = `
      <div class="league-row">
        <div>${entry.user.emoji || "✨"} ${entry.user.name}</div>
        <div>${entry.score} pts · +${entry.award} league</div>
      </div>
      <div class="progress-wrap">
        <div class="progress-label">Daily goal ${entry.daily}/${DAILY_GOAL} · Streak ${entry.streak} days 🔥</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${dailyPct}%"></div></div>
      </div>
      <div class="progress-wrap">
        <div class="progress-label">Weekly goal ${entry.score}/${WEEKLY_GOAL}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${weeklyPct}%"></div></div>
      </div>
    `;
    weeklyLeague.appendChild(card);
  }

  $("weekMeta").textContent = `Week starts ${formatIST(weekStart)} · resets Monday 5:00 AM IST`;

  const yearly = computeYearlyLeague(state.logs);
  const yearlyLeague = $("yearlyLeague");
  yearlyLeague.innerHTML = "";
  const yearlyEntries = state.users.map((user) => ({
    user,
    score: yearly.leaguePoints.get(user.id) || 0,
  }));
  yearlyEntries.sort((a, b) => b.score - a.score);
  for (const entry of yearlyEntries) {
    const card = document.createElement("div");
    card.className = "card league-row";
    card.innerHTML = `
      <div>${entry.user.emoji || "✨"} ${entry.user.name}</div>
      <div>${entry.score} league points (${yearly.year})</div>
    `;
    yearlyLeague.appendChild(card);
  }

  const badgesGrid = $("badgesGrid");
  badgesGrid.innerHTML = "";
  const monthlyBadges = computeMonthlyBadges(state.logs);
  if (monthlyBadges.length === 0) {
    badgesGrid.innerHTML = `<div class="card">Log chores to earn badges.</div>`;
  } else {
    for (const badge of monthlyBadges) {
      const user = state.users.find((u) => u.id === badge.userId);
      const card = document.createElement("div");
      card.className = "card badge";
      card.innerHTML = `
        <div class="badge-icon">🏅</div>
        <div>
          <div><strong>${user ? user.name : "Member"}</strong></div>
          <div class="cooldown">Monthly winner ${badge.monthKey} · ${badge.score} pts</div>
        </div>
      `;
      badgesGrid.appendChild(card);
    }
  }

  const leagueTitleCard = document.createElement("div");
  leagueTitleCard.className = "card badge";
  const top = yearlyEntries[0];
  leagueTitleCard.innerHTML = `
    <div class="badge-icon">🏆</div>
    <div>
      <div><strong>${top ? top.user.name : "No champion yet"}</strong></div>
      <div class="cooldown">League title ${yearly.year}</div>
    </div>
  `;
  badgesGrid.appendChild(leagueTitleCard);

  const memberList = $("memberList");
  memberList.innerHTML = "";
  for (const user of state.users) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="row">
        <input data-name value="${user.name}" />
        <select data-emoji></select>
      </div>
      <div class="row">
        <button class="btn" data-save="${user.id}">Save</button>
        <button class="btn" data-remove="${user.id}">Remove</button>
      </div>
    `;
    const emojiSelect = card.querySelector("[data-emoji]");
    CLEANING_EMOJIS.forEach((emoji) => {
      const option = document.createElement("option");
      option.value = emoji;
      option.textContent = emoji;
      if (emoji === user.emoji) option.selected = true;
      emojiSelect.appendChild(option);
    });

    card.querySelector("[data-save]").addEventListener("click", async () => {
      const name = card.querySelector("[data-name]").value.trim();
      const emoji = card.querySelector("[data-emoji]").value;
      if (!name) return;
      const householdRef = doc(db, "households", state.householdId);
      await updateDoc(doc(householdRef, "users", user.id), { name, emoji });
      await touchHousehold(householdRef);
      if (state.currentUserId === user.id) {
        setLocalHousehold(state.householdId, state.currentUserId);
      }
    });
    card.querySelector("[data-remove]").addEventListener("click", async () => {
      if (state.users.length === 1) return alert("At least one member required.");
      const householdRef = doc(db, "households", state.householdId);
      await updateDoc(doc(householdRef, "users", user.id), { active: false });
      await touchHousehold(householdRef);
      await deleteHouseholdIfEmpty(householdRef);
    });
    memberList.appendChild(card);
  }

  const choreEditList = $("choreEditList");
  choreEditList.innerHTML = "";
  for (const rawChore of state.chores) {
    const chore = normalizeChore(rawChore);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="chore-meta">
        <div class="chore-title">${chore.title}</div>
        <div class="point-pill">${chore.isBundle ? "Bundle" : `${chore.points} pts`}</div>
      </div>
      <div class="row">
        <input data-title value="${chore.title}" />
        <input data-points type="number" min="1" value="${chore.points}" />
        <input data-cooldown value="${formatCooldownMinutes(chore.cooldownMinutes)}" />
        <select data-category></select>
        <select data-emoji></select>
      </div>
      <label class="field checkbox">
        <input data-bundle type="checkbox" ${chore.isBundle ? "checked" : ""} />
        <span>Full clean bundle</span>
      </label>
      <div class="include-list" data-includes></div>
      <div class="row">
        <button class="btn" data-save="${chore.id}">Save</button>
        <button class="btn" data-toggle="${chore.id}">${chore.active ? "Disable" : "Enable"}</button>
      </div>
    `;
    const emojiSelect = card.querySelector("[data-emoji]");
    CLEANING_EMOJIS.forEach((emoji) => {
      const option = document.createElement("option");
      option.value = emoji;
      option.textContent = emoji;
      if (emoji === chore.emoji) option.selected = true;
      emojiSelect.appendChild(option);
    });

    const categorySelect = card.querySelector("[data-category]");
    const categoryOptions = CATEGORIES.includes(chore.category)
      ? CATEGORIES
      : [...CATEGORIES, chore.category];
    categoryOptions.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      if (category === chore.category) option.selected = true;
      categorySelect.appendChild(option);
    });

    const includesContainer = card.querySelector("[data-includes]");
    const bundleCheckbox = card.querySelector("[data-bundle]");
    const buildIncludes = () => {
      includesContainer.innerHTML = "";
      if (!bundleCheckbox.checked) return;
      const sameCategory = state.chores
        .map((c) => normalizeChore(c))
        .filter((c) => c.category === categorySelect.value && !c.isBundle);
      for (const child of sameCategory) {
        const item = document.createElement("label");
        item.className = "include-item";
        const checked = chore.includes?.includes(child.id);
        item.innerHTML = `<input type="checkbox" value="${child.id}" ${checked ? "checked" : ""} /> ${child.emoji || "✨"} ${child.title}`;
        includesContainer.appendChild(item);
      }
    };
    buildIncludes();
    categorySelect.addEventListener("change", buildIncludes);
    bundleCheckbox.addEventListener("change", buildIncludes);

    card.querySelector("[data-save]").addEventListener("click", async () => {
      const title = card.querySelector("[data-title]").value.trim();
      const points = Number(card.querySelector("[data-points]").value.trim());
      const cooldown = parseCooldown(card.querySelector("[data-cooldown]").value.trim());
      const emoji = card.querySelector("[data-emoji]").value;
      const category = card.querySelector("[data-category]").value;
      const isBundle = card.querySelector("[data-bundle]").checked;
      const includes = Array.from(includesContainer.querySelectorAll("input[type=checkbox]:checked")).map(
        (input) => input.value
      );
      if (!title || (!isBundle && Number.isNaN(points)) || !cooldown) {
        alert("Please provide a title, points, and cooldown like 2h or 5d.");
        return;
      }
      const householdRef = doc(db, "households", state.householdId);
      await updateDoc(doc(householdRef, "chores", chore.id), {
        title,
        points: isBundle ? 0 : points,
        cooldownMinutes: cooldown,
        emoji,
        category,
        isBundle,
        includes,
      });
      await touchHousehold(householdRef);
    });

    card.querySelector("[data-toggle]").addEventListener("click", async () => {
      const householdRef = doc(db, "households", state.householdId);
      await updateDoc(doc(householdRef, "chores", chore.id), { active: !chore.active });
      await touchHousehold(householdRef);
    });

    choreEditList.appendChild(card);
  }
}

function renderQrCode(joinCode) {
  const qrContainer = $("qrCode");
  if (!qrContainer) return;
  qrContainer.innerHTML = "";
  if (!joinCode || typeof QRCode === "undefined") return;
  const joinUrl = `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(joinCode)}`;
  new QRCode(qrContainer, {
    text: joinUrl,
    width: 160,
    height: 160,
    colorDark: "#ff8a1f",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M,
  });
}

function renderHouseholdAvatar(photoData) {
  const img = $("householdAvatar");
  if (!img) return;
  if (photoData) {
    img.src = photoData;
    img.style.display = "block";
  } else {
    img.removeAttribute("src");
    img.style.display = "none";
  }
}

async function readHouseholdPhoto(inputEl) {
  if (!inputEl || !inputEl.files || inputEl.files.length === 0) return null;
  const file = inputEl.files[0];
  if (!file.type.startsWith("image/")) return null;
  const maxBytes = 350 * 1024;
  if (file.size > maxBytes) {
    alert("Please choose an image under 350KB.");
    return null;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(null);
    reader.readAsDataURL(file);
  });
}

function setupEvents() {
  populateEmojiSelects();
  populateCategorySelects();
  populateRoomSelect();

  $("createHouseholdBtn").addEventListener("click", async () => {
    await createHousehold({
      name: $("createHouseholdName").value.trim(),
      userName: $("createUserName").value.trim(),
      userEmoji: $("createUserEmoji").value,
    });
  });

  $("joinHouseholdBtn").addEventListener("click", async () => {
    await joinHousehold({
      joinCode: $("joinCode").value.trim(),
      userName: $("joinUserName").value.trim(),
      userEmoji: $("joinUserEmoji").value,
    });
  });

  $("saveHouseholdBtn").addEventListener("click", async () => {
    if (!state.householdId) return;
    const householdRef = doc(db, "households", state.householdId);
    const photoData = await readHouseholdPhoto($("editHouseholdPhoto"));
    await updateDoc(householdRef, {
      name: $("editHouseholdName").value.trim() || state.household.name,
      lastActivity: serverTimestamp(),
      ...(photoData ? { photoData } : {}),
    });
  });

  $("copyJoinCodeBtn").addEventListener("click", async () => {
    if (!state.householdId) return;
    try {
      await navigator.clipboard.writeText(state.householdId);
      alert("Join code copied.");
    } catch {
      alert(`Join code: ${state.householdId}`);
    }
  });

  $("leaveHouseholdBtn").addEventListener("click", async () => {
    if (!state.householdId || !state.currentUserId) return;
    if (!confirm("Leave this household?")) return;
    const householdRef = doc(db, "households", state.householdId);
    await updateDoc(doc(householdRef, "users", state.currentUserId), { active: false });
    await touchHousehold(householdRef);
    await deleteHouseholdIfEmpty(householdRef);
    clearLocalHousehold();
    resetSubscriptions();
    setState({ householdId: null, household: null, users: [], chores: [], logs: [], currentUserId: null });
    render();
  });

  $("addMemberBtn").addEventListener("click", async () => {
    if (!state.householdId) return;
    const name = $("newMemberName").value.trim();
    if (!name) return;
    const householdRef = doc(db, "households", state.householdId);
    const userId = cryptoRandomId();
    await setDoc(doc(householdRef, "users", userId), {
      name,
      emoji: $("newMemberEmoji").value || "✨",
      joinedAt: serverTimestamp(),
      authUid: null,
      active: true,
    });
    await touchHousehold(householdRef);
    $("newMemberName").value = "";
  });

  $("addChoreBtn").addEventListener("click", async () => {
    if (!state.householdId) return;
    const title = $("newChoreTitle").value.trim();
    const points = Number($("newChorePoints").value.trim());
    const cooldown = parseCooldown($("newChoreCooldown").value.trim());
    const category = $("newChoreCategory").value;
    const isBundle = $("newChoreBundle").checked;
    if (!title || (!isBundle && Number.isNaN(points)) || !cooldown) {
      alert("Please provide a title, points, and cooldown like 2h or 5d.");
      return;
    }
    const householdRef = doc(db, "households", state.householdId);
    await setDoc(doc(householdRef, "chores", cryptoRandomId()), {
      title,
      points: isBundle ? 0 : points,
      cooldownMinutes: cooldown,
      emoji: $("newChoreEmoji").value || "✨",
      category,
      isBundle,
      includes: [],
      active: true,
    });
    await touchHousehold(householdRef);
    $("newChoreTitle").value = "";
    $("newChorePoints").value = "";
    $("newChoreCooldown").value = "";
    $("newChoreBundle").checked = false;
  });

  $("userSelect").addEventListener("change", (event) => {
    state.currentUserId = event.target.value;
    setLocalHousehold(state.householdId, state.currentUserId);
    render();
  });

  const roomSelect = $("roomSelect");
  if (roomSelect) {
    roomSelect.addEventListener("change", () => {
      render();
    });
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.tab;
      $("tab-" + target).classList.add("active");
    });
  });
}

setupEvents();

function handleJoinLink() {
  const params = new URLSearchParams(window.location.search);
  const joinCode = params.get("join");
  if (!joinCode) return;
  $("joinCode").value = joinCode;
  $("joinUserName").focus();
}

handleJoinLink();

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  state.uid = user.uid;
  const stored = getLocalHousehold();
  if (stored?.householdId) {
    state.currentUserId = stored.currentUserId || null;
    await subscribeToHousehold(stored.householdId);
  } else {
    render();
  }
});

signInAnonymously(auth).catch((error) => {
  console.error("Anonymous auth failed", error);
  alert("Sign-in failed. Check Firebase Auth settings.");
});

setInterval(render, 60000);
