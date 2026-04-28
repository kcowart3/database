const planetData = {
  Sol: {
    makeup: "A G-type main-sequence star, dense plasma bound by gravity and fusion pressure.",
    description:
      "Sol is old, unstable by human standards, and still the anchor point for surviving routes in this sector.",
    moons: "N/A"
  },
  Mercury: {
    makeup: "Dense rocky world with a large iron core and thin exosphere.",
    description:
      "Mercury is the smallest major planet in Sol and has extreme day-night temperature swings due to its minimal atmosphere.",
    moons: 0
  },
  Venus: {
    makeup: "Rocky planet wrapped in thick carbon dioxide clouds and sulfuric acid haze.",
    description:
      "Venus has crushing pressure and surface heat high enough to melt lead, making it the hottest planet in the system.",
    moons: 0
  },
  Earth: {
    makeup: "Silicate-rock world with iron core, liquid water oceans, and nitrogen-oxygen atmosphere.",
    description:
      "Earth is currently the only known world with stable surface life and complex biospheres across land and sea.",
    moons: 1
  },
  Mars: {
    makeup: "Rocky desert planet rich in iron oxides with a very thin carbon dioxide atmosphere.",
    description:
      "Mars features giant volcanoes, ancient river valleys, and polar ice caps that record a wetter past.",
    moons: 2
  },
  Jupiter: {
    makeup: "Gas giant dominated by hydrogen and helium over a dense internal core region.",
    description:
      "Jupiter is the largest planet in Sol, with powerful storms and intense magnetic radiation belts.",
    moons: 95
  },
  Saturn: {
    makeup: "Hydrogen-helium gas giant with layered clouds and extensive ring material.",
    description:
      "Saturn is known for its brilliant ring system made of ice and rock particles spanning vast distances.",
    moons: 146
  },
  Uranus: {
    makeup: "Ice giant with water-ammonia-methane interior beneath a hydrogen-helium atmosphere.",
    description:
      "Uranus rotates on a dramatic tilt, causing unusual long seasonal cycles at its poles.",
    moons: 27
  },
  Neptune: {
    makeup: "Ice giant with deep volatile-rich interior and methane-tinted atmosphere.",
    description:
      "Neptune drives supersonic winds and large storms in the dark outer region of the Sol system.",
    moons: 14
  }
};

const milkywayButton = document.getElementById("go-milkyway");
const searchSystemsButton = document.getElementById("search-systems");
const createSystemButton = document.getElementById("create-system");
const prevSystemButton = document.getElementById("prev-system");
const nextSystemButton = document.getElementById("next-system");
const hudMessage = document.getElementById("hud-message");
const systemStage = document.querySelector(".system-stage");
const solSystemSvg = document.querySelector(".sol-system-svg");
const systemMeta = document.querySelector(".system-meta");
const systemTitle = document.querySelector(".system-card h2");
const systemCodeLabel = document.querySelector(".system-code");
const systemSummary = document.querySelector(".system-summary");

const modal = document.getElementById("planet-modal");
const planetName = document.getElementById("planet-name");
const planetMakeup = document.getElementById("planet-makeup");
const planetDescription = document.getElementById("planet-description");
const planetMoons = document.getElementById("planet-moons");
const planetViewerImage = document.getElementById("planet-viewer-image");
const planetViewerMeta = document.getElementById("planet-viewer-meta");
const planetViewerMoons = document.getElementById("planet-viewer-moons");
const planetViewerBox = document.querySelector(".modal-preview-box");

const searchModal = document.getElementById("search-modal");
const systemCodeInput = document.getElementById("system-code-input");
const searchBtn = document.getElementById("search-btn");
const searchCloseButton = searchModal ? searchModal.querySelector(".close") : null;

const closeButton = modal.querySelector(".close");

let messageTimeout;

function randomizeOrbitPhases(scope = document) {
  const orbitNodes = scope.querySelectorAll(".svg-orbit");
  orbitNodes.forEach((node) => {
    const duration = Number.parseFloat(window.getComputedStyle(node).animationDuration) || 58;
    node.style.animationDelay = `${-Math.random() * duration}s`;
  });
}
function showHud(text) {
  window.clearTimeout(messageTimeout);
  hudMessage.textContent = text;
  hudMessage.classList.add("show");
  messageTimeout = window.setTimeout(() => {
    hudMessage.classList.remove("show");
  }, 2800);
}

function hideHud() {
  window.clearTimeout(messageTimeout);
  hudMessage.classList.remove("show");
}

function getCustomSystems() {
  return JSON.parse(localStorage.getItem("luxMoriSystems") || "[]");
}

function getAllSystems() {
  const customSystems = getCustomSystems().map((system) => ({
    code: system.code,
    name: system.name,
    summary: system.description || "A newly forged star system in the Milky Way.",
    starType: system.starType,
    rings: system.rings,
    planets: system.planets,
    planetDetails: system.planetDetails || []
  }));

  return [
    {
      code: "0001",
      name: "Sol",
      summary: "Uncountable generations after the Terra Exodus, survivors chart the dead light of Sol and guard what remains."
    },
    ...customSystems
  ];
}

function getCurrentCode() {
  const params = new URLSearchParams(window.location.search);
  const requestedCode = params.get("code");

  if (requestedCode && /^\d{4}$/.test(requestedCode)) {
    return requestedCode;
  }

  return "0001";
}

function applySystemCard(system) {
  if (systemMeta) {
    systemMeta.textContent = "Galaxy: Milky Way";
  }

  if (systemTitle) {
    systemTitle.textContent = `Solar System: ${system.name}`;
  }

  if (systemCodeLabel) {
    systemCodeLabel.textContent = `Code: ${system.code}`;
  }

  if (systemSummary) {
    if (system.code === "0001") {
      systemSummary.textContent = system.summary;
    } else {
      systemSummary.textContent = `${system.summary} Star Type: ${system.starType || "Unknown"}. Orbital Rings: ${system.rings || "N/A"}. Planets: ${system.planets || "N/A"}.`;
    }
  }
}

function navigateToCode(code) {
  window.location.href = `./sol-system.html?code=${encodeURIComponent(code)}`;
}

function getSortedSystems() {
  return getAllSystems()
    .filter((system) => /^\d{4}$/.test(system.code))
    .sort((a, b) => Number(a.code) - Number(b.code));
}

function goToPreviousCode() {
  const systems = getSortedSystems();
  const currentCode = getCurrentCode();
  const currentIndex = systems.findIndex((system) => system.code === currentCode);

  if (currentIndex <= 0) {
    showHud("No lower system code found.");
    return;
  }

  navigateToCode(systems[currentIndex - 1].code);
}

function goToNextCode() {
  const systems = getSortedSystems();

  const currentCode = getCurrentCode();
  const currentIndex = systems.findIndex((system) => system.code === currentCode);

  if (currentIndex === -1 || currentIndex === systems.length - 1) {
    showHud("No higher system code found.");
    return;
  }

  navigateToCode(systems[currentIndex + 1].code);
}

const allSystems = getAllSystems();
const initialCode = getCurrentCode();
const activeSystem = allSystems.find((system) => system.code === initialCode) || allSystems[0];
applySystemCard(activeSystem);

function clearCustomSystemOrbits() {
  const customOrbits = document.querySelectorAll(".custom-system-orbit");
  customOrbits.forEach((orbit) => orbit.remove());
}

function setDefaultSolVisibility(showSol) {
  const defaultOrbits = document.querySelectorAll(".svg-orbit");
  defaultOrbits.forEach((orbit) => {
    orbit.style.display = showSol ? "" : "none";
  });

  const starAnchor = document.querySelector(".star-anchor");
  if (starAnchor) {
    starAnchor.style.display = showSol ? "" : "none";
  }

  if (solSystemSvg) {
    solSystemSvg.style.display = showSol ? "block" : "none";
  }
}

function generateCustomPlanetData(planetName, system) {
  const fromDetails = (system.planetDetails || []).find((p) => p.name === planetName);
  if (fromDetails) {
    const sizeKm = Math.max(1000, Number(fromDetails.sizeKm) || 12742);
    return {
      makeup: `${fromDetails.atmosphere || "Unknown"} atmosphere. Size: ${Math.round(sizeKm)} km.`,
      description: fromDetails.description || `${planetName} is a forged orbiting body in system ${system.code}.`,
      moons: Number.isFinite(fromDetails.moons) ? fromDetails.moons : "Unknown",
      sizeKm
    };
  }
  return {
    makeup: `Generated world in ${system.name}; composition currently unclassified.`,
    description: `${planetName} is a forged orbiting body in system ${system.code}.`,
    moons: "Unknown",
    sizeKm: 12742
  };
}

function bindCelestialInteractions() {
  const allCelestialButtons = document.querySelectorAll(".planet");

  allCelestialButtons.forEach((planet) => {
    if (planet.dataset.bound === "1") {
      return;
    }
    planet.dataset.bound = "1";

    planet.addEventListener("mouseenter", () => {
      const key = planet.dataset.planet;
      const data = planetData[key];
      if (!data) {
        showHud(key);
        return;
      }
      showHud(`${key} - ${data.makeup}`);
    });

    planet.addEventListener("mouseleave", hideHud);

    planet.addEventListener("click", () => {
      const key = planet.dataset.planet;
      const data = planetData[key];
      if (!data) {
        return;
      }

      planetName.textContent = key;
      planetMakeup.textContent = data.makeup;
      planetDescription.textContent = data.description;
      planetMoons.textContent = `Known moons: ${data.moons}`;
      if (planetViewerImage) {
        const isStar = key.toLowerCase().includes("star") || key === "Sol";
        planetViewerImage.src = isStar ? "./assets/svg/Sun.svg" : "./assets/svg/Planet.svg";
        planetViewerImage.classList.toggle("modal-image-star", isStar);
        if (isStar) {
          planetViewerImage.style.width = "96px";
          planetViewerImage.style.height = "96px";
        } else {
          const sizeKm = Math.max(1000, Number(data.sizeKm) || 12742);
          const px = Math.max(56, Math.min(170, Math.round((sizeKm / 12742) * 96)));
          planetViewerImage.style.width = `${px}px`;
          planetViewerImage.style.height = `${px}px`;
        }
      }
      if (planetViewerMeta) {
        const sizeText = Number.isFinite(Number(data.sizeKm)) ? ` | Size: ${Math.round(Number(data.sizeKm))} km` : "";
        planetViewerMeta.textContent = `Status: ${typeof data.moons === "number" ? `${data.moons} moons tracked` : "Star telemetry online"}${sizeText}`;
      }
      renderModalMoons(data.moons);
      modal.showModal();
    });
  });
}

function renderModalMoons(moonsCount) {
  if (!planetViewerMoons) {
    return;
  }
  planetViewerMoons.innerHTML = "";
  const count = Number.isFinite(moonsCount) ? Math.max(0, moonsCount) : 0;
  const fixedOrbitOffsets = [0, 16, 32, 48, 64, 80];
  const orbitDurations = [28, 42, 58, 72, 96, 124];
  const assignments = [];
  for (let i = 0; i < count; i += 1) {
    const orbitIndex = Math.floor(Math.random() * fixedOrbitOffsets.length);
    assignments.push(orbitIndex);
  }
  const grouped = new Map();
  assignments.forEach((orbitIndex, idx) => {
    if (!grouped.has(orbitIndex)) {
      grouped.set(orbitIndex, []);
    }
    grouped.get(orbitIndex).push(idx);
  });

  for (let i = 0; i < count; i += 1) {
    const orbitIndex = assignments[i];
    const orbitOffset = fixedOrbitOffsets[orbitIndex];
    const indexesInBand = grouped.get(orbitIndex) || [i];
    const idxInBand = indexesInBand.indexOf(i);
    const angle = (idxInBand / indexesInBand.length) * 360;
    const orbit = document.createElement("span");
    orbit.className = "modal-moon-orbit";
    orbit.style.setProperty("--moon-orbit", `${orbitOffset}px`);
    orbit.style.setProperty("--moon-duration", `${orbitDurations[orbitIndex] || 58}s`);
    orbit.style.setProperty("--moon-delay", `${Math.random() * -6}s`);
    orbit.style.setProperty("--moon-angle", `${angle}deg`);
    planetViewerMoons.appendChild(orbit);
  }

  if (planetViewerBox) {
    const maxOrbit = count > 0 ? fixedOrbitOffsets[fixedOrbitOffsets.length - 1] : 0;
    planetViewerBox.style.minHeight = `${Math.max(170, 180 + maxOrbit)}px`;
  }
}

function renderCustomSystemStage(system) {
  clearCustomSystemOrbits();
  setDefaultSolVisibility(false);

  const planetCount = Math.max(0, Number(system.planets) || 0);
  const rings = Math.max(1, Math.min(12, Number(system.rings) || planetCount || 1));

  const starButton = document.createElement("button");
  starButton.className = "planet star-anchor";
  starButton.dataset.planet = `${system.name} Star`;
  starButton.setAttribute("aria-label", `${system.name} star`);
  starButton.title = `${system.name} Star`;
  starButton.innerHTML = '<img src="./assets/svg/Sun.svg" alt="" />';
  const center = document.querySelector(".map-center");
  if (center) {
    center.style.display = "flex";
    center.innerHTML = "";
    center.appendChild(starButton);
  }
  planetData[`${system.name} Star`] = generateCustomPlanetData(`${system.name} Star`, system);

  for (let i = 0; i < planetCount; i += 1) {
    const orbit = document.createElement("div");
    orbit.className = "svg-orbit custom-system-orbit";
    const ringIndex = (i % rings) + 1;
    const orbitSize = 90 + ringIndex * 45 + Math.floor(i / rings) * 26;
    orbit.style.width = `${orbitSize}px`;
    orbit.style.height = `${orbitSize}px`;
    orbit.style.animation = `rotateOrbit ${28 + ringIndex * 16 + i * 2}s linear infinite`;

    const planet = document.createElement("button");
    planet.className = "planet";
    const detail = (system.planetDetails || [])[i];
    const planetNameValue = detail?.name || `${system.name} ${i + 1}`;
    planet.dataset.planet = planetNameValue;
    planet.setAttribute("aria-label", planetNameValue);
    planet.title = planetNameValue;
    const sizeKm = Number(detail?.sizeKm) || 12742;
    const px = Math.max(12, Math.min(42, Math.round((sizeKm / 12742) * 16)));
    planet.style.width = `${px}px`;
    planet.style.height = `${px}px`;
    planet.innerHTML = '<img src="./assets/svg/Planet.svg" alt="" />';

    orbit.appendChild(planet);
    systemStage.appendChild(orbit);

    planetData[planetNameValue] = generateCustomPlanetData(planetNameValue, system);
  }

  bindCelestialInteractions();
}

function renderActiveSystemStage(system) {
  clearCustomSystemOrbits();

  if (system.code === "0001") {
    setDefaultSolVisibility(true);
    const center = document.querySelector(".map-center");
    if (center) {
      center.innerHTML = '<button class="planet star-anchor" data-planet="Sol" aria-label="Sol star" title="Sol"><img src="./assets/svg/Sun.svg" alt="" /></button>';
    }
    bindCelestialInteractions();
    return;
  }

  renderCustomSystemStage(system);
}

renderActiveSystemStage(activeSystem);
randomizeOrbitPhases();

milkywayButton.addEventListener("click", () => {
  window.location.href = "./milkyway.html";
});

searchSystemsButton.addEventListener("click", () => {
  searchModal.showModal();
});

searchBtn.addEventListener("click", () => {
  const code = systemCodeInput.value.trim();
  if (code.length === 4 && /^\d{4}$/.test(code)) {
    const found = allSystems.find((system) => system.code === code);
    searchModal.close();
    if (found) {
      navigateToCode(code);
    } else {
      showHud(`System ${code} not found. Create it to claim this code.`);
    }
  } else {
    showHud("Please enter a valid 4-digit system code.");
  }
});

systemCodeInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchBtn.click();
  }
});

if (searchCloseButton) {
  searchCloseButton.addEventListener("click", () => {
    searchModal.close();
  });
}

createSystemButton.addEventListener("click", () => {
  window.location.href = "./create-system.html";
});

if (nextSystemButton) {
  nextSystemButton.addEventListener("click", goToNextCode);
}

if (prevSystemButton) {
  prevSystemButton.addEventListener("click", goToPreviousCode);
}

closeButton.addEventListener("click", () => {
  modal.close();
});

if (searchModal) {
  searchModal.addEventListener("click", (event) => {
    if (event.target.closest(".close")) {
      searchModal.close();
    }
  });
}

if (modal) {
  modal.addEventListener("click", (event) => {
    if (event.target.closest(".close")) {
      modal.close();
    }
  });
}

modal.addEventListener("click", (event) => {
  const isOutside = event.target === modal;
  if (isOutside) {
    modal.close();
  }
});
