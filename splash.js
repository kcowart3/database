const logoTrigger = document.getElementById("logoTrigger");
const splashPage = document.querySelector(".splash-page");
let isPlaying = false;

logoTrigger.addEventListener("click", () => {
  if (isPlaying) {
    return;
  }

  isPlaying = true;
  logoTrigger.classList.add("playing");
  splashPage.classList.add("pulse");

  window.setTimeout(() => {
    splashPage.classList.add("exit");
  }, 820);

  window.setTimeout(() => {
    window.location.href = "index.html";
  }, 1850);
});
