(function () {
  var strip = document.getElementById("kabukiPostcards");
  var lightbox = document.getElementById("kabukiLightbox");
  var imgEl = document.getElementById("kabukiLightboxImg");
  var closeBtn = document.getElementById("kabukiLightboxClose");
  var prevBtn = document.getElementById("kabukiLightboxPrev");
  var nextBtn = document.getElementById("kabukiLightboxNext");
  if (!strip || !lightbox || !imgEl || !closeBtn || !prevBtn || !nextBtn) {
    return;
  }

  var buttons = strip.querySelectorAll("button[data-kabuki-src]");
  var list = Array.prototype.map.call(buttons, function (btn) {
    return btn.getAttribute("data-kabuki-src") || "";
  });
  var index = 0;

  function openAt(i) {
    if (list.length === 0) {
      return;
    }
    index = ((i % list.length) + list.length) % list.length;
    imgEl.src = list[index];
    imgEl.alt = "Postcard study " + (index + 1);
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }

  function close() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    imgEl.removeAttribute("src");
  }

  strip.addEventListener("click", function (event) {
    var btn = event.target.closest("button[data-kabuki-src]");
    if (!btn) {
      return;
    }
    var src = btn.getAttribute("data-kabuki-src");
    var i = list.indexOf(src);
    openAt(i >= 0 ? i : 0);
  });

  closeBtn.addEventListener("click", close);
  prevBtn.addEventListener("click", function () {
    openAt(index - 1);
  });
  nextBtn.addEventListener("click", function () {
    openAt(index + 1);
  });

  lightbox.addEventListener("click", function (event) {
    if (event.target === lightbox) {
      close();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (!lightbox.classList.contains("is-open")) {
      return;
    }
    if (event.key === "Escape") {
      close();
    } else if (event.key === "ArrowLeft") {
      openAt(index - 1);
    } else if (event.key === "ArrowRight") {
      openAt(index + 1);
    }
  });
})();
