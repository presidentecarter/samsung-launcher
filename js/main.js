/**
 * samsung-launcher — key handling, tile navigation, app launching.
 *
 * Keyboard on a dev TV: sdb shell key events land here too, so debugging
 * over sdb works with real key codes.
 */

/* ---------- clock ---------- */
function tick() {
    const el = document.getElementById("clock");
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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

/* ---------- tiles ---------- */
const tilesEl = document.getElementById("tiles");
let focusIdx = 0;

function renderTiles() {
    tilesEl.innerHTML = "";
    CONFIG.tiles.forEach((t, i) => {
        const d = document.createElement("div");
        d.className = "tile";
        d.dataset.index = String(i);
        if (t.img) {
            const img = document.createElement("img");
            img.src = t.img;
            d.appendChild(img);
        } else {
            const s = document.createElement("span");
            s.className = "logo-text";
            s.textContent = t.text || t.name;
            d.appendChild(s);
        }
        if (t.shortcut && t.shortcut !== "0" && t.shortcut !== "9") {
            const k = document.createElement("span");
            k.className = "shortcut";
            k.textContent = t.shortcut;
            d.appendChild(k);
        }
        tilesEl.appendChild(d);
    });
    updateFocus();
}

function updateFocus() {
    const kids = tilesEl.children;
    for (let i = 0; i < kids.length; i++) kids[i].classList.toggle("focused", i === focusIdx);
}

tilesEl.addEventListener("click", (e) => {
    const t = e.target.closest(".tile");
    if (!t) return;
    focusIdx = parseInt(t.dataset.index, 10);
    updateFocus();
    activateTile();
});

/* ---------- launching ---------- */
function launchApp(appId) {
    toast("Opening…");
    try {
        animateLaunch(() => {
            tizen.application.launch(appId, () => {
                if (CONFIG.debugToasts) console.log("launched", appId);
            }, (err) => {
                console.error("launch failed", appId, err);
                toast("Couldn't launch that app — check its appId (press 9)");
            });
        });
    } catch (e) {
        console.error("launch threw", e);
        toast("tizen.application.launch unavailable");
    }
}

function openUrl(url) {
    // fallback path: fullscreen web view of the service
    toast("Opening " + url);
    window.open(url, "_self");
}

function openSettings() {
    try {
        tizen.systemsetting.show(() => {}, (err) => {
            console.error("settings failed", err);
            toast("Open settings with the ⭐ / settings key on the remote");
        });
    } catch (e) {
        toast("Open settings with the ⭐ / settings key on the remote");
    }
}

function activateTile() {
    const t = CONFIG.tiles[focusIdx];
    if (!t) return;
    if (t.appId) { launchApp(t.appId); return; }
    if (t.url)  { openUrl(t.url); return; }
    toast("No appId set for " + t.name + " — press 9 to find it");
}

/* ---------- appId debug overlay (key 9) ---------- */
const listEl = document.getElementById("appid-list");
const rowsEl = document.getElementById("appid-rows");
const overlayEl = document.getElementById("overlay");
const saversEl = document.getElementById("saver-img");
const saverClockEl = document.getElementById("saver-clock");
const launchingEl = document.getElementById("launching");

/* ---------- launching animation ---------- */
let launching = false;
function animateLaunch(fn) {
    launching = true;
    launchingEl.classList.remove("hidden");
    setTimeout(() => {
        fn();
        setTimeout(() => {
            launchingEl.classList.add("hidden");
            launching = false;
        }, CONFIG.launchAnimationMs);
    }, CONFIG.launchAnimationMs);
}

/* ---------- screensaver ---------- */
let saverImgs = [];
let saverIdx = 0;
let saverTimer = null;
let clockTimer = null;
let saverActive = false;

function loadSavers() {
    saverImgs = [];
    for (let i = 1; i <= 15; i++) {
        const src = "img/savers/saver-" + i + ".png";
        saverImgs.push(src); // missing files just skip: onerror advances
    }
}

function showNextSaver() {
    if (saverImgs.length === 0) return stopScreensaver();
    for (let tries = 0; tries < saverImgs.length; tries++) {
        const src = saverImgs[saverIdx % saverImgs.length];
        saverIdx++;
        saversEl.style.display = "block";
        saversEl.onerror = () => { saversEl.style.display = "none"; };
        saversEl.src = src;
        return;
    }
}

function clockTick() {
    saverClockEl.style.display = CONFIG.screensaver.showClock ? "block" : "none";
    saverClockEl.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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

/* idle detection */
let idleTimeout = null;
function resetIdle() {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(startScreensaver, CONFIG.screensaver.idleMinutes * 60000);
}


function showAppList() {
    rowsEl.textContent = "";
    let apps = [];
    try {
        const ctxs = tizen.application.getAppsContext();
        apps = ctxs.map(tizen.application.getAppInfo.bind(tizen.application));
    } catch (e) {
        rowsEl.textContent = "getAppsInfo unavailable: " + e.message;
    }
    const draw = (filter) => {
        rowsEl.innerHTML = "";
        apps.filter(a => !filter || a.name.toLowerCase().includes(filter) || a.id.toLowerCase().includes(filter))
            .forEach(a => {
                const p = document.createElement("div");
                p.innerHTML = "<b>" + a.name + "</b> — " + a.id;
                rowsEl.appendChild(p);
            });
    };
    const filterEl = document.getElementById("appid-filter");
    filterEl.value = "";
    draw("");
    filterEl.oninput = () => draw(filterEl.value.toLowerCase());
    listEl.classList.remove("hidden");
    filterEl.focus();
}

function hideAppList() { listEl.classList.add("hidden"); }

/* ---------- key handling ---------- */
window.addEventListener("keydown", (e) => {
    resetIdle();

    // screensaver: any key wakes the launcher (key is otherwise consumed)
    if (saverActive) {
        e.preventDefault();
        stopScreensaver();
        return;
    }

    // tv remote keys arrive with sensible keyCodes; also handle name-based events
    const k = e.keyName || e.key;
    const isNum = /^[0-9]$/.test(k);

    if (!listEl.classList.contains("hidden")) {
        if (k === "Backspace" || k === "Escape" || k === "XF86Exit" || e.keyCode === 10009) {
            e.preventDefault();
            hideAppList();
        }
        return; // filter input is active; let typing flow
    }

    if (isNum) {
        e.preventDefault();
        if (k === "0") { openSettings(); return; }
        if (k === "9") { showAppList(); return; }
        const idx = CONFIG.tiles.findIndex(t => t.shortcut === k);
        if (idx === -1) { toast("No app mapped to " + k); return; }
        focusIdx = idx;
        updateFocus();
        activateTile();
        return;
    }

    // navigation: arrows / samsung tv key codes
    const count = tilesEl.children.length;
    switch (e.keyCode || k) {
        case 37: case "ArrowLeft": case "Left":
            if (count > 0) { focusIdx = (focusIdx - 1 + count) % count; updateFocus(); } break;
        case 39: case "ArrowRight": case "Right":
            if (count > 0) { focusIdx = (focusIdx + 1) % count; updateFocus(); } break;
        case 40: case "ArrowDown": case "Down":
        case 38: case "ArrowUp": case "Up":
            if (count > 0) { focusIdx = (focusIdx + 3) % count; updateFocus(); } break;
        case 13: case "Enter": case "XF86OK":
            activateTile(); break;
    }
});

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
    renderTiles();
    loadSavers();
    resetIdle();
});
