const STORAGE_KEY = "dishwasher.v0.2";
const TIME_ZONE = "Europe/Dublin";

const $ = (id) => document.getElementById(id);

const defaultChores = [
  { id: cryptoRandomId(), title: "Load dishwasher", points: 1, cooldownMinutes: 120, emoji: "🍽️", active: true },
  { id: cryptoRandomId(), title: "Empty dishwasher", points: 1, cooldownMinutes: 120, emoji: "🥣", active: true },
  { id: cryptoRandomId(), title: "Bathroom clean", points: 5, cooldownMinutes: 5 * 24 * 60, emoji: "🧼", active: true },
  { id: cryptoRandomId(), title: "Vacuum lounge", points: 3, cooldownMinutes: 2 * 24 * 60, emoji: "🧹", active: true },
  { id: cryptoRandomId(), title: "Bins out", points: 2, cooldownMinutes: 24 * 60, emoji: "🗑️", active: true },
];

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function createHousehold({ name, userName, userEmoji }) {
  const householdId = `DW-${cryptoRandomId()}`;
  const userId = cryptoRandomId();
  const data = {
    household: {
      id: householdId,
      name: name || "Household",
      timezone: TIME_ZONE,
      createdAt: Date.now(),
    },
    users: [
      {
        id: userId,
        name: userName || "You",
        emoji: userEmoji || "✨",
        joinedAt: Date.now(),
      },
    ],
    chores: defaultChores,
    logs: [],
    currentUserId: userId,
  };
  saveData(data);
  return data;
}

function joinHousehold({ joinCode, userName, userEmoji }) {
  const data = loadData();
  if (!data || data.household.id !== joinCode) {
    alert("Join code not found on this device.");
    return null;
  }
  const userId = cryptoRandomId();
  data.users.push({
    id: userId,
    name: userName || "Guest",
    emoji: userEmoji || "✨",
    joinedAt: Date.now(),
  });
  data.currentUserId = userId;
  saveData(data);
  return data;
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

function computeWeeklyScores(data) {
  const weekKey = getWeekKey(new Date());
  const weekStart = new Date(weekKey);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const scores = new Map();
  for (const user of data.users) scores.set(user.id, 0);
  for (const log of data.logs) {
    const loggedAt = new Date(log.loggedAt);
    if (loggedAt >= weekStart && loggedAt < weekEnd) {
      scores.set(log.userId, (scores.get(log.userId) || 0) + log.points);
    }
  }
  return { weekStart, scores };
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

function computeYearlyLeague(data) {
  const year = getDatePartsInTZ(new Date(), TIME_ZONE).year;
  const weeklyBuckets = new Map();
  for (const log of data.logs) {
    const logDate = new Date(log.loggedAt);
    const logYear = getDatePartsInTZ(logDate, TIME_ZONE).year;
    if (logYear !== year) continue;
    const key = getWeekKey(logDate);
    if (!weeklyBuckets.has(key)) weeklyBuckets.set(key, new Map());
    const bucket = weeklyBuckets.get(key);
    bucket.set(log.userId, (bucket.get(log.userId) || 0) + log.points);
  }

  const leaguePoints = new Map();
  for (const user of data.users) leaguePoints.set(user.id, 0);
  for (const bucket of weeklyBuckets.values()) {
    for (const user of data.users) {
      if (!bucket.has(user.id)) bucket.set(user.id, 0);
    }
    const weeklyAwards = computeWeeklyAwards(bucket);
    for (const [userId, award] of weeklyAwards.entries()) {
      leaguePoints.set(userId, (leaguePoints.get(userId) || 0) + award);
    }
  }

  return { year, leaguePoints };
}

function computeMonthlyBadges(data) {
  const monthBuckets = new Map();
  for (const log of data.logs) {
    const logDate = new Date(log.loggedAt);
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

function render() {
  const data = loadData();
  const landing = $("landing");
  const app = $("app");
  if (!data) {
    landing.classList.remove("hidden");
    app.classList.add("hidden");
    $("householdChip").textContent = "No household";
    return;
  }

  landing.classList.add("hidden");
  app.classList.remove("hidden");
  $("householdName").textContent = data.household.name;
  $("householdChip").textContent = `${data.household.name} · ${data.users.length} members`;
  $("editHouseholdName").value = data.household.name;
  $("joinCodeDisplay").textContent = data.household.id;

  const userSelect = $("userSelect");
  userSelect.innerHTML = "";
  for (const user of data.users) {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = `${user.emoji || "✨"} ${user.name}`;
    if (user.id === data.currentUserId) option.selected = true;
    userSelect.appendChild(option);
  }

  const choreList = $("choreList");
  choreList.innerHTML = "";
  const currentUserId = data.currentUserId;
  for (const chore of data.chores.filter((c) => c.active)) {
    const lastLog = data.logs
      .filter((log) => log.userId === currentUserId && log.choreId === chore.id)
      .sort((a, b) => b.loggedAt - a.loggedAt)[0];
    const cooldownUntil = lastLog ? lastLog.loggedAt + chore.cooldownMinutes * 60000 : 0;
    const ready = Date.now() >= cooldownUntil;

    const card = document.createElement("div");
    card.className = "card chore-card";
    card.innerHTML = `
      <div class="chore-meta">
        <div class="chore-title">${chore.emoji || "✨"} ${chore.title}</div>
        <div class="point-pill">+${chore.points}</div>
      </div>
      <div class="cooldown">Cooldown: ${formatCooldownMinutes(chore.cooldownMinutes)}</div>
      <div class="cooldown">${ready ? "Available now" : `Ready in ${timeUntil(cooldownUntil)}`}</div>
    `;
    const button = document.createElement("button");
    button.className = "btn";
    button.textContent = ready ? "Log done" : "Cooling down";
    button.disabled = !ready;
    button.addEventListener("click", () => {
      if (!confirm(`Log ${chore.title}?`)) return;
      data.logs.push({
        id: cryptoRandomId(),
        userId: currentUserId,
        choreId: chore.id,
        loggedAt: Date.now(),
        points: chore.points,
      });
      saveData(data);
      render();
    });
    card.appendChild(button);
    choreList.appendChild(card);
  }

  const { weekStart, scores } = computeWeeklyScores(data);
  const weeklyAwards = computeWeeklyAwards(scores);
  const weeklyLeague = $("weeklyLeague");
  weeklyLeague.innerHTML = "";
  const weeklyEntries = data.users.map((user) => ({
    user,
    score: scores.get(user.id) || 0,
    award: weeklyAwards.get(user.id) || 0,
  }));
  weeklyEntries.sort((a, b) => b.score - a.score);
  for (const entry of weeklyEntries) {
    const card = document.createElement("div");
    card.className = "card league-row";
    card.innerHTML = `
      <div>${entry.user.emoji || "✨"} ${entry.user.name}</div>
      <div>${entry.score} pts · +${entry.award} league</div>
    `;
    weeklyLeague.appendChild(card);
  }

  $("weekMeta").textContent = `Week starts ${formatIST(weekStart)} · resets Monday 5:00 AM IST`;

  const yearly = computeYearlyLeague(data);
  const yearlyLeague = $("yearlyLeague");
  yearlyLeague.innerHTML = "";
  const yearlyEntries = data.users.map((user) => ({
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
  const monthlyBadges = computeMonthlyBadges(data);
  if (monthlyBadges.length === 0) {
    badgesGrid.innerHTML = `<div class="card">Log chores to earn badges.</div>`;
  } else {
    for (const badge of monthlyBadges) {
      const user = data.users.find((u) => u.id === badge.userId);
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
  for (const user of data.users) {
    const card = document.createElement("div");
    card.className = "card league-row";
    card.innerHTML = `
      <div>${user.emoji || "✨"} ${user.name}</div>
      <div>
        <button class="btn" data-remove="${user.id}">Remove</button>
      </div>
    `;
    card.querySelector("button").addEventListener("click", () => {
      if (data.users.length === 1) return alert("At least one member required.");
      data.users = data.users.filter((u) => u.id !== user.id);
      if (data.currentUserId === user.id) data.currentUserId = data.users[0].id;
      saveData(data);
      render();
    });
    memberList.appendChild(card);
  }

  const choreEditList = $("choreEditList");
  choreEditList.innerHTML = "";
  for (const chore of data.chores) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="chore-meta">
        <div class="chore-title">${chore.emoji || "✨"} ${chore.title}</div>
        <div class="point-pill">${chore.points} pts</div>
      </div>
      <div class="cooldown">Cooldown: ${formatCooldownMinutes(chore.cooldownMinutes)}</div>
      <div class="row">
        <button class="btn" data-edit="${chore.id}">Edit</button>
        <button class="btn" data-toggle="${chore.id}">${chore.active ? "Disable" : "Enable"}</button>
      </div>
    `;
    card.querySelector("[data-edit]").addEventListener("click", () => editChore(chore.id));
    card.querySelector("[data-toggle]").addEventListener("click", () => {
      chore.active = !chore.active;
      saveData(data);
      render();
    });
    choreEditList.appendChild(card);
  }
}

function editChore(choreId) {
  const data = loadData();
  const chore = data.chores.find((c) => c.id === choreId);
  if (!chore) return;
  const title = prompt("Chore title", chore.title);
  if (!title) return;
  const points = Number(prompt("Points", chore.points));
  const cooldown = prompt("Cooldown (e.g. 2h, 5d)", formatCooldownMinutes(chore.cooldownMinutes));
  const cooldownMinutes = parseCooldown(cooldown);
  if (!cooldownMinutes || Number.isNaN(points)) {
    alert("Invalid points or cooldown.");
    return;
  }
  chore.title = title;
  chore.points = points;
  chore.cooldownMinutes = cooldownMinutes;
  saveData(data);
  render();
}

function setupEvents() {
  $("createHouseholdBtn").addEventListener("click", () => {
    const data = createHousehold({
      name: $("createHouseholdName").value.trim(),
      userName: $("createUserName").value.trim(),
      userEmoji: $("createUserEmoji").value.trim(),
    });
    render();
  });

  $("joinHouseholdBtn").addEventListener("click", () => {
    const data = joinHousehold({
      joinCode: $("joinCode").value.trim(),
      userName: $("joinUserName").value.trim(),
      userEmoji: $("joinUserEmoji").value.trim(),
    });
    if (data) render();
  });

  $("saveHouseholdBtn").addEventListener("click", () => {
    const data = loadData();
    data.household.name = $("editHouseholdName").value.trim() || data.household.name;
    saveData(data);
    render();
  });

  $("addMemberBtn").addEventListener("click", () => {
    const data = loadData();
    const name = $("newMemberName").value.trim();
    if (!name) return;
    data.users.push({
      id: cryptoRandomId(),
      name,
      emoji: $("newMemberEmoji").value.trim() || "✨",
      joinedAt: Date.now(),
    });
    $("newMemberName").value = "";
    $("newMemberEmoji").value = "";
    saveData(data);
    render();
  });

  $("addChoreBtn").addEventListener("click", () => {
    const data = loadData();
    const title = $("newChoreTitle").value.trim();
    const points = Number($("newChorePoints").value.trim());
    const cooldown = parseCooldown($("newChoreCooldown").value.trim());
    if (!title || Number.isNaN(points) || !cooldown) {
      alert("Please provide a title, points, and cooldown like 2h or 5d.");
      return;
    }
    data.chores.push({
      id: cryptoRandomId(),
      title,
      points,
      cooldownMinutes: cooldown,
      emoji: "✨",
      active: true,
    });
    $("newChoreTitle").value = "";
    $("newChorePoints").value = "";
    $("newChoreCooldown").value = "";
    saveData(data);
    render();
  });

  $("userSelect").addEventListener("change", (event) => {
    const data = loadData();
    data.currentUserId = event.target.value;
    saveData(data);
    render();
  });

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
render();
setInterval(render, 60000);
