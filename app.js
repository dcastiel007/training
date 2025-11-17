// מפתחות ושמות קבועים
const PLAN_KEY = "david_workout_plan_v1";
const STATE_KEY = "david_workout_state_v2";
const HISTORY_KEY = "david_workout_history_v1";
const STREAK_KEY = "david_workout_streak_best";

const dayOrder = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const dayLabels = {
  sun: "ראשון - אימון כוח",
  mon: "שני - הליכה",
  tue: "שלישי - מתיחות",
  wed: "רביעי - אימון כוח",
  thu: "חמישי - הליכה",
  fri: "שישי - הליכה או שחייה",
  sat: "שבת - מנוחה / הליכה חופשית"
};

const dayShort = {
  sun: "א",
  mon: "ב",
  tue: "ג",
  wed: "ד",
  thu: "ה",
  fri: "ו",
  sat: "ש"
};

const defaultPlan = {
  sun: { tasks: ["סקוואט לכיסא", "לחיצות קיר", "חתירה עם גומייה", "פלנק קצר"] },
  mon: { tasks: ["הליכה 30 דקות"] },
  tue: { tasks: ["מתיחות 5-7 דקות"] },
  wed: { tasks: ["סקוואט לכיסא", "לחיצות קיר", "חתירה עם גומייה", "פלנק קצר"] },
  thu: { tasks: ["הליכה 30 דקות"] },
  fri: { tasks: ["הליכה 30 דקות או שחייה 20 דקות"] },
  sat: { tasks: ["הליכה קצרה (רשות)"] }
};

// טעינת תכנית
function loadPlan() {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(defaultPlan));
  } catch {
    return JSON.parse(JSON.stringify(defaultPlan));
  }
}

function savePlan(plan) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

// טעינת מצב ביצוע
function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

// טעינת היסטוריה
function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function getBestStreak() {
  const raw = localStorage.getItem(STREAK_KEY);
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return isNaN(n) ? 0 : n;
}

function setBestStreak(v) {
  localStorage.setItem(STREAK_KEY, String(v));
}

function getTodayKey() {
  const d = new Date().getDay();
  return dayOrder[d]; // 0 = ראשון (Sunday)
}

let plan = loadPlan();
let state = loadState();

document.addEventListener("DOMContentLoaded", () => {
  // רכיבי DOM
  const tabTrack = document.getElementById("tabTrack");
  const tabManage = document.getElementById("tabManage");
  const screenTrack = document.getElementById("screenTrack");
  const screenManage = document.getElementById("screenManage");

  const daySelect = document.getElementById("daySelect");
  const dayTitle = document.getElementById("dayTitle");
  const tasksContainer = document.getElementById("tasksContainer");
  const weeklyStats = document.getElementById("weeklyStats");
  const streakInfo = document.getElementById("streakInfo");
  const weeklyGraph = document.getElementById("weeklyGraph");
  const resetWeekBtn = document.getElementById("resetWeekBtn");

  const manageDaySelect = document.getElementById("manageDaySelect");
  const manageTasksContainer = document.getElementById("manageTasksContainer");
  const newTaskInput = document.getElementById("newTaskInput");
  const addTaskBtn = document.getElementById("addTaskBtn");
  const snapshotBtn = document.getElementById("snapshotBtn");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const historyList = document.getElementById("historyList");

  // מילוי רשימות היום
  function populateDaySelects() {
    daySelect.innerHTML = "";
    manageDaySelect.innerHTML = "";

    dayOrder.forEach(key => {
      const opt1 = document.createElement("option");
      opt1.value = key;
      opt1.textContent = dayLabels[key];
      daySelect.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = key;
      opt2.textContent = dayLabels[key].split(" - ")[0];
      manageDaySelect.appendChild(opt2);
    });
  }

  function countDay(key) {
    const total = plan[key].tasks.length;
    let done = 0;
    if (state[key]) {
      plan[key].tasks.forEach((_, i) => {
        if (state[key][i]) done++;
      });
    }
    return { done, total };
  }

  function renderDay(key) {
    const info = plan[key];
    if (!info) return;

    if (!state[key]) state[key] = {};

    dayTitle.textContent = dayLabels[key];
    tasksContainer.innerHTML = "";

    info.tasks.forEach((task, idx) => {
      const row = document.createElement("div");
      row.className = "row";

      const label = document.createElement("label");
      label.className = "checkbox-label";

      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = !!state[key][idx];

      box.addEventListener("change", () => {
        state[key][idx] = box.checked;
        saveState(state);
        renderStats();
        updateGraph();
        updateStreak();
      });

      const span = document.createElement("span");
      span.textContent = task;

      label.appendChild(box);
      label.appendChild(span);
      row.appendChild(label);
      tasksContainer.appendChild(row);
    });
  }

  function renderStats() {
    let total = 0;
    let done = 0;

    dayOrder.forEach(k => {
      const r = countDay(k);
      total += r.total;
      done += r.done;
    });

    weeklyStats.textContent =
      "הושלמו " + done + " מתוך " + total + " משימות השבוע.";
  }

  // גרף
  function buildGraph() {
    weeklyGraph.innerHTML = "";
    dayOrder.forEach(key => {
      const col = document.createElement("div");
      col.className = "graph-column";

      const bar = document.createElement("div");
      bar.className = "graph-bar";
      bar.dataset.day = key;

      const lbl = document.createElement("div");
      lbl.className = "graph-label";
      lbl.textContent = dayShort[key];

      col.appendChild(bar);
      col.appendChild(lbl);
      weeklyGraph.appendChild(col);
    });
  }

  function updateGraph() {
    weeklyGraph.querySelectorAll(".graph-bar").forEach(bar => {
      const key = bar.dataset.day;
      const { done, total } = countDay(key);
      const ratio = total ? done / total : 0;
      const minH = 4;
      const maxH = 90;
      bar.style.height = (minH + ratio * (maxH - minH)) + "px";
      bar.style.opacity = ratio === 0 ? 0.25 : 0.95;
    });
  }

  // streak
  function updateStreak() {
    const todayKey = getTodayKey();
    const todayIdx = dayOrder.indexOf(todayKey);

    let streak = 0;
    for (let i = 0; i < 7; i++) {
      const idx = (todayIdx - i + 7) % 7;
      const key = dayOrder[idx];
      const { done } = countDay(key);
      if (done > 0) streak++;
      else break;
    }

    const best = getBestStreak();
    if (streak > best) setBestStreak(streak);

    streakInfo.textContent =
      "רצף נוכחי: " + streak + " ימים | רצף שיא: " + Math.max(best, streak);
  }

  // היסטוריה
  function snapshotHistory(showAlert = true) {
    const hist = loadHistory();
    let total = 0;
    let done = 0;

    dayOrder.forEach(k => {
      const r = countDay(k);
      total += r.total;
      done += r.done;
    });

    hist.unshift({
      date: new Date().toISOString(),
      total,
      done
    });

    if (hist.length > 60) hist.pop();
    saveHistory(hist);
    renderHistory();

    if (showAlert) alert("מצב השבוע נשמר להיסטוריה.");
  }

  function renderHistory() {
    const hist = loadHistory();
    historyList.innerHTML = "";

    if (!hist.length) {
      const div = document.createElement("div");
      div.className = "history-empty";
      div.textContent = "אין עדיין היסטוריה שמורה.";
      historyList.appendChild(div);
      return;
    }

    hist.forEach(entry => {
      const div = document.createElement("div");
      div.className = "history-entry";

      const dateLocal = new Date(entry.date).toLocaleDateString("he-IL");
      const percent = entry.total
        ? Math.round((entry.done / entry.total) * 100)
        : 0;

      div.textContent =
        dateLocal + " - " + entry.done + " מתוך " + entry.total +
        " (" + percent + "%)";

      historyList.appendChild(div);
    });
  }

  function exportCsv() {
    const hist = loadHistory();
    if (!hist.length) {
      alert("אין היסטוריה לייצא.");
      return;
    }

    let csv = "date_iso,date_local,done,total,percent\n";

    hist.forEach(entry => {
      const local = new Date(entry.date).toLocaleDateString("he-IL");
      const percent = entry.total
        ? Math.round((entry.done / entry.total) * 100)
        : 0;
      const row = [
        entry.date,
        local,
        entry.done,
        entry.total,
        percent
      ].join(",");
      csv += row + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workout-history.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ניהול יום
  function renderManageDay(key) {
    manageTasksContainer.innerHTML = "";

    plan[key].tasks.forEach((task, idx) => {
      const row = document.createElement("div");
      row.className = "manage-task-row";

      const input = document.createElement("input");
      input.className = "manage-task-input";
      input.value = task;

      input.addEventListener("change", () => {
        plan[key].tasks[idx] = input.value;
        savePlan(plan);
        renderDay(daySelect.value);
        renderStats();
        updateGraph();
      });

      const btns = document.createElement("div");
      btns.className = "manage-buttons";

      const up = document.createElement("button");
      up.textContent = "▲";
      up.addEventListener("click", () => {
        if (idx === 0) return;
        const list = plan[key].tasks;
        [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
        savePlan(plan);
        renderManageDay(key);
        renderDay(daySelect.value);
        renderStats();
        updateGraph();
      });

      const down = document.createElement("button");
      down.textContent = "▼";
      down.addEventListener("click", () => {
        const list = plan[key].tasks;
        if (idx >= list.length - 1) return;
        [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
        savePlan(plan);
        renderManageDay(key);
        renderDay(daySelect.value);
        renderStats();
        updateGraph();
      });

      const del = document.createElement("button");
      del.textContent = "X";
      del.addEventListener("click", () => {
        plan[key].tasks.splice(idx, 1);
        savePlan(plan);
        renderManageDay(key);
        renderDay(daySelect.value);
        renderStats();
        updateGraph();
      });

      btns.appendChild(up);
      btns.appendChild(down);
      btns.appendChild(del);

      row.appendChild(input);
      row.appendChild(btns);
      manageTasksContainer.appendChild(row);
    });
  }

  // אירועים

  daySelect.addEventListener("change", () => {
    renderDay(daySelect.value);
  });

  manageDaySelect.addEventListener("change", () => {
    renderManageDay(manageDaySelect.value);
  });

  resetWeekBtn.addEventListener("click", () => {
    if (!confirm("לאפס את כל הסימונים לשבוע זה? המצב יישמר קודם להיסטוריה.")) return;
    snapshotHistory(false);
    state = {};
    saveState(state);
    renderDay(daySelect.value);
    renderStats();
    updateGraph();
    updateStreak();
  });

  addTaskBtn.addEventListener("click", () => {
    const key = manageDaySelect.value;
    const text = newTaskInput.value.trim();
    if (!text) return;
    plan[key].tasks.push(text);
    newTaskInput.value = "";
    savePlan(plan);
    renderManageDay(key);
    renderDay(daySelect.value);
    renderStats();
    updateGraph();
  });

  snapshotBtn.addEventListener("click", () => {
    snapshotHistory(true);
  });

  exportCsvBtn.addEventListener("click", exportCsv);

  tabTrack.addEventListener("click", () => {
    tabTrack.classList.add("active");
    tabManage.classList.remove("active");
    screenTrack.style.display = "block";
    screenManage.style.display = "none";
  });

  tabManage.addEventListener("click", () => {
    tabManage.classList.add("active");
    tabTrack.classList.remove("active");
    screenTrack.style.display = "none";
    screenManage.style.display = "block";
    renderManageDay(manageDaySelect.value);
    renderHistory();
  });

  // אתחול
  populateDaySelects();
  const todayKey = getTodayKey();
  daySelect.value = todayKey;
  manageDaySelect.value = todayKey;

  renderDay(todayKey);
  renderStats();
  buildGraph();
  updateGraph();
  updateStreak();
  renderHistory();

  // PWA
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
});