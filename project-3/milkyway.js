const returnButton = document.getElementById("return-sol");
const viewGalaxiesButton = document.getElementById("view-galaxies");
const createGalaxyButton = document.getElementById("create-galaxy");
const hudMessage = document.getElementById("hud-message");

let messageTimeout;

function showHud(text) {
  window.clearTimeout(messageTimeout);
  hudMessage.textContent = text;
  hudMessage.classList.add("show");
  messageTimeout = window.setTimeout(() => {
    hudMessage.classList.remove("show");
  }, 2800);
}

returnButton.addEventListener("click", () => {
  window.location.href = "./index.html";
});

viewGalaxiesButton.addEventListener("click", () => {
  showHud("Community galaxy archives opened. Ghost-light sectors indexed.");
});

createGalaxyButton.addEventListener("click", () => {
  showHud("Galaxy forge initialized. Begin by naming your dying cluster.");
});
