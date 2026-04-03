/* Fantaclean Todo - lightweight client-side app */

/*
 * User-visible copy — where to edit text:
 * - index.html: static UI (titles, buttons, placeholders, splash, empty state, XP option labels).
 * - This file:
 *   - CLASS_DATA[].name — class card titles on Change Class screen.
 *   - DESIGNS[].name — main card + class card meta; upgrade tiles use the adjective only (see upgradeDisplayName).
 *   - syncDesignLabelFx — main-screen name styles (designFx1–4); Silver has no extra class.
 *   - applyClassToAvatar — label when Teacher class is selected.
 *   - renderProgress — Upgrade / No Upgrades button, XP to next level line.
 *   - renderClassGrid — locked-card message (Teacher secret / Under Development!), class meta, level line.
 *   - renderDesignGrid — "Unlocked" / "Unlock: Level …" on design buttons.
 *   - renderTasks — task row meta labels (XP / test level-up labels); checkbox aria-label prefix.
 *   - syncTaskXpSelectOptions — XP reward dropdown amounts scale with level / XP-to-next.
 *   - confirm() in wireUpUI — reset / clear dialogs.
 *   - Web Audio: playButtonSound / playShakeSound / playAddTaskSound; playSecretSound (Secret.m4a).
 */

const STORAGE_KEY = "fantaclean_todo_v1";

// Level curve:
// Exact starting XP for levels 1..5 (level 2 starts at 500 XP), then a steeper ramp.
// Post–level-5 gaps are slightly lower than the original 15k + 3k-per-step curve.
// This also allows test level-ups (e.g. to 100).
const FIXED_LEVEL_START_XP = [0, 500, 6800, 14900, 25700]; // levels 1..5
const MAX_LEVEL = 100;

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
  /** Last level we already played the main XP bar shake for (synced on load). */
  lastBarShakeAtLevel: 1,
  /** Secret class (Teacher) and future gated classes — persisted. */
  classUnlocks: { teacher: false },
  /** SFX volume 0–1 per category (Audio screen); secret uses `secret` (no slider yet). */
  audioVolume: { button: 1, shake: 1, addTask: 1, secret: 1 }
};

// Copy: class names shown on Change Class cards (see also img.alt in renderClassGrid).
const CLASS_DATA = [
  { id: "knight", name: "Knight", imgSrc: null, locked: false, hasUpgrades: true },
  { id: "teacher", name: "Teacher", imgSrc: "images/HiddenClass.svg", locked: true, hasUpgrades: false },
  { id: "cleric", name: "Cleric", imgSrc: "images/Danger.svg", locked: true, hasUpgrades: false },
  { id: "wizard", name: "Wizard", imgSrc: "images/Danger.svg", locked: true, hasUpgrades: false },
  { id: "rogue", name: "Rogue", imgSrc: "images/Danger.svg", locked: true, hasUpgrades: false }
];

// Copy: knight / design display names (main #designLabel, customize grid, class card subtitle).
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
  },
  {
    id: 4,
    name: "Gold Knight",
    unlockLevel: 40,
    imgSrc: "images/Fantaclean-GoldLVL.svg",
    frameHue: 55,
    hue: 45,
    sat: 2.6,
    contrast: 1.35,
    brightness: 1.6
  }
];

/** Title in upgrade tiles only — drops trailing "Knight" from DESIGNS[].name. */
function upgradeDisplayName(design) {
  const n = String(design?.name ?? "").trim();
  return n.replace(/\s+Knight\s*$/i, "").trim() || n;
}

/** Matches `FClogo_splash_FC2.svg`: `.logoWrap` animation duration; shake starts ~58–60% in `logoLandFlashShake`. */
const SPLASH_LOGO_ANIM_MS = 2000;
const SPLASH_SHAKE_START = 0.58;
const SPLASH_SVG_SRC = "images/FClogo_splash_FC2.svg";

let _audioCtx = null;
let splashShakeTimer = null;

function getAudioCtx() {
  if (_audioCtx) return _audioCtx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  _audioCtx = new Ctor();
  return _audioCtx;
}

function resumeAudioIfNeeded(ctx) {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

function sfxVolume(kind) {
  const v = state.audioVolume?.[kind];
  const n = typeof v === "number" && Number.isFinite(v) ? v : 1;
  return Math.max(0, Math.min(1, n));
}

function playButtonSound() {
  try {
    const vol = sfxVolume("button");
    if (vol <= 0) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    resumeAudioIfNeeded(ctx);
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, t);
    g.gain.setValueAtTime(0.08 * vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  } catch (_) {}
}

function playShakeSound() {
  try {
    const vol = sfxVolume("shake");
    if (vol <= 0) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    resumeAudioIfNeeded(ctx);
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(95, t + 0.28);
    g.gain.setValueAtTime(0.085 * vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.42);
  } catch (_) {}
}

function playAddTaskSound() {
  try {
    const vol = sfxVolume("addTask");
    if (vol <= 0) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    resumeAudioIfNeeded(ctx);
    const t = ctx.currentTime;
    const freqs = [523.25, 659.25];
    freqs.forEach((hz, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      const start = t + i * 0.055;
      osc.frequency.setValueAtTime(hz, start);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.088 * vol, start + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.26);
    });
  } catch (_) {}
}

const SECRET_SFX_SRC = "Sound/Secret.m4a";
let _secretAudioEl = null;

function playSecretSound() {
  try {
    const vol = sfxVolume("secret");
    if (vol <= 0) return;
    if (!_secretAudioEl) {
      _secretAudioEl = new Audio(SECRET_SFX_SRC);
    }
    _secretAudioEl.volume = Math.max(0, Math.min(1, vol));
    _secretAudioEl.currentTime = 0;
    void _secretAudioEl.play().catch(() => {});
  } catch (_) {}
}

function clearSplashShakeTimer() {
  if (splashShakeTimer != null) {
    clearTimeout(splashShakeTimer);
    splashShakeTimer = null;
  }
}

function scheduleSplashShakeSound() {
  clearSplashShakeTimer();
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
  splashShakeTimer = setTimeout(() => {
    splashShakeTimer = null;
    playShakeSound();
  }, SPLASH_LOGO_ANIM_MS * SPLASH_SHAKE_START);
}

function wireSplashShakeAfterImgLoad() {
  const img = document.querySelector(".splashImg");
  if (!img) return;
  const schedule = () => scheduleSplashShakeSound();
  if (img.complete) requestAnimationFrame(schedule);
  else img.addEventListener("load", schedule, { once: true });
}

function syncAudioPanelFromState() {
  const b = state.audioVolume?.button ?? 1;
  const s = state.audioVolume?.shake ?? 1;
  const a = state.audioVolume?.addTask ?? 1;
  const pairs = [
    ["volSfxButton", b],
    ["volSfxShake", s],
    ["volSfxAddTask", a]
  ];
  for (const [id, v] of pairs) {
    const el = document.getElementById(id);
    if (el) el.value = String(Math.round(v * 100));
  }
}

function bindAudioVolumeSliders() {
  const map = [
    ["volSfxButton", "button"],
    ["volSfxShake", "shake"],
    ["volSfxAddTask", "addTask"]
  ];
  map.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      const n = Number(el.value);
      if (!state.audioVolume) state.audioVolume = { ...DEFAULT_STATE.audioVolume };
      state.audioVolume[key] = Math.max(0, Math.min(1, Number.isFinite(n) ? n / 100 : 1));
      saveState();
    });
  });
}

function wireGlobalButtonSounds() {
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target?.closest?.("button");
      if (!el) return;
      playButtonSound();
    },
    true
  );
}

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

  // From level 6 onward: base gap ~13800, +2760 each further level (slightly easier than 15k/3k).
  const m = l - 5; // number of steps beyond level 5
  const base = FIXED_LEVEL_START_XP[4]; // level 5 start
  const sum = m * 13800 + (2760 * (m - 1) * m) / 2;
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

/** XP still needed to reach the next level (0 at max level). */
function getXpRemainingToNextLevel(currentXp) {
  const level = getLevelFromXp(currentXp);
  if (level >= MAX_LEVEL) return 0;
  return Math.max(0, Math.floor(getLevelStartXp(level + 1) - currentXp));
}

/** Round XP reward choices to readable steps. */
function roundTaskXpAmount(n) {
  const x = Math.max(1, Math.round(Number(n)));
  if (x < 50) return Math.max(5, Math.round(x / 5) * 5);
  if (x < 200) return Math.round(x / 10) * 10;
  if (x < 2000) return Math.round(x / 25) * 25;
  if (x < 20000) return Math.round(x / 50) * 50;
  return Math.round(x / 100) * 100;
}

function dedupeAscendingXpAmounts(nums) {
  const s = new Set();
  for (const n of nums) {
    if (Number.isFinite(n) && n > 0) s.add(n);
  }
  return Array.from(s).sort((a, b) => a - b);
}

/**
 * Five tiered numeric XP rewards: scale with XP to next level (or last-level span at max).
 */
function getScaledTaskXpAmounts(currentXp, atMaxLevel) {
  if (!atMaxLevel) {
    const toNext = getXpRemainingToNextLevel(currentXp);
    const base = roundTaskXpAmount(Math.max(toNext * 0.03, 10));
    const factors = [1, 2.25, 4.5, 8, 15];
    return dedupeAscendingXpAmounts(factors.map((f) => roundTaskXpAmount(base * f)));
  }
  const span = Math.max(
    1,
    getLevelStartXp(MAX_LEVEL) - getLevelStartXp(MAX_LEVEL - 1)
  );
  const base = roundTaskXpAmount(Math.max(span * 0.05, 100));
  const factors = [1, 2, 3.75, 6.5, 11];
  return dedupeAscendingXpAmounts(factors.map((f) => roundTaskXpAmount(base * f)));
}

const TASK_XP_TEST_OPTIONS = [
  { value: "levelUpTest", label: "Level Up (Test)" },
  { value: "levelUpTo10", label: "Level Up to 10 (Test)" },
  { value: "levelUpTo20", label: "Level Up to 20 (Test)" },
  { value: "levelUpTo30", label: "Level Up to 30 (Test)" },
  { value: "levelUpTo40", label: "Level Up to 40 (Test)" },
  { value: "levelUpTo100", label: "Level Up to 100 (Test)" }
];

function syncTaskXpSelectOptions() {
  const sel = document.getElementById("xpSelect");
  if (!sel) return;

  const currentXp = getCurrentXp();
  const { level } = getLevelProgress(currentXp);
  const atMaxLevel = level >= MAX_LEVEL;
  const prevValue = sel.value;

  let amounts = getScaledTaskXpAmounts(currentXp, atMaxLevel);
  if (amounts.length === 0) amounts = [100];

  sel.innerHTML = "";
  for (const amt of amounts) {
    const opt = document.createElement("option");
    opt.value = String(amt);
    opt.textContent = `${amt} XP`;
    sel.appendChild(opt);
  }
  for (const { value, label } of TASK_XP_TEST_OPTIONS) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    sel.appendChild(opt);
  }

  const stillValid = [...sel.options].some((o) => o.value === prevValue);
  if (stillValid) sel.value = prevValue;
  else {
    const mid = amounts[Math.floor((amounts.length - 1) / 2)] ?? amounts[0];
    sel.value = String(mid);
  }
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

/** Teacher is gated by `state.classUnlocks.teacher` (triple-click secret); other cards use CLASS_DATA.locked. */
function isClassLockedForUi(classData) {
  if (classData.id === "teacher") return !Boolean(state.classUnlocks?.teacher);
  return Boolean(classData.locked);
}

let teacherSecretTapCount = 0;
let teacherSecretTapTimer = null;

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

/** Main-screen knight name styling: Silver stays plain; higher tiers get unique CSS fx. */
function syncDesignLabelFx(designId) {
  const designLabel = document.getElementById("designLabel");
  if (!designLabel) return;
  designLabel.className = "designLabel";
  const id = Number(designId);
  if (id >= 1 && id <= 4) designLabel.classList.add(`designFx${id}`);
}

function setDesignOnAvatar(designId) {
  const design = DESIGNS.find((d) => d.id === designId) || DESIGNS[0];

  const avatarImg = document.getElementById("avatarImg");
  if (avatarImg && design.imgSrc) avatarImg.src = design.imgSrc;

  const designLabel = document.getElementById("designLabel");

  // Copy: main card name when Knight (from DESIGNS[].name).
  if (designLabel) {
    designLabel.textContent = design.name;
    syncDesignLabelFx(design.id);
  }

  // Main-screen-only glow: selected upgrade glows behind the avatar.
  // Upgrade buttons in the upgrades screen should not show these glows.
  const avatarFrame = document.getElementById("avatarFrame");
  if (avatarFrame) {
    avatarFrame.classList.add("knightClickable");
    for (let i = 0; i < 10; i++) avatarFrame.classList.remove(`glowTier${i}`);
    const tierIdx = DESIGNS.findIndex((d) => d.id === designId);
    if (tierIdx >= 0 && isKnightClass()) avatarFrame.classList.add(`glowTier${tierIdx}`);
  }
}

function applyClassToAvatar() {
  if (isKnightClass()) {
    setDesignOnAvatar(state.currentDesignId);
    return;
  }

  const avatarImg = document.getElementById("avatarImg");
  const designLabel = document.getElementById("designLabel");
  if (avatarImg) avatarImg.src = "images/HiddenClass.svg";
  // Copy: main card name when Teacher class is active.
  if (designLabel) {
    designLabel.textContent = "Teacher";
    designLabel.className = "designLabel";
  }

  // Remove any upgrade glow when leaving Knight.
  const avatarFrame = document.getElementById("avatarFrame");
  if (avatarFrame) {
    avatarFrame.classList.remove("knightClickable");
    for (let i = 0; i < 10; i++) avatarFrame.classList.remove(`glowTier${i}`);
  }
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
          rawMode === "levelUpTest" ||
          rawMode === "levelUpTo10" ||
          rawMode === "levelUpTo20" ||
          rawMode === "levelUpTo30" ||
          rawMode === "levelUpTo40" ||
          rawMode === "levelUpTo100"
            ? rawMode
            : "xp";
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
  const av = merged.audioVolume && typeof merged.audioVolume === "object" ? merged.audioVolume : {};
  merged.audioVolume = {
    button: Math.max(0, Math.min(1, Number.isFinite(Number(av.button)) ? Number(av.button) : 1)),
    shake: Math.max(0, Math.min(1, Number.isFinite(Number(av.shake)) ? Number(av.shake) : 1)),
    addTask: Math.max(0, Math.min(1, Number.isFinite(Number(av.addTask)) ? Number(av.addTask) : 1)),
    secret: Math.max(0, Math.min(1, Number.isFinite(Number(av.secret)) ? Number(av.secret) : 1))
  };

  const defaultUnlocks = { ...DEFAULT_STATE.classUnlocks };
  const rawUnlocks = merged.classUnlocks && typeof merged.classUnlocks === "object" ? merged.classUnlocks : {};
  merged.classUnlocks = { ...defaultUnlocks, ...rawUnlocks };
  merged.classUnlocks.teacher = Boolean(merged.classUnlocks.teacher);
  if (!parsed.classUnlocks) {
    const tXp = Number(merged.classXp?.teacher);
    if (merged.currentClassId === "teacher" || (Number.isFinite(tXp) && tXp > 0)) {
      merged.classUnlocks.teacher = true;
    }
  }
  if (merged.currentClassId === "teacher" && !merged.classUnlocks.teacher) {
    merged.currentClassId = "knight";
  }

  // Never replay the post–level-up bar shake on a cold load (uses merged XP, not global state).
  {
    const cid = merged.currentClassId;
    const rawXp = Number(merged.classXp?.[cid]);
    const curXp = Number.isFinite(rawXp) ? Math.max(0, rawXp) : 0;
    merged.lastBarShakeAtLevel = getLevelFromXp(curXp);
  }
  return merged;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Copy: suffix for XP numbers (used in nextReq and task meta).
function formatXp(n) {
  return `${Math.max(0, Math.floor(n))} XP`;
}

function isMainGameUiVisible() {
  const appScreen = document.getElementById("appScreen");
  if (!appScreen || appScreen.classList.contains("hidden")) return false;
  const avatarBlock = document.getElementById("avatarBlock");
  return Boolean(avatarBlock && !avatarBlock.classList.contains("hidden"));
}

/** One-shot shake + flash on the XP bar when the main UI is visible after a new level. */
function maybeXpBarShake(level) {
  const xpBarEl = document.querySelector(".xpProgress");
  if (!xpBarEl) return;
  if (!isMainGameUiVisible()) return;
  if (level <= state.lastBarShakeAtLevel) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    state.lastBarShakeAtLevel = level;
    saveState();
    return;
  }
  state.lastBarShakeAtLevel = level;
  saveState();
  xpBarEl.classList.remove("xpBarShakeFlash");
  void xpBarEl.offsetWidth;
  xpBarEl.classList.add("xpBarShakeFlash");
  const onEnd = () => {
    xpBarEl.removeEventListener("animationend", onEnd);
    xpBarEl.classList.remove("xpBarShakeFlash");
  };
  xpBarEl.addEventListener("animationend", onEnd, { once: true });
}

function renderProgress() {
  const currentXp = getCurrentXp();
  const { level, progress } = getLevelProgress(currentXp);

  const levelValue = document.getElementById("levelValue");
  const xpToNextCount = document.getElementById("xpToNextCount");
  const xpToNextBlock = document.querySelector(".xpToNextAbove");
  const fill = document.getElementById("xpProgressFill");
  const xpBarEl = document.querySelector(".xpProgress");
  const btnGoCustomize = document.getElementById("btnGoCustomize");
  const atMaxLevel = level >= MAX_LEVEL;
  // Copy: main Upgrade button (overrides index.html initial label).
  if (btnGoCustomize) {
    btnGoCustomize.disabled = !isKnightClass();
    btnGoCustomize.textContent = isKnightClass() ? "Upgrade Class"  : "No Upgrades";
  }

  // Track level changes for flash animation - only flash if not shown yet for this level
  const levelChanged = isKnightClass() && level > state.lastFlashedLevel;

  if (levelValue) {
    levelValue.textContent = atMaxLevel ? "MAX" : String(level);
    // Flash the level text when leveling up (only if not already shown for this level)
    if (levelChanged) {
      state.lastFlashedLevel = level;
      saveState();
      
      levelValue.classList.remove("flash");
      void levelValue.offsetWidth; // Trigger reflow
      levelValue.classList.add("flash");
    }
  }

  if (xpToNextBlock) xpToNextBlock.classList.toggle("hidden", atMaxLevel);

  const xpRemaining = getXpRemainingToNextLevel(currentXp);
  if (xpToNextCount && !atMaxLevel) xpToNextCount.textContent = formatXp(xpRemaining);

  if (fill) fill.style.width = atMaxLevel ? "100%" : `${Math.round(progress * 100)}%`;
  if (xpBarEl) {
    if (atMaxLevel) {
      xpBarEl.setAttribute("aria-valuenow", "100");
      xpBarEl.setAttribute("aria-valuetext", "Maximum level — no further XP required");
    } else {
      const pct = Math.round(progress * 100);
      xpBarEl.setAttribute("aria-valuenow", String(pct));
      xpBarEl.setAttribute(
        "aria-valuetext",
        `Level ${level}, ${pct} percent progress, ${formatXp(xpRemaining)} to next level`
      );
    }
  }

  const unlockedDesignIds = isKnightClass() ? getUnlockedDesignIdsByLevel(level) : [0];

  renderDesignGrid(unlockedDesignIds);
  renderClassGrid();

  // Ensure current design stays within unlocked set.
  if (isKnightClass() && !unlockedDesignIds.includes(state.currentDesignId)) {
    state.currentDesignId = getBestUnlockedDesignId(level);
    setDesignOnAvatar(state.currentDesignId);
    // Re-render so the active border matches the corrected design id.
    renderDesignGrid(unlockedDesignIds);
  }

  syncTaskXpSelectOptions();

  maybeXpBarShake(level);
}

function runLockedClassCardShake(card) {
  playShakeSound();
  card.style.animation = "none";
  void card.offsetWidth;
  card.style.animation = "classShakeFlash 600ms steps(8)";
  setTimeout(() => {
    card.style.animation = "";
  }, 600);
}

function renderClassGrid() {
  const grid = document.getElementById("classGrid");
  if (!grid) return;

  grid.innerHTML = "";

  CLASS_DATA.forEach((classData) => {
    const isActive = state.currentClassId === classData.id;
    const lockedForUi = isClassLockedForUi(classData);
    const card = document.createElement("div");
    card.className = ["classCard", isActive ? "active" : "", lockedForUi ? "locked" : ""]
      .filter(Boolean)
      .join(" ");
    card.setAttribute("data-class", classData.id);

    const preview = document.createElement("div");
    preview.className = "classPreview";

    const img = document.createElement("img");
    // Knight preview always uses the saved knight design (CLASS_DATA.knight.imgSrc is null).
    if (classData.id === "knight") {
      const currentDesign = DESIGNS.find((d) => d.id === state.currentDesignId) || DESIGNS[0];
      img.src = currentDesign.imgSrc;
      img.className = "classImg";
    } else if (classData.id === "teacher" && lockedForUi) {
      img.src = "images/Lock.svg";
      img.alt = "Locked";
      img.className = "classImg";
    } else {
      img.src = classData.imgSrc;
      img.className = lockedForUi ? "classDangerImg" : "classImg";
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
      // Copy: active class card — level line + design name or no-upgrades line.
      if (classData.hasUpgrades) meta.innerHTML = `Level ${level}<br>${currentDesign.name}`;
      else meta.innerHTML = `Level ${level}<br>No upgrades`;
      card.appendChild(meta);
    } else if (lockedForUi) {
      const lockMsg = document.createElement("div");
      lockMsg.className = "classLockMsg";
      // Copy: Teacher secret gate vs placeholder classes (Cleric / Wizard / Rogue).
      lockMsg.textContent =
        classData.id === "teacher" ? "A secret hidden in threes..." : "Under Development!";
      card.appendChild(lockMsg);
    }

    if (lockedForUi) {
      if (classData.id === "teacher") {
        card.addEventListener("click", () => {
          if (state.classUnlocks?.teacher) return;
          runLockedClassCardShake(card);
          teacherSecretTapCount += 1;
          if (teacherSecretTapTimer) clearTimeout(teacherSecretTapTimer);
          teacherSecretTapTimer = setTimeout(() => {
            teacherSecretTapCount = 0;
            teacherSecretTapTimer = null;
          }, 1200);
          if (teacherSecretTapCount < 3) return;
          teacherSecretTapCount = 0;
          if (teacherSecretTapTimer) {
            clearTimeout(teacherSecretTapTimer);
            teacherSecretTapTimer = null;
          }
          if (!state.classUnlocks) state.classUnlocks = { ...DEFAULT_STATE.classUnlocks };
          state.classUnlocks.teacher = true;
          saveState();
          playSecretSound();
          renderClassGrid();
          renderProgress();
        });
      } else {
        card.addEventListener("click", () => runLockedClassCardShake(card));
      }
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

  DESIGNS.forEach((design, tierIdx) => {
    // Base/default design is only shown as the avatar; it's not an unlockable "design card".
    if (design.hiddenInGrid) return;
    const unlocked = unlockedDesignIds.includes(design.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = [
      "designBtn",
      `glowTier${tierIdx}`,
      unlocked ? "unlocked" : "locked",
      state.currentDesignId === design.id ? "active" : ""
    ]
      .filter(Boolean)
      .join(" ");
    btn.setAttribute("data-design-id", String(design.id));
    btn.setAttribute("aria-pressed", String(state.currentDesignId === design.id));
    if (!unlocked) btn.setAttribute("aria-disabled", "true");
    else btn.removeAttribute("aria-disabled");

    const preview = document.createElement("div");
    preview.className = "designPreview";

    const img = document.createElement("img");
    img.src = unlocked ? (design.imgSrc || "images/Fantaclean-01.svg") : "images/Lock.svg";
    img.alt = unlocked ? `${upgradeDisplayName(design)} preview` : "Locked upgrade";
    img.className = unlocked ? "designUpgradeImg" : "designLockImg";
    img.draggable = false;
    preview.appendChild(img);

    const name = document.createElement("div");
    name.className = "designName";
    name.textContent = upgradeDisplayName(design);

    const req = document.createElement("div");
    req.className = "designReq";
    // Copy: customize grid status under each design.
    req.textContent = unlocked ? "Unlocked" : `Unlock: Level ${design.unlockLevel}`;

    btn.appendChild(preview);
    btn.appendChild(name);
    btn.appendChild(req);

    btn.addEventListener("click", () => {
      if (!unlocked) {
        playShakeSound();
        return;
      }
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
    // Copy: checkbox accessibility label (prefix + task text).
    checkbox.setAttribute("aria-label", `Mark task: ${task.text}`);

    const text = document.createElement("div");
    text.className = "taskText";
    text.textContent = task.text;

    const meta = document.createElement("div");
    meta.className = "taskMeta";
    const mode = String(task.xpAwardedMode ?? "xp");
    // Copy: right-hand meta on each task row.
    if (mode === "levelUpTest") meta.textContent = "Level Up (Test)";
    else if (mode === "levelUpTo10") meta.textContent = "Level Up to 10";
    else if (mode === "levelUpTo20") meta.textContent = "Level Up to 20";
    else if (mode === "levelUpTo30") meta.textContent = "Level Up to 30";
    else if (mode === "levelUpTo40") meta.textContent = "Level Up to 40";
    else if (mode === "levelUpTo100") meta.textContent = "Level Up to 100";
    else meta.textContent = `${task.xpAwarded} XP`;

    // Reward only once when transitioning from not-completed to completed.
    checkbox.addEventListener("change", () => {
      const checked = checkbox.checked;
      const wasCompleted = Boolean(task.completed);

      task.completed = checked;

      if (checked && !task.rewarded) {
        playAddTaskSound();
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
        } else if (task.xpAwardedMode === "levelUpTo40") {
          const old = getCurrentXp();
          const newXp = Math.max(old, getLevelStartXp(40) + 1);
          setCurrentXp(newXp);
          task.xpAwarded = Math.max(0, newXp - old);
        } else if (task.xpAwardedMode === "levelUpTo100") {
          const old = getCurrentXp();
          const newXp = Math.max(old, getLevelStartXp(100) + 1);
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
  const subScreens = [
    "screenCustomize",
    "screenTodos",
    "screenChangeClass",
    "screenSettings",
    "screenDevAudio",
    "screenDevThemes"
  ];

  // Hide main game UI when a sub-screen is open.
  const avatarBlock = document.getElementById("avatarBlock");
  avatarBlock?.classList.add("hidden");

  document.querySelector(".xpStage")?.classList.add("hidden");
  document.getElementById("mainControlsBlock")?.classList.add("hidden");
  document.getElementById("mainTopLogoWrap")?.classList.add("hidden");

  subScreens.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === screenId) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });
}

function wireUpUI() {
  wireGlobalButtonSounds();
  bindAudioVolumeSliders();

  const btnGoCustomize = document.getElementById("btnGoCustomize");
  const btnGoChangeClass = document.getElementById("btnGoChangeClass");
  const btnGoTodos = document.getElementById("btnGoTodos");
  const btnCloseFromCustomize = document.getElementById("btnCloseFromCustomize");
  const btnCloseFromChangeClass = document.getElementById("btnCloseFromChangeClass");

  btnGoCustomize?.addEventListener("click", () => showScreen("screenCustomize"));
  btnGoChangeClass?.addEventListener("click", () => showScreen("screenChangeClass"));
  btnGoTodos?.addEventListener("click", () => {
    showScreen("screenTodos");
    syncTaskXpSelectOptions();
  });

  const avatarFrame = document.getElementById("avatarFrame");
  avatarFrame?.addEventListener("click", () => {
    playShakeSound();
    if (!isKnightClass()) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    avatarFrame.style.animation = "none";
    void avatarFrame.offsetWidth;
    avatarFrame.style.animation = "knightAvatarShake 520ms steps(8) forwards";
    const clear = () => {
      avatarFrame.removeEventListener("animationend", clear);
      avatarFrame.style.animation = "";
    };
    avatarFrame.addEventListener("animationend", clear, { once: true });
  });
  
  const returnToMain = () => {
    document.getElementById("screenCustomize")?.classList.add("hidden");
    document.getElementById("screenChangeClass")?.classList.add("hidden");
    document.getElementById("screenTodos")?.classList.add("hidden");
    document.getElementById("screenSettings")?.classList.add("hidden");
    document.getElementById("screenDevAudio")?.classList.add("hidden");
    document.getElementById("screenDevThemes")?.classList.add("hidden");
    document.getElementById("avatarBlock")?.classList.remove("hidden");
    applyClassToAvatar();
    document.querySelector(".xpStage")?.classList.remove("hidden");
    document.getElementById("mainControlsBlock")?.classList.remove("hidden");
    document.getElementById("mainTopLogoWrap")?.classList.remove("hidden");
    renderProgress();
  };

  const returnToSettings = () => {
    showScreen("screenSettings");
  };

  btnCloseFromCustomize?.addEventListener("click", returnToMain);
  btnCloseFromChangeClass?.addEventListener("click", returnToMain);

  document.getElementById("btnCloseFromTodos")?.addEventListener("click", returnToMain);
  document.getElementById("btnGoSettings")?.addEventListener("click", () => showScreen("screenSettings"));
  document.getElementById("btnCloseSettings")?.addEventListener("click", returnToMain);
  document.getElementById("btnGoAudio")?.addEventListener("click", () => showScreen("screenDevAudio"));
  document.getElementById("btnGoThemes")?.addEventListener("click", () => showScreen("screenDevThemes"));
  document.getElementById("btnCloseDevAudio")?.addEventListener("click", returnToSettings);
  document.getElementById("btnCloseDevThemes")?.addEventListener("click", returnToSettings);

  document.getElementById("btnPreviewShakeSound")?.addEventListener("click", () => playShakeSound());
  document.getElementById("btnPreviewAddTaskSound")?.addEventListener("click", () => playAddTaskSound());

  document.getElementById("btnSplashLogo")?.addEventListener("click", showSplashFromApp);

  renderClassGrid();

  const taskForm = document.getElementById("taskForm");
  const taskInput = document.getElementById("taskInput");
  const xpSelect = document.getElementById("xpSelect");

  taskForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!taskInput || !xpSelect) return;

    const text = String(taskInput.value || "").trim();
    if (!text) {
      playShakeSound();
      return;
    }

    const xpSelectValue = xpSelect.value;
    const xpAwardedMode =
      xpSelectValue === "levelUpTest" ||
      xpSelectValue === "levelUpTo10" ||
      xpSelectValue === "levelUpTo20" ||
      xpSelectValue === "levelUpTo30" ||
      xpSelectValue === "levelUpTo40" ||
      xpSelectValue === "levelUpTo100"
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

    playAddTaskSound();

    taskInput.value = "";
    saveState();
    renderTasks();
  });

  const btnReset = document.getElementById("btnResetProgress");
  btnReset?.addEventListener("click", () => {
    // Copy: reset current class level only — tasks and other classes' XP stay.
    const ok = confirm(
      "Reset this class's XP to level 1? If Knight, upgrades reset too. Tasks and other classes are kept."
    );
    if (!ok) return;
    const cid = state.currentClassId;
    if (!state.classXp || typeof state.classXp !== "object") state.classXp = { knight: 0, teacher: 0 };
    state.classXp[cid] = 0;
    if (cid === "knight") {
      state.currentDesignId = 0;
      state.lastFlashedLevel = 1;
      state.xp = 0;
    }
    state.lastBarShakeAtLevel = 1;
    saveState();
    applyStateToUI();
  });

  const btnResetClassUnlocks = document.getElementById("btnResetClassUnlocks");
  btnResetClassUnlocks?.addEventListener("click", () => {
    // Copy: reset persisted class unlock flags (Teacher secret, future gates).
    const ok = confirm(
      "Reset all class unlocks (including the secret Teacher class)? This cannot be undone."
    );
    if (!ok) return;
    state.classUnlocks = { ...DEFAULT_STATE.classUnlocks };
    teacherSecretTapCount = 0;
    if (teacherSecretTapTimer) {
      clearTimeout(teacherSecretTapTimer);
      teacherSecretTapTimer = null;
    }
    if (state.currentClassId === "teacher") {
      state.currentClassId = "knight";
    }
    saveState();
    applyStateToUI();
  });

  const btnClearOldTasks = document.getElementById("btnClearOldTasks");
  btnClearOldTasks?.addEventListener("click", () => {
    // Copy: clear completed tasks dialog.
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
  syncAudioPanelFromState();

  const { level } = getLevelProgress(getCurrentXp());
  const unlockedDesignIds = getUnlockedDesignIdsByLevel(level);
  if (!unlockedDesignIds.includes(state.currentDesignId)) {
    state.currentDesignId = getBestUnlockedDesignId(level);
  }

  const levelValue = document.getElementById("levelValue");
  if (levelValue) levelValue.classList.remove("flash");
}

/** Reload splash SVG so embedded CSS animations (sword drop, etc.) run from the start. */
function reloadSplashSplashImage() {
  const splashImg = document.querySelector(".splashImg");
  if (!splashImg) return;
  clearSplashShakeTimer();
  splashImg.addEventListener(
    "load",
    () => {
      scheduleSplashShakeSound();
    },
    { once: true }
  );
  splashImg.src = `${SPLASH_SVG_SRC}?r=${Date.now()}`;
}

/** After splash is visible, wait then fade out and show the app (shared by boot + logo button). */
function dismissSplashAfterDelay() {
  const splash = document.getElementById("splashScreen");
  const appScreen = document.getElementById("appScreen");
  if (!splash || !appScreen) return;

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const splashDuration = reduceMotion ? 250 : 3000;
  const fadeDuration = reduceMotion ? 1 : 650;

  setTimeout(() => {
    splash.classList.add("fadeOut");

    setTimeout(() => {
      splash.classList.add("hidden");
      appScreen.classList.remove("hidden");
      appScreen.scrollIntoView({ block: "nearest" });
      renderProgress();
    }, fadeDuration);
  }, splashDuration);
}

/** Replay splash from the main app (logo button). */
function showSplashFromApp() {
  const splash = document.getElementById("splashScreen");
  const appScreen = document.getElementById("appScreen");
  if (!splash || !appScreen) return;

  clearSplashShakeTimer();

  splash.classList.remove("hidden", "fadeOut");
  splash.style.opacity = "";
  void splash.offsetWidth;

  appScreen.classList.add("hidden");

  // External SVG as <img>: must reload to replay sword + logo animations inside the file.
  reloadSplashSplashImage();

  dismissSplashAfterDelay();
}

function wireUpSplash() {
  const splash = document.getElementById("splashScreen");
  const appScreen = document.getElementById("appScreen");
  if (!splash || !appScreen) return;

  appScreen.classList.add("hidden");

  window.addEventListener("load", () => {
    wireSplashShakeAfterImgLoad();
    dismissSplashAfterDelay();
  });
}

let state = loadState();

// Boot
wireUpSplash();
wireUpUI();
applyStateToUI();

