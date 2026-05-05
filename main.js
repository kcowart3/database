const menuToggle = document.getElementById("menuToggle");
const siteMenu = document.getElementById("siteMenu");
const menuLinks = siteMenu.querySelectorAll("a");
const mediaRows = document.querySelectorAll(".media-row");
const rowArrows = document.querySelectorAll(".row-arrow");

function closeMenu() {
  siteMenu.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}

menuToggle.addEventListener("click", () => {
  const isOpen = siteMenu.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

menuLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const targetId = link.getAttribute("href");
    if (!targetId) {
      return;
    }

    const target = document.querySelector(targetId);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    closeMenu();
  });
});

document.addEventListener("click", (event) => {
  if (!siteMenu.contains(event.target) && !menuToggle.contains(event.target)) {
    closeMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});

mediaRows.forEach((row) => {
  row.addEventListener("pointerover", (event) => {
    if (event.target.closest(".media-frame")) {
      row.classList.add("paused");
    }
  });

  row.addEventListener("pointerout", (event) => {
    const movedIntoFrame = event.relatedTarget && event.relatedTarget.closest(".media-frame");
    if (event.target.closest(".media-frame") && !movedIntoFrame) {
      row.classList.remove("paused");
    }
  });

  row.addEventListener("focusin", (event) => {
    if (event.target.closest(".media-frame")) {
      row.classList.add("paused");
    }
  });

  row.addEventListener("focusout", () => {
    row.classList.remove("paused");
  });
});

function clearAcceleration(strip) {
  strip.classList.remove("accelerate-burst");
}

function burstAcceleration(strip) {
  clearAcceleration(strip);
  strip.classList.add("accelerate-burst");
  window.setTimeout(() => {
    strip.classList.remove("accelerate-burst");
  }, 620);
}

rowArrows.forEach((arrow) => {
  const strip = arrow.closest(".media-strip");
  if (!strip) {
    return;
  }

  arrow.addEventListener("click", () => {
    burstAcceleration(strip);
  });
});
