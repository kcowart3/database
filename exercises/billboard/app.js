const form = document.querySelector("#add-video-form");
const urlInput = document.querySelector("#youtube-url");
const viewport = document.querySelector("#viewport");
const board = document.querySelector("#board");
const tileTemplate = document.querySelector("#tile-template");
const tileCount = document.querySelector("#tile-count");
const randomVideoButton = document.querySelector("#random-video-btn");
const emptySpaceButton = document.querySelector("#empty-space-btn");

const STORAGE_KEY = "tubewall-youtube-wall-v2";
const tileSize = { w: 112, h: 72 };
const gap = 10;
const gridColumns = 12;

const state = {
  videos: loadVideos(),
  transform: {
    x: 0,
    y: 0,
    scale: 1,
  },
  drag: {
    isDragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  },
};

init();

function init() {
  form.addEventListener("submit", handleAddVideo);
  randomVideoButton.addEventListener("click", takeToRandomVideo);
  emptySpaceButton.addEventListener("click", takeToEmptySpace);
  viewport.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  viewport.addEventListener("wheel", handleWheelZoom, { passive: false });
  window.addEventListener("resize", centerCameraOnVideos);
  render();
  centerCameraOnVideos();
}

function handleAddVideo(event) {
  event.preventDefault();
  const rawUrl = urlInput.value.trim();
  const videoId = parseYouTubeId(rawUrl);

  if (!videoId) {
    alert("Please paste a valid YouTube URL.");
    return;
  }

  const exists = state.videos.some((video) => video.id === videoId);
  if (exists) {
    alert("That video already exists on the board.");
    return;
  }

  const thumb = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  const fallback = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => {
    const color = getDominantColor(image);
    state.videos.push({
      id: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumb,
      fallback,
      color,
      createdAt: Date.now(),
    });
    saveVideos(state.videos);
    render();
    centerCameraOnVideos();
    form.reset();
  };
  image.onerror = () => {
    state.videos.push({
      id: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumb: fallback,
      fallback,
      color: { h: 0, s: 0.05, l: 0.45 },
      createdAt: Date.now(),
    });
    saveVideos(state.videos);
    render();
    centerCameraOnVideos();
    form.reset();
  };
  image.src = thumb;
}

function handlePointerDown(event) {
  if (event.button !== 0) return;
  state.drag.isDragging = true;
  state.drag.startX = event.clientX;
  state.drag.startY = event.clientY;
  state.drag.originX = state.transform.x;
  state.drag.originY = state.transform.y;
  viewport.classList.add("dragging");
}

function handlePointerMove(event) {
  if (!state.drag.isDragging) return;
  const deltaX = event.clientX - state.drag.startX;
  const deltaY = event.clientY - state.drag.startY;
  state.transform.x = state.drag.originX + deltaX;
  state.transform.y = state.drag.originY + deltaY;
  applyTransform();
}

function handlePointerUp() {
  if (!state.drag.isDragging) return;
  state.drag.isDragging = false;
  viewport.classList.remove("dragging");
}

function handleWheelZoom(event) {
  event.preventDefault();
  const zoomAmount = -event.deltaY * 0.0012;
  const nextScale = clamp(state.transform.scale * (1 + zoomAmount), 0.2, 3.5);

  const rect = viewport.getBoundingClientRect();
  const cx = event.clientX - rect.left;
  const cy = event.clientY - rect.top;
  const worldX = (cx - state.transform.x) / state.transform.scale;
  const worldY = (cy - state.transform.y) / state.transform.scale;

  state.transform.scale = nextScale;
  state.transform.x = cx - worldX * nextScale;
  state.transform.y = cy - worldY * nextScale;
  applyTransform();
}

function applyTransform() {
  board.style.transform = `translate(${state.transform.x}px, ${state.transform.y}px) scale(${state.transform.scale})`;
}

function render() {
  const sorted = [...state.videos].sort((a, b) => a.color.h - b.color.h);
  board.innerHTML = "";

  sorted.forEach((video, index) => {
    const position = positionByIndex(index);
    const tile = tileTemplate.content.firstElementChild.cloneNode(true);
    tile.style.left = `${position.x}px`;
    tile.style.top = `${position.y}px`;
    tile.style.borderColor = `hsla(${Math.round(video.color.h * 360)}, 75%, 66%, 0.8)`;

    const link = tile.querySelector(".tile-link");
    const thumb = tile.querySelector(".thumb");
    link.href = video.url;
    thumb.src = video.thumb;
    thumb.alt = `YouTube thumbnail ${video.id}`;
    thumb.referrerPolicy = "no-referrer";
    thumb.onerror = () => {
      thumb.onerror = null;
      thumb.src = video.fallback;
    };

    board.appendChild(tile);
  });

  tileCount.textContent = `${sorted.length} video${sorted.length === 1 ? "" : "s"}`;
  applyTransform();
}

function positionByIndex(index) {
  const col = index % gridColumns;
  const row = Math.floor(index / gridColumns);
  const pitchX = tileSize.w + gap;
  const pitchY = tileSize.h + gap;

  return {
    x: col * pitchX,
    y: row * pitchY,
  };
}

function parseYouTubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return normalizeId(parsed.pathname.slice(1));
    }
    if (parsed.pathname === "/watch") {
      return normalizeId(parsed.searchParams.get("v"));
    }
    if (parsed.pathname.startsWith("/shorts/")) {
      return normalizeId(parsed.pathname.split("/")[2]);
    }
    if (parsed.pathname.startsWith("/embed/")) {
      return normalizeId(parsed.pathname.split("/")[2]);
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeId(value) {
  if (!value) return null;
  const clean = value.trim();
  return /^[\w-]{11}$/.test(clean) ? clean : null;
}

function getDominantColor(image) {
  const sampleSize = 36;
  const canvas = document.createElement("canvas");
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, sampleSize, sampleSize);

  const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 40) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count += 1;
  }

  if (!count) return { h: 0, s: 0.05, l: 0.45 };
  const avg = { r: r / count, g: g / count, b: b / count };
  return rgbToHsl(avg.r, avg.g, avg.b);
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const light = (max + min) / 2;

  let hue = 0;
  let sat = 0;
  const d = max - min;
  if (d !== 0) {
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        hue = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        hue = (bn - rn) / d + 2;
        break;
      default:
        hue = (rn - gn) / d + 4;
        break;
    }
    hue /= 6;
  }

  return { h: hue, s: sat, l: light };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function loadVideos() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter((item) => typeof item?.id === "string" && item?.color);
    return valid;
  } catch {
    return [];
  }
}

function saveVideos(videos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
}

function takeToRandomVideo() {
  if (!state.videos.length) {
    alert("No videos on the wall yet.");
    return;
  }
  const randomIndex = Math.floor(Math.random() * state.videos.length);
  const video = state.videos[randomIndex];
  window.open(video.url, "_blank", "noopener,noreferrer");
}

function takeToEmptySpace() {
  const metrics = getGridMetrics(state.videos.length);
  const viewportRect = viewport.getBoundingClientRect();
  const targetWorldX = metrics.width + (tileSize.w + gap) * 6;
  const targetWorldY = metrics.height + (tileSize.h + gap) * 4;
  state.transform.x = viewportRect.width * 0.5 - targetWorldX * state.transform.scale;
  state.transform.y = viewportRect.height * 0.5 - targetWorldY * state.transform.scale;
  applyTransform();
}

function getGridMetrics(count) {
  if (count <= 0) {
    return { width: 0, height: 0 };
  }
  const rows = Math.ceil(count / gridColumns);
  return {
    width: gridColumns * (tileSize.w + gap) - gap,
    height: rows * (tileSize.h + gap) - gap,
  };
}

function centerCameraOnVideos() {
  const viewportRect = viewport.getBoundingClientRect();
  const metrics = getGridMetrics(state.videos.length);
  const minFocusWidth = tileSize.w * 4;
  const minFocusHeight = tileSize.h * 3;
  const focusWidth = Math.max(metrics.width, minFocusWidth);
  const focusHeight = Math.max(metrics.height, minFocusHeight);
  const targetCenterX = focusWidth * 0.5;
  const targetCenterY = focusHeight * 0.5;

  state.transform.x = viewportRect.width * 0.5 - targetCenterX * state.transform.scale;
  state.transform.y = viewportRect.height * 0.5 - targetCenterY * state.transform.scale;
  applyTransform();
}
