const searchSystemsButton = document.getElementById("search-systems");
const catalogSystemsButton = document.getElementById("catalog-systems");
const createSystemButton = document.getElementById("create-system");
const resetSystemsButton = document.getElementById("reset-systems");
const solStarButton = document.getElementById("sol-star");
const mainTitle = document.getElementById("mainTitle");
const hudMessage = document.getElementById("hud-message");
const milkywayStage = document.querySelector(".milkyway-stage");
const catalogModal = document.getElementById("catalog-modal");
const catalogClose = document.getElementById("catalog-close");
const catalogContent = document.getElementById("catalog-content");
const celestialModal = document.getElementById("celestial-modal");
const celestialName = document.getElementById("celestial-name");
const celestialDescription = document.getElementById("celestial-description");
const celestialImage = document.getElementById("celestial-image");
const celestialMeta = document.getElementById("celestial-meta");
const celestialOpenBtn = document.getElementById("celestial-open-btn");
let activeCelestialCode = null;

let messageTimeout;

function randomizeOrbitPhases(scope = document) {
  const orbitNodes = scope.querySelectorAll(".orbit-sol, .custom-orbit");
  orbitNodes.forEach((node) => {
    const duration = Number.parseFloat(window.getComputedStyle(node).animationDuration) || 80;
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

function goToSystem(code) {
  window.location.href = `./sol-system.html?code=${encodeURIComponent(code)}`;
}

function getCustomSystems() {
  return JSON.parse(localStorage.getItem("luxMoriSystems") || "[]");
}

function clearCustomSystems() {
  const previous = milkywayStage.querySelectorAll(".custom-orbit");
  previous.forEach((node) => node.remove());
}

function renderCustomSystems() {
  clearCustomSystems();
  const systems = getCustomSystems();

  systems.forEach((system) => {
    const orbitDiv = document.createElement("div");
    orbitDiv.className = "custom-orbit";
    orbitDiv.style.position = "absolute";
    orbitDiv.style.left = "50%";
    orbitDiv.style.top = "50%";
    orbitDiv.style.transform = "translate(-50%, -50%)";
    orbitDiv.style.zIndex = "25";
    
    const ringSize = system.ring === 1 ? 120 :
                     system.ring === 2 ? 220 :
                     system.ring === 3 ? 340 :
                     system.ring === 4 ? 480 : 640;
    orbitDiv.style.width = ringSize + "px";
    orbitDiv.style.height = ringSize + "px";
    
    const starButton = document.createElement("button");
    starButton.className = "custom-star galaxy-star";
    starButton.style.position = "absolute";
    starButton.style.left = "100%";
    starButton.style.top = "50%";
    starButton.style.transform = "translate(-50%, -50%)";
    starButton.style.width = "10px";
    starButton.style.height = "10px";
    starButton.style.background = "white";
    starButton.style.borderRadius = "50%";
    starButton.style.border = "0";
    starButton.style.cursor = "pointer";
    starButton.style.boxShadow = "0 0 10px rgba(255, 255, 255, 0.7), 0 0 20px rgba(255, 255, 255, 0.4)";
    starButton.style.transition = "all 0.2s ease";
    starButton.title = `${system.name} (${system.code})`;
    
    starButton.addEventListener("mouseenter", () => {
      starButton.style.transform = "translate(-50%, -50%) scale(1.3)";
      starButton.style.boxShadow = "0 0 14px rgba(255, 255, 255, 1), 0 0 28px rgba(255, 255, 255, 0.6)";
      showHud(`System ${system.code}: ${system.name} (${system.discoveredBy || "Unknown discoverer"})`);
    });
    
    starButton.addEventListener("mouseleave", () => {
      starButton.style.transform = "translate(-50%, -50%) scale(1)";
      starButton.style.boxShadow = "0 0 10px rgba(255, 255, 255, 0.7), 0 0 20px rgba(255, 255, 255, 0.4)";
    });
    
    starButton.addEventListener("click", () => {
      openCelestialModal({
        name: system.name,
        description: system.description || "Forged system.",
        starType: system.starType || "Unknown",
        image: "./assets/Sun.svg",
        code: system.code
      });
    });
    
    orbitDiv.style.animation = `rotateOrbit ${60 + system.ring * 20}s linear infinite`;
    orbitDiv.style.transform = `translate(-50%, -50%) rotate(${system.angle}deg)`;
    orbitDiv.style.animationDelay = `${-(Math.random() * (60 + system.ring * 20))}s`;
    
    orbitDiv.appendChild(starButton);
    milkywayStage.appendChild(orbitDiv);
  });
}

function openCelestialModal(payload) {
  if (!celestialModal || !celestialName || !celestialDescription || !celestialImage || !celestialMeta) {
    return;
  }
  celestialName.textContent = payload.name || "Celestial Body";
  celestialDescription.textContent = payload.description || "No data available.";
  celestialImage.src = payload.image || "./assets/Planet.svg";
  celestialMeta.textContent = payload.starType ? `Type: ${payload.starType}` : "Telemetry online";
  activeCelestialCode = payload.code || null;
  if (celestialOpenBtn) {
    celestialOpenBtn.style.display = activeCelestialCode ? "block" : "none";
  }
  celestialModal.showModal();
}

function openCatalog() {
  if (!catalogModal || !catalogContent) {
    return;
  }

  const systems = getCustomSystems();
  if (!systems.length) {
    catalogContent.innerHTML = "<p>No forged systems yet.</p>";
    catalogModal.showModal();
    return;
  }

  const groupedByDiscoverer = systems.reduce((acc, system) => {
    const key = (system.discoveredBy || "Unknown").trim() || "Unknown";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(system);
    return acc;
  }, {});

  const discoverers = Object.keys(groupedByDiscoverer).sort((a, b) => a.localeCompare(b));
  catalogContent.innerHTML = discoverers.map((discoverer) => {
    const rows = groupedByDiscoverer[discoverer]
      .sort((a, b) => Number(a.code) - Number(b.code))
      .map((system) => `<li><strong>${system.code}</strong> - ${system.name}</li>`)
      .join("");

    return `<section class="catalog-discoverer"><h4>${discoverer}</h4><ul>${rows}</ul></section>`;
  }).join("");

  catalogModal.showModal();
}

renderCustomSystems();
randomizeOrbitPhases();

if (mainTitle) {
  mainTitle.addEventListener("click", () => {
    window.location.href = "./index.html";
  });
}

solStarButton.addEventListener("click", () => {
  goToSystem("0001");
});

solStarButton.addEventListener("mouseenter", () => {
  showHud("System 0001: Sol");
});

solStarButton.addEventListener("mouseleave", () => {
  hudMessage.classList.remove("show");
});

searchSystemsButton.addEventListener("click", () => {
  const code = prompt("Enter a 4-digit system code to search (Sol is 0001):");
  if (code) {
    if (code === "0001") {
      goToSystem("0001");
    } else if (/^\d{4}$/.test(code)) {
      const systems = getCustomSystems();
      const found = systems.find(sys => sys.code === code);
      if (found) {
        goToSystem(found.code);
      } else {
        showHud(`System ${code} not found. Create it to claim this code.`);
      }
    } else {
      showHud("Please enter a valid 4-digit system code.");
    }
  }
});

createSystemButton.addEventListener("click", () => {
  window.location.href = "./create-system.html";
});

if (catalogSystemsButton) {
  catalogSystemsButton.addEventListener("click", openCatalog);
}

if (catalogModal) {
  catalogModal.addEventListener("click", (event) => {
    if (event.target.closest(".close")) {
      catalogModal.close();
      return;
    }
  });

  catalogModal.addEventListener("click", (event) => {
    if (event.target === catalogModal) {
      catalogModal.close();
    }
  });
}

if (celestialModal) {
  celestialModal.addEventListener("click", (event) => {
    if (event.target.closest(".close") || event.target === celestialModal) {
      celestialModal.close();
    }
  });
}

if (celestialOpenBtn) {
  celestialOpenBtn.addEventListener("click", () => {
    if (activeCelestialCode) {
      goToSystem(activeCelestialCode);
    }
  });
}

if (resetSystemsButton) {
  resetSystemsButton.addEventListener("click", () => {
    if (!confirm("Reset and remove all forged solar systems?")) {
      return;
    }
    localStorage.removeItem("luxMoriSystems");
    renderCustomSystems();
    showHud("All forged systems removed.");
  });
}
