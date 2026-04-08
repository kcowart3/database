const searchSystemsButton = document.getElementById("search-systems");
const createSystemButton = document.getElementById("create-system");
const solStarButton = document.getElementById("sol-star");
const hudMessage = document.getElementById("hud-message");
const milkywayStage = document.querySelector(".milkyway-stage");

let messageTimeout;

function showHud(text) {
  window.clearTimeout(messageTimeout);
  hudMessage.textContent = text;
  hudMessage.classList.add("show");
  messageTimeout = window.setTimeout(() => {
    hudMessage.classList.remove("show");
  }, 2800);
}

// Load and render custom systems
function renderCustomSystems() {
  const systems = JSON.parse(localStorage.getItem("luxMoriSystems") || "[]");
  
  systems.forEach(system => {
    // Create orbit container
    const orbitDiv = document.createElement("div");
    orbitDiv.className = "custom-orbit";
    orbitDiv.style.position = "absolute";
    orbitDiv.style.left = "50%";
    orbitDiv.style.top = "50%";
    orbitDiv.style.transform = "translate(-50%, -50%)";
    orbitDiv.style.zIndex = "25";
    
    // Determine ring size based on ring number (1-5)
    const ringSize = system.ring === 1 ? 120 :
                     system.ring === 2 ? 220 :
                     system.ring === 3 ? 340 :
                     system.ring === 4 ? 480 : 640;
    orbitDiv.style.width = ringSize + "px";
    orbitDiv.style.height = ringSize + "px";
    
    // Create star button
    const starButton = document.createElement("button");
    starButton.className = "custom-star";
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
      showHud(`System ${system.code}: ${system.name}`);
    });
    
    starButton.addEventListener("mouseleave", () => {
      starButton.style.transform = "translate(-50%, -50%) scale(1)";
      starButton.style.boxShadow = "0 0 10px rgba(255, 255, 255, 0.7), 0 0 20px rgba(255, 255, 255, 0.4)";
    });
    
    starButton.addEventListener("click", () => {
      showHud(`System ${system.code} (${system.name}) - Full navigation coming soon!`);
    });
    
    // Rotate orbit to position
    orbitDiv.style.animation = `rotateOrbit ${60 + system.ring * 20}s linear infinite`;
    orbitDiv.style.transform = `translate(-50%, -50%) rotate(${system.angle}deg)`;
    
    orbitDiv.appendChild(starButton);
    milkywayStage.appendChild(orbitDiv);
  });
}

// Render systems on page load
renderCustomSystems();

const returnButton = document.getElementById("return-sol");

if (returnButton) {
  returnButton.addEventListener("click", () => {
    window.location.href = "./index.html";
  });
}

solStarButton.addEventListener("click", () => {
  window.location.href = "./index.html";
});

searchSystemsButton.addEventListener("click", () => {
  const code = prompt("Enter a 4-digit system code to search (Sol is 0001):");
  if (code) {
    if (code === "0001") {
      window.location.href = "./index.html";
    } else if (/^\d{4}$/.test(code)) {
      const systems = JSON.parse(localStorage.getItem("luxMoriSystems") || "[]");
      const found = systems.find(sys => sys.code === code);
      if (found) {
        showHud(`Found: ${found.name} (${code})`);
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
