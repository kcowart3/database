const cancelButton = document.getElementById("cancel-btn");
const createSystemForm = document.getElementById("create-system-form");
const mainTitle = document.getElementById("mainTitle");
const numPlanetsInput = document.getElementById("num-planets");
const systemNameInput = document.getElementById("system-name");
const foundryTabs = document.getElementById("foundry-tabs");
const planetPanels = document.getElementById("planet-tab-panels");
const foundryPanel = document.querySelector(".foundry-panel");
const starTypeSelect = document.getElementById("star-type");
const randomCodeButton = document.getElementById("random-code-btn");
const starPreviewBox = document.getElementById("star-preview-box");
const previewMoons = document.getElementById("preview-moons");
const previewMeta = document.getElementById("preview-meta");
const sunPreview = document.getElementById("sun-preview");
const planetPreview = document.getElementById("planet-preview");
const starPreviewError = document.getElementById("star-preview-error");
const starPreviewCaption = document.getElementById("star-preview-caption");
let previousPlanetCount = Number(numPlanetsInput?.value || 0);
let activePanelId = "general-tab-panel";
let tabTransitionTimer;
let previewScanTimer;
let codeRollTimer;
let previewClockTimer;
const EARTH_DIAMETER_KM = 12742;
const PLANET_SIZE_MIN = 1000;
const PLANET_SIZE_MAX = 250000;
const PLANET_LIMIT = 8;
const MOON_LIMIT = 50;
let currentPreviewSizeKm = EARTH_DIAMETER_KM;
let currentPreviewOrbitIndex = 0;
const moonOrbitCache = {};
const moonRollTimers = new Map();
const planetSizeRollTimers = new Map();

function getPlanetSizeRatio(sizeKm) {
  const safeSize = Math.max(PLANET_SIZE_MIN, Math.min(PLANET_SIZE_MAX, Number(sizeKm) || EARTH_DIAMETER_KM));
  const minLog = Math.log(PLANET_SIZE_MIN);
  const maxLog = Math.log(PLANET_SIZE_MAX);
  const sizeLog = Math.log(safeSize);
  return (sizeLog - minLog) / (maxLog - minLog);
}

if (mainTitle) {
  mainTitle.addEventListener("click", () => {
    window.location.href = "./index.html";
  });
}

cancelButton.addEventListener("click", () => {
  if (confirm("Discard system creation and return to galaxy view?")) {
    window.location.href = "./milkyway.html";
  }
});

function createTabButton(id, label, selected) {
  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "foundry-tab";
  tab.id = `tab-${id}`;
  tab.setAttribute("role", "tab");
  tab.dataset.panel = `${id}-tab-panel`;
  tab.textContent = label;
  tab.setAttribute("aria-selected", selected ? "true" : "false");
  return tab;
}

function getHostStarName() {
  const host = systemNameInput?.value?.trim();
  return host || "Unnamed";
}

function getPlanetSuffix(index) {
  const alphabet = "bcdefghijklmnopqrstuvwxyz";
  return alphabet[index] || `b${index + 1}`;
}

function getDefaultPlanetName(index) {
  return `${getHostStarName()} ${getPlanetSuffix(index)}`;
}

function createPlanetPanel(index) {
  const defaultName = getDefaultPlanetName(index);
  const panel = document.createElement("div");
  panel.className = "tab-panel";
  panel.id = `planet-${index}-tab-panel`;
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", `tab-planet-${index}`);
  panel.hidden = true;

  panel.innerHTML = `
    <div class="form-group">
      <label for="planet-name-${index}">Planet ${index + 1} Name</label>
      <input type="text" id="planet-name-${index}" value="${defaultName}" placeholder="${defaultName}" />
    </div>
    <div class="form-group">
      <label for="planet-atmosphere-${index}">Atmosphere</label>
      <input type="text" id="planet-atmosphere-${index}" placeholder="Atmosphere type" />
    </div>
    <div class="form-group">
      <label for="planet-size-${index}">Planet Size (km diameter)</label>
      <div class="code-row">
        <input type="number" id="planet-size-${index}" min="${PLANET_SIZE_MIN}" max="${PLANET_SIZE_MAX}" value="${EARTH_DIAMETER_KM}" />
        <button type="button" id="planet-size-random-${index}" class="code-btn">Random</button>
      </div>
      <span class="form-hint">Defaults to Earth diameter.</span>
      <span id="planet-size-limit-${index}" class="form-hint moon-limit-note" hidden></span>
    </div>
    <div class="form-group">
      <label for="planet-moons-${index}">Moon Count</label>
      <div class="code-row">
        <input type="number" id="planet-moons-${index}" min="0" max="${MOON_LIMIT}" value="0" />
        <button type="button" id="planet-moons-random-${index}" class="code-btn">Random</button>
      </div>
      <span id="planet-moons-limit-${index}" class="form-hint moon-limit-note" hidden>Moon limit reached (${MOON_LIMIT}).</span>
    </div>
    <div class="form-group">
      <label for="planet-description-${index}">General Description</label>
      <textarea id="planet-description-${index}" class="planet-description-area" rows="7" placeholder="Describe this planet..."></textarea>
    </div>
  `;

  const nameInput = panel.querySelector(`#planet-name-${index}`);
  if (nameInput) {
    nameInput.dataset.defaultName = defaultName;
  }

  return panel;
}

function activateTab(panelId) {
  if (!foundryPanel) {
    return;
  }

  const previousPanelId = activePanelId;
  activePanelId = panelId;
  const tabs = foundryTabs.querySelectorAll(".foundry-tab");
  const panels = createSystemForm.querySelectorAll(".tab-panel");

  tabs.forEach((tab) => {
    const isActive = tab.dataset.panel === panelId;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  panels.forEach((panel) => {
    if (panel.id !== panelId && panel.id !== previousPanelId) {
      panel.hidden = true;
      panel.classList.remove("panel-entering", "panel-leaving");
    }
  });

  window.clearTimeout(tabTransitionTimer);
  tabTransitionTimer = window.setTimeout(() => {
    runPanelTransition(previousPanelId, panelId);
  }, 130);
}

function runPanelTransition(previousPanelId, panelId) {
  const fromPanel = document.getElementById(previousPanelId);
  const toPanel = document.getElementById(panelId);
  if (!toPanel || !foundryPanel) {
    return;
  }

  if (!fromPanel || fromPanel === toPanel) {
    toPanel.hidden = false;
    toPanel.classList.add("panel-scanning");
    updatePreviewForTab(panelId);
    triggerPreviewScan();
    window.setTimeout(() => {
      toPanel.classList.remove("panel-scanning");
    }, 320);
    return;
  }

  fromPanel.hidden = false;
  fromPanel.classList.remove("panel-entering", "panel-scanning");
  fromPanel.classList.add("panel-leaving");
  toPanel.classList.remove("panel-leaving", "panel-entering", "panel-scanning");

  const startHeight = fromPanel.offsetHeight;
  toPanel.hidden = false;
  toPanel.style.position = "absolute";
  toPanel.style.visibility = "hidden";
  toPanel.style.pointerEvents = "none";
  toPanel.style.left = "0";
  toPanel.style.right = "0";
  const targetHeight = toPanel.offsetHeight;
  toPanel.style.position = "";
  toPanel.style.visibility = "";
  toPanel.style.pointerEvents = "";
  toPanel.style.left = "";
  toPanel.style.right = "";
  toPanel.hidden = true;

  foundryPanel.style.height = `${startHeight}px`;
  void foundryPanel.offsetHeight;
  foundryPanel.style.transition = "height 220ms ease";
  foundryPanel.style.height = `${targetHeight}px`;

  window.setTimeout(() => {
    fromPanel.hidden = true;
    fromPanel.classList.remove("panel-leaving");
    toPanel.hidden = false;
    toPanel.classList.add("panel-scanning");
    updatePreviewForTab(panelId);
    triggerPreviewScan();

    window.setTimeout(() => {
      toPanel.classList.remove("panel-scanning");
      foundryPanel.style.transition = "";
      foundryPanel.style.height = "";
    }, 320);
  }, 130);
}

function triggerPreviewScan() {
  if (!starPreviewBox) {
    return;
  }
  window.clearTimeout(previewScanTimer);
  starPreviewBox.classList.remove("scan-reveal");
  void starPreviewBox.offsetWidth;
  starPreviewBox.classList.add("scan-reveal");
  previewScanTimer = window.setTimeout(() => {
    starPreviewBox.classList.remove("scan-reveal");
  }, 340);
}

function renderTabs() {
  moonRollTimers.forEach((timerId) => window.clearInterval(timerId));
  moonRollTimers.clear();
  planetSizeRollTimers.forEach((timerId) => window.clearInterval(timerId));
  planetSizeRollTimers.clear();
  const planetsCount = Math.max(0, Math.min(PLANET_LIMIT, Number(numPlanetsInput.value) || 0));
  const isAddingPlanets = planetsCount > previousPlanetCount;
  planetPanels.innerHTML = "";
  for (let i = 0; i < planetsCount; i += 1) {
    planetPanels.appendChild(createPlanetPanel(i));
  }

  foundryTabs.innerHTML = "";
  foundryTabs.appendChild(createTabButton("general", "General", true));

  for (let i = 0; i < planetsCount; i += 1) {
    const tab = createTabButton(`planet-${i}`, getDefaultPlanetName(i), false);
    if (isAddingPlanets && i >= previousPlanetCount) {
      tab.classList.add("tab-enter");
      tab.addEventListener("animationend", () => tab.classList.remove("tab-enter"), { once: true });
    }
    foundryTabs.appendChild(tab);
  }

  foundryTabs.querySelectorAll(".foundry-tab").forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.panel));
  });

  for (let i = 0; i < planetsCount; i += 1) {
    const input = document.getElementById(`planet-name-${i}`);
    const tab = document.getElementById(`tab-planet-${i}`);
    if (!input || !tab) {
      continue;
    }
    input.addEventListener("input", () => {
      const nextName = input.value.trim() || getDefaultPlanetName(i);
      tab.textContent = nextName;
      const isActive = tab.classList.contains("is-active");
      if (isActive) {
        starPreviewCaption.textContent = `Previewing ${nextName}.`;
      }
    });

    const sizeInput = document.getElementById(`planet-size-${i}`);
    const sizeRandomButton = document.getElementById(`planet-size-random-${i}`);
    const moonsInput = document.getElementById(`planet-moons-${i}`);
    const moonRandomButton = document.getElementById(`planet-moons-random-${i}`);
    if (sizeInput) {
      sizeInput.addEventListener("keydown", (event) => {
        const currentValue = Math.max(PLANET_SIZE_MIN, Math.min(PLANET_SIZE_MAX, Number(sizeInput.value) || EARTH_DIAMETER_KM));
        if ((event.key === "ArrowUp" || event.key === "PageUp") && currentValue >= PLANET_SIZE_MAX) {
          triggerPlanetSizeLimitFeedback(i);
        }
        if ((event.key === "ArrowDown" || event.key === "PageDown") && currentValue <= PLANET_SIZE_MIN) {
          triggerPlanetSizeLimitFeedback(i);
        }
      });
      sizeInput.addEventListener("input", () => {
        const rawValue = Number(sizeInput.value);
        const attemptedAboveMax = Number.isFinite(rawValue) && rawValue > PLANET_SIZE_MAX;
        const attemptedBelowMin = Number.isFinite(rawValue) && rawValue < PLANET_SIZE_MIN;
        const normalized = Math.max(PLANET_SIZE_MIN, Math.min(PLANET_SIZE_MAX, rawValue || EARTH_DIAMETER_KM));
        sizeInput.value = String(normalized);
        sizeInput.dataset.prevValue = String(normalized);
        const shouldShowMin = normalized <= PLANET_SIZE_MIN;
        const shouldShowMax = normalized >= PLANET_SIZE_MAX;
        setPlanetSizeLimitNoteVisible(i, shouldShowMin, shouldShowMax);
        if (attemptedAboveMax || attemptedBelowMin) {
          triggerPlanetSizeLimitFeedback(i);
        }
        if (tab.classList.contains("is-active")) {
          updatePreviewForTab(tab.dataset.panel);
        }
      });
      sizeInput.dataset.prevValue = sizeInput.value;
    }
    if (sizeInput && sizeRandomButton) {
      sizeRandomButton.addEventListener("click", () => {
        const finalSize = Math.floor(Math.random() * (PLANET_SIZE_MAX - PLANET_SIZE_MIN + 1)) + PLANET_SIZE_MIN;
        const existingTimer = planetSizeRollTimers.get(i);
        if (existingTimer) {
          window.clearInterval(existingTimer);
        }
        sizeRandomButton.disabled = true;
        const start = Date.now();
        const durationMs = 820;
        const timerId = window.setInterval(() => {
          const rolling = Math.floor(Math.random() * (PLANET_SIZE_MAX - PLANET_SIZE_MIN + 1)) + PLANET_SIZE_MIN;
          sizeInput.value = String(rolling);
          sizeInput.dispatchEvent(new Event("input", { bubbles: true }));
          if (Date.now() - start >= durationMs) {
            window.clearInterval(timerId);
            planetSizeRollTimers.delete(i);
            sizeInput.value = String(finalSize);
            sizeInput.dispatchEvent(new Event("input", { bubbles: true }));
            sizeRandomButton.disabled = false;
          }
        }, 48);
        planetSizeRollTimers.set(i, timerId);
      });
    }
    if (moonsInput) {
      moonsInput.addEventListener("keydown", (event) => {
        const currentValue = Math.max(0, Math.min(MOON_LIMIT, Number(moonsInput.value) || 0));
        if ((event.key === "ArrowUp" || event.key === "PageUp") && currentValue >= MOON_LIMIT) {
          triggerMoonLimitFeedback(i);
        }
      });
      moonsInput.addEventListener("input", () => {
        const rawValue = Number(moonsInput.value);
        const attemptedAboveLimit = Number.isFinite(rawValue) && rawValue > MOON_LIMIT;
        const normalized = Math.max(0, Math.min(MOON_LIMIT, rawValue || 0));
        moonsInput.value = String(normalized);
        moonsInput.dataset.prevValue = String(normalized);
        const shouldShowLimit = normalized >= MOON_LIMIT;
        setMoonLimitNoteVisible(i, shouldShowLimit);
        if (attemptedAboveLimit) {
          triggerMoonLimitFeedback(i);
        }
        if (tab.classList.contains("is-active")) {
          updatePreviewForTab(tab.dataset.panel);
        }
      });
      moonsInput.dataset.prevValue = moonsInput.value;
    }
    if (moonsInput && moonRandomButton) {
      moonRandomButton.addEventListener("click", () => {
        const finalMoons = Math.floor(Math.random() * (MOON_LIMIT + 1));
        const existingTimer = moonRollTimers.get(i);
        if (existingTimer) {
          window.clearInterval(existingTimer);
        }
        moonRandomButton.disabled = true;
        const start = Date.now();
        const durationMs = 820;
        const timerId = window.setInterval(() => {
          const rolling = Math.floor(Math.random() * (MOON_LIMIT + 1));
          moonsInput.value = String(rolling);
          moonsInput.dispatchEvent(new Event("input", { bubbles: true }));
          if (Date.now() - start >= durationMs) {
            window.clearInterval(timerId);
            moonRollTimers.delete(i);
            moonsInput.value = String(finalMoons);
            moonsInput.dispatchEvent(new Event("input", { bubbles: true }));
            moonRandomButton.disabled = false;
          }
        }, 48);
        moonRollTimers.set(i, timerId);
      });
    }
  }

  activateTab("general-tab-panel");
  previousPlanetCount = planetsCount;
}

function syncDefaultPlanetNamesFromHost() {
  const planetsCount = Math.max(0, Math.min(PLANET_LIMIT, Number(numPlanetsInput.value) || 0));
  for (let i = 0; i < planetsCount; i += 1) {
    const input = document.getElementById(`planet-name-${i}`);
    const tab = document.getElementById(`tab-planet-${i}`);
    if (!input || !tab) {
      continue;
    }

    const previousDefault = input.dataset.defaultName || "";
    const nextDefault = getDefaultPlanetName(i);
    const currentValue = input.value.trim();
    const shouldUpdate = currentValue === "" || currentValue === previousDefault;

    if (shouldUpdate) {
      input.value = nextDefault;
      tab.textContent = nextDefault;
    }

    input.placeholder = nextDefault;
    input.dataset.defaultName = nextDefault;
  }
}

function updateStarPreview() {
  const activeTab = foundryTabs.querySelector(".foundry-tab.is-active");
  if (activeTab && activeTab.dataset.panel !== "general-tab-panel") {
    return;
  }

  const selectedStar = starTypeSelect.value;
  const isGType = selectedStar === "g-type-main-sequence";

  planetPreview.hidden = true;
  if (previewMoons) {
    previewMoons.innerHTML = "";
  }
  sunPreview.hidden = !isGType;
  starPreviewError.hidden = isGType;

  if (isGType) {
    starPreviewCaption.textContent = "G-type main-sequence star selected.";
  } else {
    starPreviewCaption.textContent = `${selectedStar.replace(/-/g, " ")} preview unavailable.`;
  }
  updatePreviewMetaText(EARTH_DIAMETER_KM, 2);
}

function getEstimatedPlanetChronology(orbitIndex, sizeKm) {
  const orbitalAUs = [0.39, 0.72, 1, 1.52, 5.2, 9.58, 19.2, 30.1, 39.5, 50, 65, 80];
  const au = orbitalAUs[orbitIndex] || (1 + orbitIndex * 0.85);
  const yearDays = 365.25 * Math.pow(au, 1.5);
  const sizeScale = Math.max(0.35, Number(sizeKm) / EARTH_DIAMETER_KM);
  const dayHours = Math.max(7, Math.min(220, 24 * Math.sqrt(sizeScale) * (1 + orbitIndex * 0.08)));
  return { dayHours, yearDays };
}

function updatePreviewMetaText(sizeKm, orbitIndex = currentPreviewOrbitIndex) {
  if (!previewMeta) {
    return;
  }
  currentPreviewSizeKm = Math.max(1000, Number(sizeKm) || EARTH_DIAMETER_KM);
  currentPreviewOrbitIndex = Math.max(0, Number(orbitIndex) || 0);
  const chronology = getEstimatedPlanetChronology(currentPreviewOrbitIndex, currentPreviewSizeKm);
  const simSeconds = Math.floor((Date.now() / 1000) * (24 / chronology.dayHours)) % 86400;
  const hours = String(Math.floor(simSeconds / 3600)).padStart(2, "0");
  const mins = String(Math.floor((simSeconds % 3600) / 60)).padStart(2, "0");
  const secs = String(simSeconds % 60).padStart(2, "0");
  previewMeta.textContent = `Size: ${Math.round(currentPreviewSizeKm)} km | Day: ${chronology.dayHours.toFixed(1)}h | Year: ${Math.round(chronology.yearDays)}d | ${hours}:${mins}:${secs}`;
}

function renderPreviewMoons(count, planetSizeKm, panelId) {
  if (!previewMoons) {
    return;
  }
  previewMoons.innerHTML = "";
  const moonsCount = Math.max(0, Math.min(MOON_LIMIT, Number(count) || 0));
  const sizeScale = Math.max(0.8, Math.min(2.2, Number(planetSizeKm || EARTH_DIAMETER_KM) / EARTH_DIAMETER_KM));
  const fixedOrbitOffsets = [10, 26, 42, 58, 74];
  const orbitDurations = [28, 42, 58, 72, 96];
  const cacheKey = panelId || activePanelId || "planet";
  if (!moonOrbitCache[cacheKey]) {
    moonOrbitCache[cacheKey] = [];
  }
  while (moonOrbitCache[cacheKey].length < moonsCount) {
    const orbitIndex = Math.floor(Math.random() * fixedOrbitOffsets.length);
    moonOrbitCache[cacheKey].push({
      orbitIndex,
      offset: fixedOrbitOffsets[orbitIndex],
      delay: Math.random() * -8
    });
  }
  const specs = moonOrbitCache[cacheKey].slice(0, moonsCount);
  const grouped = new Map();
  specs.forEach((spec, index) => {
    if (!grouped.has(spec.orbitIndex)) {
      grouped.set(spec.orbitIndex, []);
    }
    grouped.get(spec.orbitIndex).push({ spec, index });
  });
  const arranged = new Array(specs.length);
  grouped.forEach((entries) => {
    const total = entries.length;
    entries.forEach((entry, idxInOrbit) => {
      const angle = (idxInOrbit / total) * 360;
      arranged[entry.index] = { ...entry.spec, angle };
    });
  });

  for (let i = 0; i < moonsCount; i += 1) {
    const orbitSpec = arranged[i];
    const orbit = document.createElement("span");
    orbit.className = "preview-moon-orbit";
    orbit.style.setProperty("--moon-orbit", `${orbitSpec.offset}px`);
    orbit.style.setProperty("--moon-duration", `${orbitDurations[orbitSpec.orbitIndex] || 58}s`);
    orbit.style.setProperty("--moon-size-scale", String(sizeScale));
    orbit.style.setProperty("--moon-delay", `${orbitSpec.delay}s`);
    orbit.style.setProperty("--moon-angle", `${orbitSpec.angle}deg`);
    previewMoons.appendChild(orbit);
  }
}

function setMoonLimitNoteVisible(index, visible) {
  const note = document.getElementById(`planet-moons-limit-${index}`);
  if (!note) {
    return;
  }
  note.hidden = !visible;
}

function setPlanetSizeLimitNoteVisible(index, atMin, atMax) {
  const note = document.getElementById(`planet-size-limit-${index}`);
  if (!note) {
    return;
  }
  if (atMax) {
    note.textContent = `Maximum diameter reached (${PLANET_SIZE_MAX.toLocaleString()} km).`;
    note.hidden = false;
  } else if (atMin) {
    note.textContent = `Minimum diameter reached (${PLANET_SIZE_MIN.toLocaleString()} km).`;
    note.hidden = false;
  } else {
    note.hidden = true;
  }
}

function setPlanetLimitNoteVisible(visible) {
  const note = document.getElementById("planet-limit-note");
  if (!note) {
    return;
  }
  note.hidden = !visible;
}

function triggerMoonLimitFeedback(index) {
  const moonsInput = document.getElementById(`planet-moons-${index}`);
  if (!moonsInput) {
    return;
  }
  moonsInput.classList.remove("input-limit-shake");
  void moonsInput.offsetWidth;
  moonsInput.classList.add("input-limit-shake");
  moonsInput.addEventListener(
    "animationend",
    () => {
      moonsInput.classList.remove("input-limit-shake");
    },
    { once: true }
  );
}

function triggerPlanetSizeLimitFeedback(index) {
  const sizeInput = document.getElementById(`planet-size-${index}`);
  if (!sizeInput) {
    return;
  }
  sizeInput.classList.remove("input-limit-shake");
  void sizeInput.offsetWidth;
  sizeInput.classList.add("input-limit-shake");
  sizeInput.addEventListener(
    "animationend",
    () => {
      sizeInput.classList.remove("input-limit-shake");
    },
    { once: true }
  );
}

function triggerPlanetLimitFeedback() {
  if (!numPlanetsInput) {
    return;
  }
  numPlanetsInput.classList.remove("input-limit-shake");
  void numPlanetsInput.offsetWidth;
  numPlanetsInput.classList.add("input-limit-shake");
  numPlanetsInput.addEventListener(
    "animationend",
    () => {
      numPlanetsInput.classList.remove("input-limit-shake");
    },
    { once: true }
  );
}

function updatePreviewForTab(panelId) {
  const isGeneralTab = panelId === "general-tab-panel";
  if (isGeneralTab) {
    updateStarPreview();
    return;
  }

  sunPreview.hidden = true;
  starPreviewError.hidden = true;
  planetPreview.hidden = false;

  const match = panelId.match(/^planet-(\d+)-tab-panel$/);
  if (match) {
    const planetIndex = Number(match[1]);
    const nameInput = document.getElementById(`planet-name-${planetIndex}`);
    const sizeInput = document.getElementById(`planet-size-${planetIndex}`);
    const moonsInput = document.getElementById(`planet-moons-${planetIndex}`);
    const sizeKm = Math.max(PLANET_SIZE_MIN, Math.min(PLANET_SIZE_MAX, Number(sizeInput?.value) || EARTH_DIAMETER_KM));
    const label = nameInput?.value?.trim() || getDefaultPlanetName(planetIndex);
    starPreviewCaption.textContent = `Previewing ${label}.`;

    const sizeRatio = getPlanetSizeRatio(sizeKm);
    const previewPercent = 22 + (sizeRatio * 70);
    planetPreview.style.width = `${Math.max(22, Math.min(92, previewPercent))}%`;
    if (starPreviewBox) {
      const expanded = sizeKm >= 20000;
      starPreviewBox.style.minHeight = expanded ? "430px" : "380px";
    }
    renderPreviewMoons(moonsInput?.value, sizeKm, panelId);
    updatePreviewMetaText(sizeKm, planetIndex);
  } else {
    starPreviewCaption.textContent = "Previewing planet.";
    updatePreviewMetaText(EARTH_DIAMETER_KM, 2);
  }
}

createSystemForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const systemName = document.getElementById("system-name").value.trim();
  const systemCode = document.getElementById("system-code").value.trim();
  const starType = document.getElementById("star-type").value;
  const numPlanets = Math.max(0, Math.min(PLANET_LIMIT, Number(document.getElementById("num-planets").value) || 0));
  const description = document.getElementById("system-description").value.trim();
  const discoveredBy = document.getElementById("discoverer-name").value.trim();

  if (!systemName) {
    alert("Please enter a system name.");
    return;
  }

  if (!discoveredBy) {
    alert("Please enter who discovered this system.");
    return;
  }

  if (!systemCode.match(/^\d{4}$/)) {
    alert("System code must be exactly 4 digits.");
    return;
  }

  if (systemCode === "0001") {
    alert("System code 0001 is already taken by Sol.");
    return;
  }

  // Get existing systems from localStorage
  let systems = JSON.parse(localStorage.getItem("luxMoriSystems") || "[]");
  
  // Check if code is already taken
  if (systems.some(sys => sys.code === systemCode)) {
    alert(`System code ${systemCode} is already taken.`);
    return;
  }

  const planets = [];
  for (let i = 0; i < numPlanets; i += 1) {
    planets.push({
      name: (document.getElementById(`planet-name-${i}`)?.value || getDefaultPlanetName(i)).trim() || getDefaultPlanetName(i),
      atmosphere: (document.getElementById(`planet-atmosphere-${i}`)?.value || "Unknown").trim() || "Unknown",
      description: (document.getElementById(`planet-description-${i}`)?.value || "").trim(),
      sizeKm: Math.max(PLANET_SIZE_MIN, Math.min(PLANET_SIZE_MAX, Number(document.getElementById(`planet-size-${i}`)?.value) || EARTH_DIAMETER_KM)),
      moons: Math.max(0, Math.min(MOON_LIMIT, Number(document.getElementById(`planet-moons-${i}`)?.value) || 0))
    });
  }

  // Add new system
  const newSystem = {
    name: systemName,
    code: systemCode,
    rings: Math.max(1, numPlanets || 1),
    starType: starType,
    planets: numPlanets,
    description: description,
    discoveredBy,
    planetDetails: planets,
    // Random position on one of the rings (1-5)
    ring: Math.floor(Math.random() * 5) + 1,
    angle: Math.random() * 360
  };
  
  systems.push(newSystem);
  localStorage.setItem("luxMoriSystems", JSON.stringify(systems));

  alert(`System "${systemName}" (${systemCode}) forged by ${discoveredBy}.`);
  window.location.href = "./milkyway.html";
});

const systemCodeInput = document.getElementById("system-code");
systemCodeInput.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, '');
});

function generateUnusedSystemCode() {
  const systems = JSON.parse(localStorage.getItem("luxMoriSystems") || "[]");
  const usedCodes = new Set(["0001"]);
  systems.forEach((system) => {
    if (system && typeof system.code === "string") {
      usedCodes.add(system.code);
    }
  });

  const availableCodes = [];
  for (let i = 0; i <= 9999; i += 1) {
    const code = String(i).padStart(4, "0");
    if (!usedCodes.has(code)) {
      availableCodes.push(code);
    }
  }

  if (!availableCodes.length) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * availableCodes.length);
  return availableCodes[randomIndex];
}

if (randomCodeButton) {
  randomCodeButton.addEventListener("click", () => {
    const code = generateUnusedSystemCode();
    if (!code) {
      alert("All 4-digit codes are currently in use.");
      return;
    }

    window.clearInterval(codeRollTimer);
    randomCodeButton.disabled = true;

    const start = Date.now();
    const durationMs = 820;
    codeRollTimer = window.setInterval(() => {
      const rolling = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
      systemCodeInput.value = rolling;
      systemCodeInput.dispatchEvent(new Event("input", { bubbles: true }));

      if (Date.now() - start >= durationMs) {
        window.clearInterval(codeRollTimer);
        systemCodeInput.value = code;
        systemCodeInput.dispatchEvent(new Event("input", { bubbles: true }));
        randomCodeButton.disabled = false;
      }
    }, 48);
  });
}

numPlanetsInput.addEventListener("input", () => {
  const rawValue = Number(numPlanetsInput.value);
  const attemptedAboveLimit = Number.isFinite(rawValue) && rawValue > PLANET_LIMIT;
  const normalized = Math.max(0, Math.min(PLANET_LIMIT, rawValue || 0));
  numPlanetsInput.value = String(normalized);
  setPlanetLimitNoteVisible(normalized >= PLANET_LIMIT);
  if (attemptedAboveLimit) {
    triggerPlanetLimitFeedback();
  }
  renderTabs();
});

numPlanetsInput.addEventListener("keydown", (event) => {
  const currentValue = Math.max(0, Math.min(PLANET_LIMIT, Number(numPlanetsInput.value) || 0));
  if ((event.key === "ArrowUp" || event.key === "PageUp") && currentValue >= PLANET_LIMIT) {
    triggerPlanetLimitFeedback();
  }
});

starTypeSelect.addEventListener("change", updateStarPreview);
if (systemNameInput) {
  systemNameInput.addEventListener("input", syncDefaultPlanetNamesFromHost);
}

renderTabs();
updateStarPreview();
window.clearInterval(previewClockTimer);
previewClockTimer = window.setInterval(() => {
  const active = foundryTabs?.querySelector(".foundry-tab.is-active");
  if (!active) {
    return;
  }
  updatePreviewMetaText(currentPreviewSizeKm, currentPreviewOrbitIndex);
}, 1000);
