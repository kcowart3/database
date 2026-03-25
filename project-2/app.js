/* Fantaclean Todo - lightweight client-side app */

const STORAGE_KEY = "fantaclean_todo_v1";

// Level curve:
// We keep exact starting XP for levels 1..5 (to preserve the early feel),
// then continue with a steeper retro "power ramp" for higher levels.
// This also allows test level-ups to 40/50.
const FIXED_LEVEL_START_XP = [0, 5000, 12000, 21000, 33000]; // levels 1..5
const MAX_LEVEL = 80;

// Rewarded once per task (rewarded flag prevents double-award).
const DEFAULT_STATE = {
  xp: 0,
  tasks: [],
  currentDesignId: 0,
  // Avatar name / look is purely derived from design id below.
  lastRewardedTaskId: null,
  lastFlashedLevel: 1,
  lastShownUnlockCount: 1
};

const DESIGNS = [
  {
    id: 0,
    name: "Silver armor",
    unlockLevel: 1,
    imgSrc: "images/Fantaclean-01.svg",
    hiddenInGrid: true,
    frameHue: 0,
    hue: 0,
    sat: 1,
    contrast: 1,
    brightness: 1
  },
  {
    id: 1,
    name: "Upgraded Silver Armor",
    unlockLevel: 10,
    imgSrc: "images/Fantaclean-level2.svg",
    frameHue: 190,
    hue: 0,
    sat: 1,
    contrast: 1,
    brightness: 1
  },
  {
    id: 2,
    name: "Refined Armor",
    unlockLevel: 20,
    imgSrc: "images/Fantaclean-level3.svg",
    frameHue: 260,
    hue: 0,
    sat: 1,
    contrast: 1,
    brightness: 1
  },
  {
    id: 3,
    name: "Mastercrafted Armor",
    unlockLevel: 30,
    imgSrc: "images/Fantaclean-level4.svg",
    frameHue: 32,
    hue: 0,
    sat: 1,
    contrast: 1,
    brightness: 1
  }
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function getLevelFromXp(xp) {
  // Determines the highest level whose start XP <= xp.
  const targetXp = Math.max(0, Number.isFinite(xp) ? xp : 0);
  let level = 1;
  // Linear is fine up to MAX_LEVEL; level-ups are infrequent.
  while (level < MAX_LEVEL && targetXp >= getLevelStartXp(level + 1)) {
    level++;
  }
  return level;
}

function getLevelStartXp(level) {
  const l = Math.max(1, Math.floor(level));
  if (l === 1) return 0;
  if (l <= FIXED_LEVEL_START_XP.length) return FIXED_LEVEL_START_XP[l - 1];

  // Known:
  // Level 5 start = 33000
  // Level 6 start = 48000 (diff from level 5 is 15000)
  // From level 6 onward, the XP gap increases by 3000 each level.
  // So for k >= 6: startDiff(k) = 15000 + 3000*(k-6) = 3000*(k-1)
  const m = l - 5; // number of steps beyond level 5
  const base = FIXED_LEVEL_START_XP[4]; // level 5 start
  const sum = m * 15000 + (3000 * (m - 1) * m) / 2;
  return base + sum;
}

function getLevelProgress(xp) {
  const level = getLevelFromXp(xp);
  const nextLevel = Math.min(MAX_LEVEL, level + 1);
  const currentStart = getLevelStartXp(level);
  const nextStart = getLevelStartXp(nextLevel);
  const span = Math.max(1, nextStart - currentStart);
  const progress = clamp((xp - currentStart) / span, 0, 1);
  const nextRequirementXp = nextStart;

  return { level, progress, currentStart, nextRequirementXp };
}

function getUnlockedDesignsByLevel(level) {
  // Unlock by level (design unlockLevel).
  return DESIGNS.filter((d) => level >= d.unlockLevel);
}

function getUnlockedDesignIdsByLevel(level) {
  return getUnlockedDesignsByLevel(level).map((d) => d.id);
}

function getBestUnlockedDesignId(level) {
  const unlocked = getUnlockedDesignsByLevel(level);
  // Best = highest unlockLevel; this prevents reverting to the default/base.
  return unlocked.slice().sort((a, b) => b.unlockLevel - a.unlockLevel)[0]?.id ?? 0;
}

function setDesignOnAvatar(designId) {
  const design = DESIGNS.find((d) => d.id === designId) || DESIGNS[0];

  // Update CSS custom properties for image filters.
  // Used by CSS `hsl(var(--frame-hue) ...)` so keep it numeric (no unit).
  document.documentElement.style.setProperty("--frame-hue", `${design.frameHue ?? 182}`);
  document.documentElement.style.setProperty("--design-hue", `${design.hue}deg`);
  document.documentElement.style.setProperty("--design-sat", design.sat);
  document.documentElement.style.setProperty("--design-contrast", design.contrast);
  document.documentElement.style.setProperty("--design-brightness", design.brightness);

  const avatarImg = document.getElementById("avatarImg");
  if (avatarImg && design.imgSrc) avatarImg.src = design.imgSrc;

  const designLabel = document.getElementById("designLabel");

  if (designLabel) designLabel.textContent = design.name;
}

function uid() {
  // Simple unique id for local usage.
  return `t_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = safeParseJSON(raw);
  if (!parsed || typeof parsed !== "object") return { ...DEFAULT_STATE };

  const merged = { ...DEFAULT_STATE, ...parsed };
  merged.xp = Number.isFinite(merged.xp) ? merged.xp : 0;
  merged.tasks = Array.isArray(merged.tasks)
    ? merged.tasks.map((t) => {
        const xpAwarded = Number(t?.xpAwarded);
        const rawMode = String(t?.xpAwardedMode ?? "xp");
        const xpAwardedMode =
          rawMode === "levelUpTest" || rawMode === "levelUpTo10" || rawMode === "levelUpTo20" || rawMode === "levelUpTo30" ? rawMode : "xp";
        const rewarded = Boolean(t?.rewarded);
        const completed = rewarded ? true : Boolean(t?.completed);
        return {
          id: String(t?.id || uid()),
          text: String(t?.text || "").slice(0, 200),
          completed,
          rewarded,
          xpAwardedMode,
          xpAwarded:
            xpAwardedMode === "xp"
              ? (Number.isFinite(xpAwarded) ? xpAwarded : 100)
              : (Number.isFinite(xpAwarded) ? xpAwarded : 0),
          createdAt: Number.isFinite(Number(t?.createdAt)) ? Number(t?.createdAt) : Date.now()
        };
      })
    : [];
  merged.currentDesignId = Number.isFinite(merged.currentDesignId) ? merged.currentDesignId : 0;
  merged.lastFlashedLevel = Number.isFinite(merged.lastFlashedLevel) ? merged.lastFlashedLevel : 1;
  merged.lastShownUnlockCount = Number.isFinite(merged.lastShownUnlockCount) ? merged.lastShownUnlockCount : 1;
  return merged;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatXp(n) {
  return `${Math.max(0, Math.floor(n))} XP`;
}

function updateTopXpMini() {
  const xpEl = document.getElementById("xpValue");
  if (xpEl) xpEl.textContent = Math.floor(state.xp);
}

function renderProgress() {
  const { level, progress, nextRequirementXp, currentStart } = getLevelProgress(state.xp);

  const levelValue = document.getElementById("levelValue");
  const levelLabel = document.getElementById("levelLabel");
  const nextReq = document.getElementById("nextRequirement");
  const xpInLevel = document.getElementById("xpInLevel");
  const xpToNext = document.getElementById("xpToNext");
  const fill = document.getElementById("xpProgressFill");
  const lockHint = document.getElementById("designLockHint");

  // Track level changes for flash animation - only flash if not shown yet for this level
  const levelChanged = level > state.lastFlashedLevel;

  if (levelValue) {
    levelValue.textContent = String(level);
    // Flash the level text when leveling up (only if not already shown for this level)
    if (levelChanged) {
      state.lastFlashedLevel = level;
      saveState();
      
      levelValue.classList.remove("flash");
      void levelValue.offsetWidth; // Trigger reflow
      levelValue.classList.add("flash");
      
      // Also flash the "LEVEL" label
      if (levelLabel) {
        levelLabel.classList.remove("flash");
        void levelLabel.offsetWidth; // Trigger reflow
        levelLabel.classList.add("flash");
      }
    }
  }
  
  if (nextReq) nextReq.textContent = `${formatXp(nextRequirementXp)}`;

  const xpInThisLevel = state.xp - currentStart;
  const xpNeed = nextRequirementXp - currentStart;

  if (xpInLevel) xpInLevel.textContent = `${Math.max(0, Math.floor(xpInThisLevel))} XP in this level`;
  if (xpToNext) xpToNext.textContent = `to next: ${Math.max(0, Math.floor(xpNeed))} XP`;
  if (fill) fill.style.width = `${Math.round(progress * 100)}%`;

  const unlockedDesignIds = getUnlockedDesignIdsByLevel(level);
  
  // Track new unlocks for flash animation - only show if not already shown for this unlock count
  const newUnlock = unlockedDesignIds.length > state.lastShownUnlockCount;
  
  renderDesignGrid(unlockedDesignIds);

  // Ensure current design stays within unlocked set.
  if (!unlockedDesignIds.includes(state.currentDesignId)) {
    state.currentDesignId = getBestUnlockedDesignId(level);
    setDesignOnAvatar(state.currentDesignId);
    // Re-render so the active border matches the corrected design id.
    renderDesignGrid(unlockedDesignIds);
  }
  
  // Show and flash unlock message only when new design unlocked (and not already shown)
  if (lockHint) {
    if (newUnlock && state.currentDesignId > 0) {
      state.lastShownUnlockCount = unlockedDesignIds.length;
      saveState();
      
      lockHint.textContent = "More power unlocked. Keep questing!";
      lockHint.classList.remove("hidden");
      lockHint.classList.remove("flash");
      void lockHint.offsetWidth; // Trigger reflow
      lockHint.classList.add("flash");
    } else if (state.currentDesignId === 0) {
      lockHint.textContent = "Complete tasks to unlock new designs.";
      lockHint.classList.remove("hidden", "flash");
    } else {
      // Hide message on page load if already shown
      lockHint.classList.add("hidden");
    }
  }
}

function renderDesignGrid(unlockedDesignIds) {
  const grid = document.getElementById("designGrid");
  if (!grid) return;

  grid.innerHTML = "";

  DESIGNS.forEach((design) => {
    // Base/default design is only shown as the avatar; it's not an unlockable "design card".
    if (design.hiddenInGrid) return;
    const unlocked = unlockedDesignIds.includes(design.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = ["designBtn", unlocked ? "unlocked" : "locked", state.currentDesignId === design.id ? "active" : ""]
      .filter(Boolean)
      .join(" ");
    btn.setAttribute("data-design-id", String(design.id));
    btn.setAttribute("aria-pressed", String(state.currentDesignId === design.id));
    if (!unlocked) btn.disabled = true;

    const preview = document.createElement("div");
    preview.className = "designPreview";
    preview.style.setProperty("--design-hue", `${design.hue}deg`);
    preview.style.setProperty("--design-sat", design.sat);
    preview.style.setProperty("--design-contrast", design.contrast);
    preview.style.setProperty("--design-brightness", design.brightness);

    const img = document.createElement("img");
    img.src = design.imgSrc || "images/Fantaclean-01.svg";
    img.alt = `${design.name} preview`;
    img.draggable = false;
    preview.appendChild(img);

    const name = document.createElement("div");
    name.className = "designName";
    name.textContent = design.name;

    const req = document.createElement("div");
    req.className = "designReq";
    req.textContent = unlocked ? "Unlocked" : `Unlock: Level ${design.unlockLevel}`;

    btn.appendChild(preview);
    btn.appendChild(name);
    btn.appendChild(req);

    btn.addEventListener("click", () => {
      state.currentDesignId = design.id;
      saveState();
      setDesignOnAvatar(state.currentDesignId);
      // Re-render to update active border state.
      const { level } = getLevelProgress(state.xp);
      renderDesignGrid(getUnlockedDesignIdsByLevel(level));
    });

    grid.appendChild(btn);
  });
}

function renderTasks() {
  const list = document.getElementById("taskList");
  const empty = document.getElementById("taskEmpty");
  if (!list || !empty) return;

  list.innerHTML = "";

  const tasks = [...state.tasks].sort((a, b) => b.createdAt - a.createdAt);

  if (tasks.length === 0) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = ["taskItem", task.completed ? "completed" : ""].filter(Boolean).join(" ");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "taskCheck";
    checkbox.checked = Boolean(task.completed);
    // XP is granted once and tasks become a permanent "completed" quest.
    checkbox.disabled = Boolean(task.rewarded) || Boolean(task.completed);
    checkbox.setAttribute("aria-label", `Mark task: ${task.text}`);

    const text = document.createElement("div");
    text.className = "taskText";
    text.textContent = task.text;

    const meta = document.createElement("div");
    meta.className = "taskMeta";
    const mode = String(task.xpAwardedMode ?? "xp");
    if (mode === "levelUpTest") meta.textContent = "Level Up (Test)";
    else if (mode === "levelUpTo10") meta.textContent = "Level Up to 10";
    else if (mode === "levelUpTo20") meta.textContent = "Level Up to 20";
    else if (mode === "levelUpTo30") meta.textContent = "Level Up to 30";
    else meta.textContent = `${task.xpAwarded} XP`;

    // Reward only once when transitioning from not-completed to completed.
    checkbox.addEventListener("change", () => {
      const checked = checkbox.checked;
      const wasCompleted = Boolean(task.completed);

      task.completed = checked;

      if (checked && !task.rewarded) {
        task.rewarded = true;
        if (task.xpAwardedMode === "levelUpTest") {
          // Force the player to reach the next level.
          const { nextRequirementXp } = getLevelProgress(state.xp);
          const xpToNext = nextRequirementXp - state.xp;
          const earned = Math.max(1, Math.floor(xpToNext) + 1);
          state.xp += earned;
          task.xpAwarded = earned;
        } else if (task.xpAwardedMode === "levelUpTo10") {
          const old = state.xp;
          const newXp = Math.max(old, getLevelStartXp(10) + 1);
          state.xp = newXp;
          task.xpAwarded = Math.max(0, newXp - old);
        } else if (task.xpAwardedMode === "levelUpTo20") {
          const old = state.xp;
          const newXp = Math.max(old, getLevelStartXp(20) + 1);
          state.xp = newXp;
          task.xpAwarded = Math.max(0, newXp - old);
        } else if (task.xpAwardedMode === "levelUpTo30") {
          const old = state.xp;
          const newXp = Math.max(old, getLevelStartXp(30) + 1);
          state.xp = newXp;
          task.xpAwarded = Math.max(0, newXp - old);
        } else {
          state.xp += Number(task.xpAwarded) || 0;
        }
      } else if (!checked && wasCompleted) {
        // Do not remove XP to keep the system consistent.
      }

      saveState();
      updateTopXpMini();
      renderProgress();
      renderTasks();
    });

    li.appendChild(checkbox);
    li.appendChild(text);
    li.appendChild(meta);

    list.appendChild(li);
  });
}

function showScreen(screenId) {
  const subScreens = ["screenCustomize", "screenTodos"];

  // Hide main game UI when a sub-screen is open.
  document.getElementById("avatarBlock")?.classList.add("hidden");
  document.querySelector(".xpStage")?.classList.add("hidden");
  document.getElementById("btnGoTodos")?.classList.add("hidden");
  document.getElementById("btnGoCustomize")?.classList.add("hidden");

  subScreens.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === screenId) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });
}

function wireUpUI() {
  const btnGoCustomize = document.getElementById("btnGoCustomize");
  const btnGoTodos = document.getElementById("btnGoTodos");
  const btnBackFromCustomize = document.getElementById("btnBackFromCustomize");
  const btnBackFromTodos = document.getElementById("btnBackFromTodos");

  btnGoCustomize?.addEventListener("click", () => showScreen("screenCustomize"));
  btnGoTodos?.addEventListener("click", () => showScreen("screenTodos"));
  btnBackFromCustomize?.addEventListener("click", () => {
    // Return to main view by hiding both sub screens.
    document.getElementById("screenCustomize")?.classList.add("hidden");
    document.getElementById("screenTodos")?.classList.add("hidden");
    document.getElementById("avatarBlock")?.classList.remove("hidden");
    document.querySelector(".xpStage")?.classList.remove("hidden");
    document.getElementById("btnGoTodos")?.classList.remove("hidden");
    document.getElementById("btnGoCustomize")?.classList.remove("hidden");
  });
  btnBackFromTodos?.addEventListener("click", () => {
    document.getElementById("screenCustomize")?.classList.add("hidden");
    document.getElementById("screenTodos")?.classList.add("hidden");
    document.getElementById("avatarBlock")?.classList.remove("hidden");
    document.querySelector(".xpStage")?.classList.remove("hidden");
    document.getElementById("btnGoTodos")?.classList.remove("hidden");
    document.getElementById("btnGoCustomize")?.classList.remove("hidden");
  });

  const taskForm = document.getElementById("taskForm");
  const taskInput = document.getElementById("taskInput");
  const xpSelect = document.getElementById("xpSelect");

  taskForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!taskInput || !xpSelect) return;

    const text = String(taskInput.value || "").trim();
    if (!text) return;

    const xpSelectValue = xpSelect.value;
    const xpAwardedMode =
      xpSelectValue === "levelUpTest" || xpSelectValue === "levelUpTo10" || xpSelectValue === "levelUpTo20" || xpSelectValue === "levelUpTo30"
        ? xpSelectValue
        : "xp";
    const xpAwarded = Number(xpSelectValue);

    state.tasks.push({
      id: uid(),
      text,
      completed: false,
      rewarded: false,
      xpAwardedMode,
      xpAwarded: xpAwardedMode === "xp" ? (Number.isFinite(xpAwarded) ? xpAwarded : 100) : 0,
      createdAt: Date.now()
    });

    taskInput.value = "";
    saveState();
    renderTasks();
  });

  const btnReset = document.getElementById("btnResetProgress");
  btnReset?.addEventListener("click", () => {
    const ok = confirm("Reset XP and tasks? This cannot be undone.");
    if (!ok) return;
    state = { ...DEFAULT_STATE };
    saveState();
    applyStateToUI();
  });

  const btnClearOldTasks = document.getElementById("btnClearOldTasks");
  btnClearOldTasks?.addEventListener("click", () => {
    const ok = confirm("Clear completed tasks? XP will stay.");
    if (!ok) return;
    state.tasks = state.tasks.filter((t) => !Boolean(t.completed));
    saveState();
    renderTasks();
    renderProgress();
  });

  // Keep current design preview consistent even if user switches manually.
  const { level } = getLevelProgress(state.xp);
  const unlockedDesignIds = getUnlockedDesignIdsByLevel(level);
  if (!unlockedDesignIds.includes(state.currentDesignId)) {
    state.currentDesignId = getBestUnlockedDesignId(level);
  }
}

function applyStateToUI() {
  updateTopXpMini();
  renderProgress();
  setDesignOnAvatar(state.currentDesignId);
  renderTasks();

  const { level } = getLevelProgress(state.xp);
  const unlockedDesignIds = getUnlockedDesignIdsByLevel(level);
  if (!unlockedDesignIds.includes(state.currentDesignId)) {
    state.currentDesignId = getBestUnlockedDesignId(level);
  }
  
  // Initialize hint message on load (hide unlock message on page load)
  const lockHint = document.getElementById("designLockHint");
  if (lockHint) {
    if (state.currentDesignId === 0) {
      lockHint.textContent = "Complete tasks to unlock new designs.";
      lockHint.classList.remove("hidden", "flash");
    } else {
      // Hide unlock message on initial page load
      lockHint.classList.add("hidden");
      lockHint.classList.remove("flash");
    }
  }
  
  // Remove any flash classes on initial load
  const levelValue = document.getElementById("levelValue");
  const levelLabel = document.getElementById("levelLabel");
  if (levelValue) levelValue.classList.remove("flash");
  if (levelLabel) levelLabel.classList.remove("flash");
}

function wireUpSplash() {
  const splash = document.getElementById("splashScreen");
  const appScreen = document.getElementById("appScreen");
  if (!splash || !appScreen) return;

  appScreen.classList.add("hidden");

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const splashDuration = reduceMotion ? 250 : 3000;
  const fadeDuration = reduceMotion ? 1 : 650;

  window.addEventListener("load", () => {
    setTimeout(() => {
      splash.classList.add("fadeOut");

      setTimeout(() => {
        splash.classList.add("hidden");
        appScreen.classList.remove("hidden");
        appScreen.scrollIntoView({ block: "nearest" });
      }, fadeDuration);
    }, splashDuration);
  });
}

let state = loadState();

// Boot
wireUpSplash();
wireUpUI();
applyStateToUI();

