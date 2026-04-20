const goBackButton = document.getElementById("go-back");
const cancelButton = document.getElementById("cancel-btn");
const createSystemForm = document.getElementById("create-system-form");
const mainTitle = document.getElementById("mainTitle");

if (mainTitle) {
  mainTitle.addEventListener("click", () => {
    window.location.href = "./index.html";
  });
}

if (goBackButton) {
  goBackButton.addEventListener("click", () => {
    window.location.href = "./milkyway.html";
  });
}

cancelButton.addEventListener("click", () => {
  if (confirm("Discard system creation and return to galaxy view?")) {
    window.location.href = "./milkyway.html";
  }
});

createSystemForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const systemName = document.getElementById("system-name").value;
  const systemCode = document.getElementById("system-code").value;
  const numRings = document.getElementById("num-rings").value;
  const starType = document.getElementById("star-type").value;
  const numPlanets = document.getElementById("num-planets").value;
  const description = document.getElementById("system-description").value;

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

  // Add new system
  const newSystem = {
    name: systemName,
    code: systemCode,
    rings: numRings,
    starType: starType,
    planets: numPlanets,
    description: description,
    // Random position on one of the rings (1-5)
    ring: Math.floor(Math.random() * 5) + 1,
    angle: Math.random() * 360
  };
  
  systems.push(newSystem);
  localStorage.setItem("luxMoriSystems", JSON.stringify(systems));

  alert(`System "${systemName}" (${systemCode}) forged!\n\nRings: ${numRings}\nStar: ${starType}\nPlanets: ${numPlanets}\n\nSystem view created.`);
  
  window.location.href = `./index.html?code=${encodeURIComponent(systemCode)}&nosplash=1`;
});

const systemCodeInput = document.getElementById("system-code");
systemCodeInput.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, '');
});
