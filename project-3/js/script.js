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
const hudMessage = document.getElementById("hud-message");

const modal = document.getElementById("planet-modal");
const planetName = document.getElementById("planet-name");
const planetMakeup = document.getElementById("planet-makeup");
const planetDescription = document.getElementById("planet-description");
const planetMoons = document.getElementById("planet-moons");

const searchModal = document.getElementById("search-modal");
const systemCodeInput = document.getElementById("system-code-input");
const searchBtn = document.getElementById("search-btn");
const searchCloseButton = searchModal ? searchModal.querySelector(".close") : null;

const planetButtons = document.querySelectorAll(".planet");
const closeButton = modal.querySelector(".close");

let messageTimeout;
function showHud(text) {
  window.clearTimeout(messageTimeout);
  hudMessage.textContent = text;
  hudMessage.classList.add("show");
  messageTimeout = window.setTimeout(() => {
    hudMessage.classList.remove("show");
  }, 2800);
}

milkywayButton.addEventListener("click", () => {
  window.location.href = "./milkyway.html";
});

searchSystemsButton.addEventListener("click", () => {
  searchModal.showModal();
});

searchBtn.addEventListener("click", () => {
  const code = systemCodeInput.value.trim();
  if (code.length === 4 && /^\d{4}$/.test(code)) {
    if (code === "0001") {
      searchModal.close();
      showHud("Already viewing System 0001 (Sol).");
    } else {
      showHud(`System ${code} not found. Create it to claim this code.`);
      searchModal.close();
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

planetButtons.forEach((planet) => {
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
    modal.showModal();
  });
});

closeButton.addEventListener("click", () => {
  modal.close();
});

modal.addEventListener("click", (event) => {
  const isOutside = event.target === modal;
  if (isOutside) {
    modal.close();
  }
});
