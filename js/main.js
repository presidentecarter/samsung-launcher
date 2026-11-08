/**
 * samsung-launcher — themes, tiles, top-bar actions, navigation, screensaver.
 *
 * Arrow keys + OK only (no number pad needed). Up from the top tile row
 * reaches the top bar: App Store, Theme, Settings.
 */

/* ---------- clock ---------- */
function timeString() {
    return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function tick() {
    const el = document.getElementById("clock");
    if (el) el.textContent = timeString();
}
setInterval(tick, 10000);
tick();

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), 2600);
}

/* ---------- themes (Omarchy palettes, js/themes.js) ---------- */
const THEME_KEY = "launcher.theme";
const themeIds = typeof THEMES === "object" ? Object.keys(THEMES) : [];
let themeId = null;

const CSS_VARS = {
    bg: "--bg", tile: "--tile", tileFocus: "--tile-focus", text: "--text",
    textBright: "--text-bright", muted: "--muted", accent: "--accent",
    accentGlow: "--accent-glow", border: "--border", scrim: "--scrim",
};

function savedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
}

function applyTheme(id, announce) {
    const t = THEMES[id];
    if (!t) return false;
    themeId = id;
    const root = document.documentElement.style;
    Object.keys(CSS_VARS).forEach((k) => {
        if (t.palette[k]) root.setProperty(CSS_VARS[k], t.palette[k]);
    });
    const bd = document.getElementById("backdrop");
    const setBg = () => {
        bd.style.backgroundImage = t.home ? "url('" + t.home + "')" : "none";
        bd.classList.remove("fading");
    };
    if (announce && t.home) {
        // preload so the cross-fade doesn't flash an empty backdrop
        bd.classList.add("fading");
        const img = new Image();
        img.onload = img.onerror = () => setTimeout(setBg, 300);
        img.src = t.home;
    } else {
        setBg();
    }
    try { localStorage.setItem(THEME_KEY, id); } catch (e) { /* not persisted */ }
    loadSavers();
    if (announce) toast("Theme: " + t.name);
    return true;
}

function cycleTheme() {
    if (themeIds.length < 2) { toast("Only one theme — add more with tools/sync-themes.py"); return; }
    const i = themeIds.indexOf(themeId);
    applyTheme(themeIds[(i + 1) % themeIds.length], true);
}

function initTheme() {
    if (themeIds.length === 0) return;
    applyTheme(savedTheme(), false) || applyTheme(CONFIG.theme, false) || applyTheme(themeIds[0], false);
}

/* ---------- launching ---------- */
const launchingEl = document.getElementById("launching");

function animateLaunch(fn) {
    launchingEl.classList.remove("hidden");
    setTimeout(() => {
        fn();
        setTimeout(() => launchingEl.classList.add("hidden"), CONFIG.launchAnimationMs);
    }, CONFIG.launchAnimationMs);
}

/** launch the first appId in ids that the TV accepts */
function launchFirst(ids, failMsg) {
    const tryAt = (i) => {
        if (i >= ids.length) { toast(failMsg); return; }
        try {
            tizen.application.launch(ids[i], () => {}, (err) => {
                console.error("launch failed", ids[i], err);
                tryAt(i + 1);
            });
        } catch (e) {
            console.error("launch threw", ids[i], e);
            tryAt(i + 1);
        }
    };
    animateLaunch(() => tryAt(0));
}

function launchApp(appId, name) {
    launchFirst([appId], "Couldn't open " + (name || appId) + " — check its appId (tools/list-apps.sh)");
}

/* ---------- app icons ---------- */
/** the TV's own icon for an installed app, or null */
function tvIcon(appId) {
    try {
        const p = tizen.application.getAppInfo(appId).iconPath;
        return p ? "file://" + p : null;
    } catch (e) {
        return null;
    }
}

/* ---------- tiles ---------- */
const tilesEl = document.getElementById("tiles");

function renderTiles() {
    tilesEl.innerHTML = "";
    CONFIG.tiles.forEach((t, i) => {
        const d = document.createElement("div");
        d.className = "tile";
        d.dataset.index = String(i);

        const icon = t.img || (t.appId && tvIcon(t.appId));
        if (CONFIG.tileStyle === "logo" && t.logo) {
            // white-on-transparent logo used as a mask, filled with the accent
            const logo = document.createElement("div");
            logo.className = "logo";
            const url = "url('" + t.logo + "')";
            logo.style.webkitMaskImage = url;
            logo.style.maskImage = url;
            d.appendChild(logo);
        } else if (icon) {
            const img = document.createElement("img");
            img.className = "icon";
            img.src = icon;
            img.onerror = () => { img.remove(); d.classList.add("no-icon"); };
            d.appendChild(img);
        } else {
            d.classList.add("no-icon");
        }
        const label = document.createElement("span");
        label.className = "label";
        label.textContent = t.name;
        d.appendChild(label);

        d.addEventListener("click", () => { focusTile(i); activate(); });
        tilesEl.appendChild(d);
    });
}

/* ---------- top bar ---------- */
const barEls = Array.prototype.slice.call(document.querySelectorAll("#actions .action"));
const ACTIONS = {
    store: () => launchFirst([CONFIG.appStoreId], "Couldn't open the app store"),
    theme: cycleTheme,
    settings: () => launchFirst(CONFIG.settingsIds, "Use the settings button on the remote"),
};
barEls.forEach((el, i) => el.addEventListener("click", () => { focusBar(i); activate(); }));

/* ---------- focus & navigation ---------- */
let zone = "tiles";      // "tiles" | "bar"
let tileIdx = 0;
let barIdx = 0;

function render() {
    const kids = tilesEl.children;
    for (let i = 0; i < kids.length; i++) kids[i].classList.toggle("focused", zone === "tiles" && i === tileIdx);
    barEls.forEach((el, i) => el.classList.toggle("focused", zone === "bar" && i === barIdx));
}
function focusTile(i) { zone = "tiles"; tileIdx = i; render(); }
function focusBar(i) { zone = "bar"; barIdx = i; render(); }

/** tiles per row, measured from the laid-out grid */
function columns() {
    const kids = tilesEl.children;
    if (!kids.length) return 1;
    const top = kids[0].offsetTop;
    let n = 0;
    while (n < kids.length && kids[n].offsetTop === top) n++;
    return n;
}

function move(dir) {
    if (zone === "bar") {
        if (dir === "left")  barIdx = Math.max(0, barIdx - 1);
        if (dir === "right") barIdx = Math.min(barEls.length - 1, barIdx + 1);
        if (dir === "down" && tilesEl.children.length) zone = "tiles";
        render();
        return;
    }
    const count = tilesEl.children.length;
    if (!count) return;
    const cols = columns();
    switch (dir) {
        case "left":  tileIdx = (tileIdx - 1 + count) % count; break;
        case "right": tileIdx = (tileIdx + 1) % count; break;
        case "up":
            if (tileIdx < cols) { zone = "bar"; } else { tileIdx -= cols; }
            break;
        case "down":
            if (tileIdx + cols < count) tileIdx += cols;
            else if (Math.floor(tileIdx / cols) < Math.floor((count - 1) / cols)) tileIdx = count - 1;
            break;
    }
    render();
}

function activate() {
    if (zone === "bar") {
        const fn = ACTIONS[barEls[barIdx].dataset.action];
        if (fn) fn();
        return;
    }
    const t = CONFIG.tiles[tileIdx];
    if (!t) return;
    if (t.appId) launchApp(t.appId, t.name);
    else toast("No appId set for " + t.name);
}

/* ---------- screensaver ---------- */
const overlayEl = document.getElementById("overlay");
const saverImgEl = document.getElementById("saver-img");
const saverClockEl = document.getElementById("saver-clock");
let saverImgs = [];
let saverIdx = 0;
let saverTimer = null;
let clockTimer = null;
let saverActive = false;

function loadSavers() {
    const t = themeId && THEMES[themeId];
    saverImgs = t ? t.wallpapers.slice() : [];
    const shared = typeof SHARED_SAVERS !== "undefined" ? SHARED_SAVERS : [];
    if (CONFIG.screensaver.includeShared || saverImgs.length === 0) {
        saverImgs = saverImgs.concat(shared);
    }
    saverIdx = 0;
}

function showNextSaver() {
    if (saverImgs.length === 0) { stopScreensaver(); return; }
    saverImgEl.style.display = "block";
    saverImgEl.onerror = () => { saverImgEl.style.display = "none"; };
    saverImgEl.src = saverImgs[saverIdx % saverImgs.length];
    saverIdx++;
}

function clockTick() {
    saverClockEl.style.display = CONFIG.screensaver.showClock ? "block" : "none";
    saverClockEl.textContent = timeString();
}

function startScreensaver() {
    if (saverActive || CONFIG.screensaver.idleMinutes <= 0) return;
    saverActive = true;
    overlayEl.classList.remove("hidden");
    requestAnimationFrame(() => overlayEl.classList.add("active"));
    showNextSaver();
    saverTimer = setInterval(showNextSaver, CONFIG.screensaver.secondsPerImage * 1000);
    clockTick();
    clockTimer = setInterval(clockTick, 10000);
}

function stopScreensaver() {
    if (!saverActive) return;
    saverActive = false;
    overlayEl.classList.remove("active");
    clearInterval(saverTimer);
    clearInterval(clockTimer);
    setTimeout(() => overlayEl.classList.add("hidden"), 300);
}

let idleTimeout = null;
function resetIdle() {
    clearTimeout(idleTimeout);
    if (CONFIG.screensaver.idleMinutes > 0) {
        idleTimeout = setTimeout(startScreensaver, CONFIG.screensaver.idleMinutes * 60000);
    }
}

/* ---------- key handling ---------- */
const KEYS = {
    37: "left", 38: "up", 39: "right", 40: "down", 13: "ok",
    ArrowLeft: "left", ArrowUp: "up", ArrowRight: "right", ArrowDown: "down",
    Left: "left", Up: "up", Right: "right", Down: "down", Enter: "ok", XF86OK: "ok",
};

window.addEventListener("keydown", (e) => {
    resetIdle();

    // screensaver: any key wakes the launcher (key is otherwise consumed)
    if (saverActive) {
        e.preventDefault();
        stopScreensaver();
        return;
    }

    const action = KEYS[e.keyCode] || KEYS[e.key];
    if (!action) return;
    e.preventDefault();
    if (action === "ok") activate();
    else move(action);
});

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    if (!themeId) loadSavers();
    renderTiles();
    render();
    resetIdle();
});
