(function () {
  var COMPUTER_START = 0;
  var COMPUTER_LOOP_START = 10;
  var TICK_MS = 1200;
  var STORAGE = {
    ambientEnabled: "luxMoriAmbientEnabled",
    computerTime: "luxMoriComputerTime",
    ambientTime: "luxMoriAmbientTime"
  };

  var computer = new Audio("./assets/Computer Sounds.mp3");
  var ambient = new Audio("./assets/Orrery.mp3");
  computer.preload = "auto";
  ambient.preload = "auto";
  computer.loop = false;
  ambient.loop = true;
  computer.volume = 0.10;
  ambient.volume = 0.37;

  function getTime(key, fallback) {
    var value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  function saveTimes() {
    if (!computer.paused && Number.isFinite(computer.currentTime)) {
      localStorage.setItem(STORAGE.computerTime, String(computer.currentTime));
    }
    if (!ambient.paused && Number.isFinite(ambient.currentTime)) {
      localStorage.setItem(STORAGE.ambientTime, String(ambient.currentTime));
    }
  }

  function attemptPlay(audio) {
    var promise = audio.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(function () {});
    }
  }

  function startComputer() {
    var resumeTime = getTime(STORAGE.computerTime, COMPUTER_START);
    computer.currentTime = resumeTime;
    attemptPlay(computer);
  }

  function startAmbientIfEnabled() {
    if (localStorage.getItem(STORAGE.ambientEnabled) !== "1") {
      return;
    }
    var resumeTime = getTime(STORAGE.ambientTime, 0);
    ambient.currentTime = resumeTime;
    attemptPlay(ambient);
  }

  function enableAmbient() {
    localStorage.setItem(STORAGE.ambientEnabled, "1");
    startAmbientIfEnabled();
  }

  computer.addEventListener("ended", function () {
    computer.currentTime = COMPUTER_LOOP_START;
    attemptPlay(computer);
  });

  computer.addEventListener("timeupdate", function () {
    if (computer.duration && computer.currentTime >= computer.duration - 0.12) {
      computer.currentTime = COMPUTER_LOOP_START;
      attemptPlay(computer);
    }
  });

  function unlockAudio() {
    attemptPlay(computer);
    startAmbientIfEnabled();
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  }

  window.setInterval(saveTimes, TICK_MS);
  window.addEventListener("beforeunload", saveTimes);
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);

  startComputer();
  startAmbientIfEnabled();

  window.luxAudio = {
    enableAmbient: enableAmbient
  };
})();
