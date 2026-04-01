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
  classXp: { knight: 0, teacher: 0 },
  currentClassId: "knight",
  tasks: [],
  currentDesignId: 0,
  // Avatar name / look is purely derived from design id below.
  lastRewardedTaskId: null,
  lastFlashedLevel: 1,
  lastShownUnlockCount: 1
};

const CLASS_DATA = [
  { id: "knight", name: "Knight", imgSrc: null, locked: false, hasUpgrades: true },
  { id: "teacher", name: "Teacher", imgSrc: "images/HiddenClass.svg", locked: false, hasUpgrades: false },
  { id: "cleric", name: "Cleric", imgSrc: "images/Danger.svg", locked: true, hasUpgrades: false },
  { id: "wizard", name: "Wizard", imgSrc: "images/Danger.svg", locked: true, hasUpgrades: false },
  { id: "rogue", name: "Rogue", imgSrc: "images/Danger.svg", locked: true, hasUpgrades: false }
];

const DESIGNS = [
  {
    id: 0,
    name: "Silver Knight",
    unlockLevel: 1,
    imgSrc: "images/Fantaclean-01.svg",
    hiddenInGrid: false,
    frameHue: 0,
    hue: 180,
    sat: 1.4,
    contrast: 1.15,
    brightness: 1.1
  },
  {
    id: 1,
    name: "Horned Knight",
    unlockLevel: 10,
    imgSrc: "images/Fantaclean-level2.svg",
    frameHue: 330,
    hue: 340,
    sat: 1.6,
    contrast: 1.2,
    brightness: 1.15
  },
  {
    id: 2,
    name: "Crimson Knight",
    unlockLevel: 20,
    imgSrc: "images/Fantaclean-level3.svg",
    frameHue: 280,
    hue: 280,
    sat: 1.5,
    contrast: 1.2,
    brightness: 1.2
  },
  {
    id: 3,
    name: "Champion Knight",
    unlockLevel: 30,
    imgSrc: "images/Fantaclean-level4.svg",
    frameHue: 45,
    hue: 40,
    sat: 2.2,
    contrast: 1.3,
    brightness: 1.5
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

function getClassById(classId) {
  return CLASS_DATA.find((c) => c.id === classId) || CLASS_DATA[0];
}

function isKnightClass() {
  return state.currentClassId === "knight";
}

function getClassXp(classId) {
  const xp = Number(state.classXp?.[classId]);
  return Number.isFinite(xp) ? Math.max(0, xp) : 0;
}

function getCurrentXp() {
  return getClassXp(state.currentClassId);
}

function setCurrentXp(xp) {
  if (!state.classXp || typeof state.classXp !== "object") state.classXp = { knight: 0, teacher: 0 };
  state.classXp[state.currentClassId] = Math.max(0, Number.isFinite(xp) ? xp : 0);
}

function setDesignOnAvatar(designId) {
  const design = DESIGNS.find((d) => d.id === designId) || DESIGNS[0];

  const avatarImg = document.getElementById("avatarImg");
  if (avatarImg && design.imgSrc) avatarImg.src = design.imgSrc;

  const designLabel = document.getElementById("designLabel");

  if (designLabel) designLabel.textContent = design.name;
}

function applyClassToAvatar() {
  if (isKnightClass()) {
    setDesignOnAvatar(state.currentDesignId);
    return;
  }

  const avatarImg = document.getElementById("avatarImg");
  const designLabel = document.getElementById("designLabel");
  if (avatarImg) avatarImg.src = "images/HiddenClass.svg";
  if (designLabel) designLabel.textContent = "Teacher";
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
  const parsedClassXp = merged.classXp && typeof merged.classXp === "object" ? merged.classXp : {};
  merged.classXp = {
    knight: Number.isFinite(Number(parsedClassXp.knight)) ? Number(parsedClassXp.knight) : merged.xp,
    teacher: Number.isFinite(Number(parsedClassXp.teacher)) ? Number(parsedClassXp.teacher) : 0
  };
  merged.currentClassId = typeof merged.currentClassId === "string" ? merged.currentClassId : "knight";
  if (!CLASS_DATA.some((c) => c.id === merged.currentClassId)) merged.currentClassId = "knight";
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

function renderProgress() {
  const currentXp = getCurrentXp();
  const { level, progress, nextRequirementXp, currentStart } = getLevelProgress(currentXp);

  const levelValue = document.getElementById("levelValue");
  const levelLabel = document.getElementById("levelLabel");
  const nextReq = document.getElementById("nextRequirement");
  const xpInLevel = document.getElementById("xpInLevel");
  const xpToNext = document.getElementById("xpToNext");
  const fill = document.getElementById("xpProgressFill");
  const lockHint = document.getElementById("designLockHint");
  const btnGoCustomize = document.getElementById("btnGoCustomize");
  if (btnGoCustomize) {
    btnGoCustomize.disabled = !isKnightClass();
    btnGoCustomize.textContent = isKnightClass() ? "upgrade." : "no upgrades";
  }

  // Track level changes for flash animation - only flash if not shown yet for this level
  const levelChanged = isKnightClass() && level > state.lastFlashedLevel;

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

  const xpInThisLevel = currentXp - currentStart;
  const xpNeed = nextRequirementXp - currentStart;

  if (xpInLevel) xpInLevel.textContent = `${Math.max(0, Math.floor(xpInThisLevel))} XP in this level`;
  if (xpToNext) xpToNext.textContent = `to next: ${Math.max(0, Math.floor(xpNeed))} XP`;
  if (fill) fill.style.width = `${Math.round(progress * 100)}%`;

  const unlockedDesignIds = isKnightClass() ? getUnlockedDesignIdsByLevel(level) : [0];
  
  // Track new unlocks for flash animation - only show if not already shown for this unlock count
  const newUnlock = unlockedDesignIds.length > state.lastShownUnlockCount;
  
  renderDesignGrid(unlockedDesignIds);
  renderClassGrid();

  // Ensure current design stays within unlocked set.
  if (isKnightClass() && !unlockedDesignIds.includes(state.currentDesignId)) {
    state.currentDesignId = getBestUnlockedDesignId(level);
    setDesignOnAvatar(state.currentDesignId);
    // Re-render so the active border matches the corrected design id.
    renderDesignGrid(unlockedDesignIds);
  }
  
  // Show and flash unlock message only when new design unlocked (and not already shown)
  if (lockHint) {
    if (!isKnightClass()) {
      lockHint.textContent = "Professor class has no upgrades.";
      lockHint.classList.remove("hidden", "flash");
    } else if (newUnlock && state.currentDesignId > 0) {
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

function renderClassGrid() {
  const grid = document.getElementById("classGrid");
  if (!grid) return;

  grid.innerHTML = "";

  CLASS_DATA.forEach((classData) => {
    const isActive = state.currentClassId === classData.id;
    const card = document.createElement("div");
    card.className = ["classCard", isActive ? "active" : "", classData.locked ? "locked" : ""]
      .filter(Boolean)
      .join(" ");
    card.setAttribute("data-class", classData.id);

    const preview = document.createElement("div");
    preview.className = "classPreview";

    const img = document.createElement("img");
    if (isActive && classData.id === "knight") {
      const currentDesign = DESIGNS.find((d) => d.id === state.currentDesignId) || DESIGNS[0];
      img.src = currentDesign.imgSrc;
      img.className = "classImg";
    } else {
      img.src = classData.imgSrc;
      img.className = classData.locked ? "classDangerImg" : "classImg";
    }
    img.alt = classData.name;
    img.draggable = false;
    preview.appendChild(img);

    const name = document.createElement("div");
    name.className = "className";
    name.textContent = classData.name;

    card.appendChild(preview);
    card.appendChild(name);

    if (isActive) {
      const { level } = getLevelProgress(getCurrentXp());
      const currentDesign = DESIGNS.find((d) => d.id === state.currentDesignId) || DESIGNS[0];
      
      const meta = document.createElement("div");
      meta.className = "classMeta";
      if (classData.hasUpgrades) meta.innerHTML = `Level ${level}<br>${currentDesign.name}`;
      else meta.innerHTML = `Level ${level}<br>No upgrades`;
      card.appendChild(meta);
    } else if (classData.locked) {
      const lockMsg = document.createElement("div");
      lockMsg.className = "classLockMsg";
      lockMsg.textContent = "under development.";
      card.appendChild(lockMsg);
    }

    if (classData.locked) {
      card.addEventListener("click", () => {
        card.style.animation = "none";
        void card.offsetWidth;
        card.style.animation = "classShakeFlash 600ms steps(8)";
        setTimeout(() => {
          card.style.animation = "";
        }, 600);
      });
    } else {
      card.addEventListener("click", () => {
        if (state.currentClassId === classData.id) return;
        state.currentClassId = classData.id;
        saveState();
        applyClassToAvatar();
        renderProgress();
        renderClassGrid();
      });
    }

    grid.appendChild(card);
  });
}

function renderDesignGrid(unlockedDesignIds) {
  const grid = document.getElementById("designGrid");
  if (!grid) return;

  grid.innerHTML = "";
  if (!isKnightClass()) return;

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
      const { level } = getLevelProgress(getCurrentXp());
      renderDesignGrid(getUnlockedDesignIdsByLevel(level));
      renderClassGrid();
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
          const currentXp = getCurrentXp();
          const { nextRequirementXp } = getLevelProgress(currentXp);
          const xpToNext = nextRequirementXp - currentXp;
          const earned = Math.max(1, Math.floor(xpToNext) + 1);
          setCurrentXp(currentXp + earned);
          task.xpAwarded = earned;
        } else if (task.xpAwardedMode === "levelUpTo10") {
          const old = getCurrentXp();
          const newXp = Math.max(old, getLevelStartXp(10) + 1);
          setCurrentXp(newXp);
          task.xpAwarded = Math.max(0, newXp - old);
        } else if (task.xpAwardedMode === "levelUpTo20") {
          const old = getCurrentXp();
          const newXp = Math.max(old, getLevelStartXp(20) + 1);
          setCurrentXp(newXp);
          task.xpAwarded = Math.max(0, newXp - old);
        } else if (task.xpAwardedMode === "levelUpTo30") {
          const old = getCurrentXp();
          const newXp = Math.max(old, getLevelStartXp(30) + 1);
          setCurrentXp(newXp);
          task.xpAwarded = Math.max(0, newXp - old);
        } else {
          setCurrentXp(getCurrentXp() + (Number(task.xpAwarded) || 0));
        }
      } else if (!checked && wasCompleted) {
        // Do not remove XP to keep the system consistent.
      }

      saveState();
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
  const subScreens = ["screenCustomize", "screenTodos", "screenChangeClass"];

  // Hide main game UI when a sub-screen is open.
  document.getElementById("avatarBlock")?.classList.add("hidden");
  document.querySelector(".xpStage")?.classList.add("hidden");
  document.getElementById("btnGoTodos")?.classList.add("hidden");
  document.querySelector(".buttonRow")?.classList.add("hidden");

  subScreens.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === screenId) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });
}

function wireUpUI() {
  const btnGoCustomize = document.getElementById("btnGoCustomize");
  const btnGoChangeClass = document.getElementById("btnGoChangeClass");
  const btnGoTodos = document.getElementById("btnGoTodos");
  const btnBackFromCustomize = document.getElementById("btnBackFromCustomize");
  const btnBackFromChangeClass = document.getElementById("btnBackFromChangeClass");
  const btnBackFromTodos = document.getElementById("btnBackFromTodos");

  btnGoCustomize?.addEventListener("click", () => showScreen("screenCustomize"));
  btnGoChangeClass?.addEventListener("click", () => showScreen("screenChangeClass"));
  btnGoTodos?.addEventListener("click", () => showScreen("screenTodos"));
  
  const returnToMain = () => {
    document.getElementById("screenCustomize")?.classList.add("hidden");
    document.getElementById("screenChangeClass")?.classList.add("hidden");
    document.getElementById("screenTodos")?.classList.add("hidden");
    document.getElementById("avatarBlock")?.classList.remove("hidden");
    document.querySelector(".xpStage")?.classList.remove("hidden");
    document.getElementById("btnGoTodos")?.classList.remove("hidden");
    document.querySelector(".buttonRow")?.classList.remove("hidden");
  };
  
  btnBackFromCustomize?.addEventListener("click", returnToMain);
  btnBackFromChangeClass?.addEventListener("click", returnToMain);
  btnBackFromTodos?.addEventListener("click", returnToMain);

  renderClassGrid();

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
  const { level } = getLevelProgress(getCurrentXp());
  const unlockedDesignIds = getUnlockedDesignIdsByLevel(level);
  if (!unlockedDesignIds.includes(state.currentDesignId)) {
    state.currentDesignId = getBestUnlockedDesignId(level);
  }
}

function applyStateToUI() {
  renderProgress();
  applyClassToAvatar();
  renderTasks();
  renderClassGrid();

  const { level } = getLevelProgress(getCurrentXp());
  const unlockedDesignIds = getUnlockedDesignIdsByLevel(level);
  if (!unlockedDesignIds.includes(state.currentDesignId)) {
    state.currentDesignId = getBestUnlockedDesignId(level);
  }
  
  // Initialize hint message on load (hide unlock message on page load)
  const lockHint = document.getElementById("designLockHint");
  if (lockHint) {
    if (!isKnightClass()) {
      lockHint.textContent = "Professor class has no upgrades.";
      lockHint.classList.remove("hidden", "flash");
    } else if (state.currentDesignId === 0) {
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

