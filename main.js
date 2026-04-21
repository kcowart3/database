const logoTrigger = document.getElementById("logoTrigger");
const hero = document.querySelector(".hero");
const mainSite = document.getElementById("mainSite");
let didActivate = false;

logoTrigger.addEventListener("click", () => {
  if (didActivate) {
    return;
  }

  didActivate = true;
  logoTrigger.classList.add("active");

  setTimeout(() => {
    hero.classList.add("fade-out");
  }, 380);

  setTimeout(() => {
    mainSite.classList.add("active");
    mainSite.setAttribute("aria-hidden", "false");
  }, 950);
});
