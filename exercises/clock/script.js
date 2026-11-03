const secondsEl = document.querySelector(".seconds");
const minutesEl = document.querySelector(".minutes");
const hoursEl = document.querySelector(".hours");

function updateClock() {
  const now = new Date();
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + now.getSeconds() / 60;
  const hours = (now.getHours() % 12) + now.getMinutes() / 60;

  const secondsAngle = (seconds / 60) * 360;
  const minutesAngle = (minutes / 60) * 360;
  const hoursAngle = (hours / 12) * 360;

  secondsEl.style.setProperty("--seconds-angle", `${secondsAngle}deg`);
  minutesEl.style.setProperty("--minutes-angle", `${minutesAngle}deg`);
  hoursEl.style.setProperty("--hours-angle", `${hoursAngle}deg`);
}

updateClock();
setInterval(updateClock, 100);
