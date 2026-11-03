const logoTrigger = document.getElementById("logoTrigger");
const splashPage = document.querySelector(".splash-page");
const splashGate = document.getElementById("splashGate");
const enterPortfolioBtn = document.getElementById("enterPortfolioBtn");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let phase = "idle";

function revealGate() {
  if (phase !== "filling") {
    return;
  }
  phase = "gate";
  splashPage.classList.add("show-gate");
  logoTrigger.setAttribute("aria-expanded", "true");
  splashGate.hidden = false;
  window.requestAnimationFrame(() => {
    enterPortfolioBtn.focus({ preventScroll: true });
  });
}

function runExitThenGo() {
  if (phase !== "gate") {
    return;
  }
  phase = "exiting";
  enterPortfolioBtn.disabled = true;
  logoTrigger.disabled = true;
  splashPage.classList.add("exit");
  const waitMs = reducedMotion ? 220 : 1180;
  window.setTimeout(() => {
    window.location.href = "index.html";
  }, waitMs);
}

logoTrigger.addEventListener("click", () => {
  if (phase === "gate" || phase === "exiting") {
    return;
  }
  if (phase === "filling") {
    return;
  }

  phase = "filling";
  logoTrigger.classList.add("playing");
  splashPage.classList.add("pulse");

  const revealDelay = reducedMotion ? 80 : 900;
  window.setTimeout(revealGate, revealDelay);
});

enterPortfolioBtn.addEventListener("click", runExitThenGo);
