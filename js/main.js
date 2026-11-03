const menuToggle = document.getElementById("menuToggle");
const siteMenu = document.getElementById("siteMenu");

const LOOP_SECONDS = {
  "24s": 70,
  "26s": 74,
  "28s": 78,
  "30s": 86,
};

function closeMenu() {
  if (!siteMenu || !menuToggle) {
    return;
  }
  siteMenu.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}

if (menuToggle && siteMenu) {
  const menuLinks = siteMenu.querySelectorAll("a");

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
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});

function wrapOffset(x, loopW) {
  if (loopW <= 0) {
    return 0;
  }
  let o = x;
  while (o <= -loopW) {
    o += loopW;
  }
  while (o > 0) {
    o -= loopW;
  }
  return o;
}

function setupInfiniteStrip(strip) {
  const viewport = strip.querySelector(".media-viewport");
  const row = strip.querySelector(".media-row");
  const track = strip.querySelector(".media-strip-scrub-track");
  const thumb = strip.querySelector(".media-strip-scrub-thumb");
  if (!viewport || !row || !track) {
    return;
  }

  const originals = [...row.children];
  originals.forEach((node) => {
    row.appendChild(node.cloneNode(true));
  });

  const speedKey = strip.getAttribute("data-speed") || "28s";
  const loopSeconds = LOOP_SECONDS[speedKey] ?? 78;
  const reverse = strip.classList.contains("media-strip-reverse");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let loopW = 0;
  let offset = 0;
  let autoVx = 0;
  let dragging = false;
  let dragStartClientX = 0;
  let dragStartOffset = 0;
  let dragTrackWidth = 0;
  let dragMoved = false;
  let lastTs = 0;
  let rafId = 0;

  function measure() {
    loopW = row.scrollWidth / 2;
    const sign = reverse ? 1 : -1;
    autoVx = reducedMotion || loopW <= 0 ? 0 : (sign * loopW) / loopSeconds;
  }

  function applyTransform() {
    row.style.transform = `translate3d(${offset}px,0,0)`;
  }

  function thumbMetrics() {
    const rect = track.getBoundingClientRect();
    const w = rect.width;
    if (w <= 0 || loopW <= 0) {
      return { trackW: 0, thumbW: 0, range: 0 };
    }
    const thumbW = Math.min(Math.max(w * 0.12, 48), w * 0.42);
    return { trackW: w, thumbW, range: Math.max(0, w - thumbW) };
  }

  function updateThumb() {
    if (!thumb || loopW <= 0) {
      return;
    }
    const { trackW, thumbW, range } = thumbMetrics();
    if (trackW <= 0) {
      return;
    }
    thumb.style.width = `${thumbW}px`;
    const ratio = Math.min(1, Math.max(0, -offset / loopW));
    thumb.style.left = `${ratio * range}px`;
  }

  function frame(ts) {
    if (!lastTs) {
      lastTs = ts;
    }
    const dt = Math.min(48, ts - lastTs) / 1000;
    lastTs = ts;

    if (!dragging && loopW > 0) {
      offset += autoVx * dt;
      offset = wrapOffset(offset, loopW);
    }

    applyTransform();
    updateThumb();
    rafId = window.requestAnimationFrame(frame);
  }

  function remeasure() {
    measure();
    offset = wrapOffset(offset, loopW);
    applyTransform();
    updateThumb();
  }

  measure();
  applyTransform();
  updateThumb();
  rafId = window.requestAnimationFrame(frame);

  window.addEventListener("resize", remeasure);
  window.requestAnimationFrame(remeasure);

  function jumpToClientX(clientX) {
    const rect = track.getBoundingClientRect();
    const { trackW, thumbW, range } = thumbMetrics();
    if (trackW <= 0 || loopW <= 0) {
      return;
    }
    const x = clientX - rect.left;
    const ratio = range > 0 ? Math.min(1, Math.max(0, (x - thumbW / 2) / range)) : 0;
    offset = wrapOffset(-ratio * loopW, loopW);
    applyTransform();
    updateThumb();
  }

  track.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    dragging = true;
    dragMoved = false;
    dragStartClientX = event.clientX;
    dragStartOffset = offset;
    dragTrackWidth = track.getBoundingClientRect().width;
    track.classList.add("is-dragging");
    track.setPointerCapture(event.pointerId);
  });

  track.addEventListener("pointermove", (event) => {
    if (!dragging) {
      return;
    }
    const dx = event.clientX - dragStartClientX;
    if (Math.abs(dx) > 4) {
      dragMoved = true;
    }
    const tw = dragTrackWidth > 0 ? dragTrackWidth : track.getBoundingClientRect().width;
    if (tw > 0 && loopW > 0) {
      offset = wrapOffset(dragStartOffset - (dx / tw) * loopW, loopW);
      applyTransform();
      updateThumb();
    }
  });

  function endScrubPointer(event) {
    if (!dragging) {
      return;
    }
    dragging = false;
    track.classList.remove("is-dragging");
    try {
      track.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    if (!dragMoved && event.type === "pointerup") {
      jumpToClientX(event.clientX);
    }
    dragMoved = false;
  }

  track.addEventListener("pointerup", endScrubPointer);
  track.addEventListener("pointercancel", endScrubPointer);
}

document.querySelectorAll(".media-strip").forEach((strip) => {
  setupInfiniteStrip(strip);
});

const FEATURED_PREVIEW_LOOP_SEC = 2;

function setupFeaturedSitePreviewLoops(root = document) {
  root.querySelectorAll("video.strip-card__media--featured-preview").forEach((video) => {
    function applyShortClipLoop() {
      if (Number.isFinite(video.duration) && video.duration < FEATURED_PREVIEW_LOOP_SEC) {
        video.loop = true;
      }
    }

    video.addEventListener("loadedmetadata", applyShortClipLoop);

    video.addEventListener("timeupdate", () => {
      if (!Number.isFinite(video.duration) || video.duration < FEATURED_PREVIEW_LOOP_SEC) {
        return;
      }
      if (video.currentTime >= FEATURED_PREVIEW_LOOP_SEC) {
        video.currentTime = 0;
      }
    });
  });
}

setupFeaturedSitePreviewLoops();
