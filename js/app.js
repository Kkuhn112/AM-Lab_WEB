/* =====================================================================
   Lynx AM Lab display — app logic
   ===================================================================== */
(function () {
  "use strict";

  const C = window.LAB_CONFIG;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const params = new URLSearchParams(location.search);
  const root = document.documentElement;
  const TZ = C.hours.timezone || "America/Denver";

  /* ---------------- Mode ----------------
     ?mode=kiosk | web     ?orient=portrait | landscape  (else auto)   */
  const mode = params.get("mode");
  const orient = params.get("orient");
  if (mode === "kiosk") {
    root.classList.add("kiosk");
    if (C.kiosk?.hideCursor !== false) root.classList.add("hide-cursor");
  }
  function applyMode() {
    const wide = innerWidth >= 1100 && innerWidth / innerHeight >= 1.25;
    const tall = innerHeight / innerWidth >= 1.4 && (mode === "kiosk" || innerWidth >= 900);
    const portrait = mode !== "web" && orient !== "landscape" && (orient === "portrait" || tall);
    root.classList.toggle("portrait", portrait);
    root.classList.toggle("split", mode !== "web" && (portrait || mode === "kiosk" || wide));
  }
  applyMode();
  addEventListener("resize", applyMode);

  /* ---------------- Identity ---------------- */
  const L = C.lab;
  const logo = $("labLogo");
  if (L.logo) logo.src = L.logo; else logo.remove();
  const uni = $("uniLogo");
  if (L.universityLogo) uni.src = L.universityLogo; else uni.remove();
  $("labMeta").innerHTML = [esc(L.location),
    L.email ? `<a href="mailto:${esc(L.email)}">${esc(L.email)}</a>` : ""].filter(Boolean).join(" &nbsp;·&nbsp; ");

  /* ---------------- Time (always in the lab's timezone) ---------------- */
  const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const toMin = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };

  function labNow() {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    const y = +p.year, m = +p.month, d = +p.day;
    return { y, m, d, mins: +p.hour * 60 + +p.minute, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
  }
  // Hours for one calendar day. Google Calendar data (data/schedule.js)
  // wins for dates it covers; otherwise fall back to config.js `weekly`.
  function dayInfo(now, offset) {
    const dt = new Date(Date.UTC(now.y, now.m - 1, now.d + offset));
    const iso = dt.toISOString().slice(0, 10);
    const dow = dt.getUTCDay();
    const S = window.LAB_SCHEDULE;
    let ex = null, raw;
    if (S && S.days && iso >= S.from && iso <= S.to) {
      const d = S.days[iso] || {};
      if (d.closed) ex = { label: d.closed === true ? "" : d.closed };
      raw = d.closed ? [] : (d.open || []);
    } else {
      ex = (C.hours.exceptions || []).find((e) => e.date === iso) || null;
      raw = (ex ? ex.hours : C.hours.weekly[DAYS[dow]]) || [];
    }
    return { iso, dow, date: dt.getUTCDate(), month: dt.getUTCMonth(), ex, ranges: raw.map(([a, b]) => [toMin(a), toMin(b)]) };
  }

  // Re-read data/schedule.js every few minutes so calendar edits show up
  // without a page reload. A <script> tag works over file:// too.
  function refreshSchedule() {
    const tag = document.createElement("script");
    tag.src = "data/schedule.js?t=" + Date.now();
    tag.onload = () => { tag.remove(); renderHours(); };
    tag.onerror = () => tag.remove();
    document.head.appendChild(tag);
  }
  function fmt(mins, withPeriod = true) {
    let h = Math.floor(mins / 60) % 24; const m = mins % 60;
    const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, "0")}${withPeriod ? " " + ap : ""}`;
  }

  /* ---------------- Clock ---------------- */
  function tickClock() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).formatToParts(now);
    const hm = parts.filter((x) => x.type !== "dayPeriod" && x.type !== "literal" || x.value === ":").map((x) => x.value).join("");
    const ap = (parts.find((x) => x.type === "dayPeriod") || {}).value || "";
    $("clockTime").innerHTML = `${esc(hm)}<small>${esc(ap)}</small>`;
    $("clockDate").textContent = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" }).format(now);
  }

  /* ---------------- Hours ---------------- */
  function renderHours() {
    const now = labNow();
    const today = dayInfo(now, 0);

    // Status line
    const cur = today.ranges.find(([a, b]) => now.mins >= a && now.mins < b);
    $("status").innerHTML = cur
      ? `<b>Open now</b> until ${fmt(cur[1])}`
      : `<b>Closed</b>${nextOpening(now) ? " · opens " + nextOpening(now) : ""}`;

    // This week (Mon–Sun). Configured days always show; others only if they have hours.
    const mondayOffset = -((now.dow + 6) % 7);
    const base = C.hours.days || ["mon", "tue", "wed", "thu", "fri"];
    const week = [1, 2, 3, 4, 5, 6, 0].map((idx, k) => ({ idx, off: mondayOffset + k, di: dayInfo(now, mondayOffset + k) }))
      .filter(({ idx, di }) => base.includes(DAYS[idx]) || di.ranges.length);

    // Visible span: config grid, widened to whole hours if an event falls outside it.
    let g0 = toMin(C.hours.gridStart || "09:00"), g1 = toMin(C.hours.gridEnd || "17:00");
    week.forEach(({ di }) => di.ranges.forEach(([a, b]) => {
      g0 = Math.min(g0, Math.floor(a / 60) * 60); g1 = Math.max(g1, Math.ceil(b / 60) * 60);
    }));
    const span = g1 - g0, rows = Math.round(span / 60);
    const pct = (m) => ((Math.min(Math.max(m, g0), g1) - g0) / span) * 100;

    let head = `<div></div>`, axis = "", cols = "";
    for (let h = 0; h < rows; h++) {
      const m = g0 + h * 60;
      axis += `<span style="top:${pct(m)}%">${fmt(m, false).replace(":00", "")}${h === 0 || m === 720 ? (m < 720 ? " am" : " pm") : ""}</span>`;
    }
    const closures = [];
    week.forEach(({ idx, off, di }) => {
      const isToday = off === 0;
      head += `<div class="tt-day${isToday ? " today" : ""}">${DAY_NAMES[idx].slice(0, 3)}<span>${di.date}</span></div>`;
      let blocks = di.ranges.map(([a, b]) => {
        const past = off < 0 || (isToday && now.mins >= b);
        return `<div class="tt-block${past ? " past" : ""}" style="top:${pct(a)}%;height:${pct(b) - pct(a)}%">${fmt(a, false)}–${fmt(b, false)}</div>`;
      }).join("");
      if (di.ex && !di.ranges.length) {
        blocks += `<div class="tt-closed">Closed</div>`;
        closures.push(`${DAY_NAMES[idx]} ${di.month + 1}/${di.date}${di.ex.label ? ": " + esc(di.ex.label) : ""}`);
      }
      if (isToday && now.mins >= g0 && now.mins <= g1) blocks += `<div class="tt-now" style="top:${pct(now.mins)}%"></div>`;
      cols += `<div class="tt-col${isToday ? " today" : ""}">${blocks}</div>`;
    });
    const tt = $("timetable");
    tt.style.setProperty("--cols", week.length);
    tt.style.setProperty("--rows", rows);
    tt.innerHTML = head + `<div class="tt-axis">${axis}</div>` + cols;
    $("closures").innerHTML = closures.length ? "Closed " + closures.join(" · ") : "";
  }
  function nextOpening(now) {
    for (let i = 0; i < 42; i++) {
      const di = dayInfo(now, i);
      const r = di.ranges.find(([a]) => i > 0 || a > now.mins);
      if (r) return `${i === 0 ? "today" : i === 1 ? "tomorrow" : DAY_NAMES[di.dow]} at ${fmt(r[0])}`;
    }
    return "";
  }

  /* ---------------- Print request QR ---------------- */
  function renderQR() {
    const f = C.printForm;
    $("qrHeading").textContent = f.heading;
    $("qrBlurb").textContent = f.blurb || "";
    const u = $("qrUrl");
    u.href = f.url; u.textContent = f.displayUrl || f.url.replace(/^https?:\/\//, "");
    $("qrLink").href = f.url;
    const box = $("qrBox");
    if (f.qrImage) { box.innerHTML = `<img src="${esc(f.qrImage)}" alt="">`; return; }
    if (typeof qrcode !== "function") return;
    const qr = qrcode(0, "M"); qr.addData(f.url); qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c},${r}h1v1h-1z`;
    box.innerHTML = `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR code"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#0e0e0f"/></svg>`;
  }

  /* ---------------- Printers ---------------- */
  function renderPrinters() {
    const list = C.printers || [];
    const grid = $("printerGrid");
    grid.style.setProperty("--n", list.length);
    grid.innerHTML = list.map((p) => `
      <article class="printer">
        <div class="printer-photo${p.image ? "" : " empty"}">
          ${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.remove();this.parentNode&&this.parentNode.classList.add('empty')">` : ""}
          ${p.count > 1 ? `<span class="count"><small>×</small>${p.count}</span>` : ""}
        </div>
        <div class="printer-text">
          <h3 class="printer-name">${esc(p.name)}</h3>
          <p class="printer-spec">${esc(p.buildVolume)}</p>
          <p class="printer-note">${esc(p.note)}</p>
        </div>
      </article>`).join("");
    // Landscape kiosk: an odd count ≥ 3 → first printer gets a tall feature tile,
    // the rest fill a 2-row grid beside it (5 printers = 1 large + 2×2).
    const feature = list.length >= 3 && list.length % 2 === 1;
    grid.classList.toggle("feature", feature);
    grid.style.setProperty("--fc", 1 + (list.length - 1) / 2);
  }

  /* ---------------- Playlist (media/playlist.js) ----------------
     Turns a simple { file, title, caption, seconds, fit, orbit } line into
     the player's internal shape. Type comes from the file extension.     */
  function normalize(e) {
    if (!e || e.skip) return null;
    if (e.type && e.src) return e;                       // legacy config.js format
    const f = String(e.file || "").trim();
    if (!f) return null;
    const base = { title: e.title, caption: e.caption, duration: e.seconds, fit: e.fit || "contain" };
    if (f === "builtin:hotend") return { ...base, type: "exploded-demo" };
    const yt = f.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (yt) return { ...base, type: "youtube", id: yt[1], duration: e.seconds || 30 };
    const src = /^(https?:)?\/\/|^\//.test(f) ? f : "media/" + f;
    const ext = (f.split("?")[0].split(".").pop() || "").toLowerCase();
    const type = { mp4: "video", webm: "video", mov: "video", m4v: "video",
      jpg: "image", jpeg: "image", png: "image", webp: "image", gif: "image", avif: "image",
      glb: "model", gltf: "model", html: "iframe", htm: "iframe" }[ext];
    if (!type) { console.warn("[AM Lab] unknown file type in playlist:", f); return null; }
    const out = { ...base, type, src };
    if (type === "image" && !out.duration) out.duration = 10;
    if (type === "iframe" && !out.duration) out.duration = 15;
    if (type === "model") { out.cameraOrbit = e.orbit; out.autoRotate = e.rotate !== false; out.animation = e.animation; }
    return out;
  }

  /* ---------------- Media player ---------------- */
  const Player = (() => {
    const slidesEl = $("slides"), cap = $("stageCaption"), bar = $("stageProgress");
    const items = (window.LAB_PLAYLIST || C.media || []).map(normalize).filter(Boolean);
    let i = -1, current = null, timer = null, failures = 0;

    function setCaption(it) {
      cap.classList.add("out");
      setTimeout(() => {
        $("stageTitle").textContent = it.title || "";
        $("stageText").textContent = it.caption || "";
        cap.hidden = !(it.title || it.caption);
        cap.classList.remove("out");
      }, 300);
    }
    function progress(seconds) {
      bar.style.transition = "none"; bar.style.width = "0"; void bar.offsetWidth;
      if (seconds) { bar.style.transition = `width ${seconds}s linear`; bar.style.width = "100%"; }
    }

    function create(it, ready, fail) {
      const s = document.createElement("div");
      s.className = "slide" + (it.title || it.caption ? " has-caption" : "") + (it.fit === "cover" ? " fit-cover" : "");
      let api = { destroy() {} };
      switch (it.type) {
        case "exploded-demo":
          api = window.ExplodedDemo.mount(s, it.options || {}); ready(); break;
        case "model": {
          if (!customElements.get("model-viewer")) { fail(); break; }
          const mv = document.createElement("model-viewer");
          const attrs = {
            src: it.src, autoplay: "", "environment-image": it.environment || "neutral",
            "shadow-intensity": it.shadow ?? "1", exposure: it.exposure ?? "1",
            "interaction-prompt": "none", loading: "eager"
          };
          if (it.autoRotate !== false) Object.assign(attrs, { "auto-rotate": "", "auto-rotate-delay": "0", "rotation-per-second": it.rotationSpeed || "14deg" });
          if (it.cameraOrbit) attrs["camera-orbit"] = it.cameraOrbit;
          if (it.animation) attrs["animation-name"] = it.animation;
          if (!root.classList.contains("kiosk")) attrs["camera-controls"] = "";
          for (const [k, v] of Object.entries(attrs)) mv.setAttribute(k, v);
          mv.addEventListener("load", () => ready(), { once: true });
          mv.addEventListener("error", fail, { once: true });
          s.appendChild(mv); break;
        }
        case "video": {
          const v = document.createElement("video");
          v.muted = true; v.playsInline = true; v.preload = "auto";
          v.loop = items.length === 1 || !!it.duration;
          v.src = it.src;
          v.addEventListener("canplay", () => { v.play().catch(() => {}); ready(v.duration); }, { once: true });
          v.addEventListener("error", fail, { once: true });
          if (!it.duration) v.addEventListener("ended", () => next());
          s.appendChild(v); break;
        }
        case "image": {
          const im = new Image();
          im.onload = () => ready(); im.onerror = fail;
          im.alt = it.title || ""; im.src = it.src;
          s.appendChild(im); break;
        }
        case "youtube": {
          const f = document.createElement("iframe");
          f.src = `https://www.youtube-nocookie.com/embed/${it.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${it.id}&playsinline=1&rel=0&modestbranding=1`;
          f.allow = "autoplay; encrypted-media"; f.title = it.title || "video";
          f.onload = () => ready();
          s.appendChild(f); break;
        }
        case "iframe": {
          const f = document.createElement("iframe");
          f.src = it.src; f.title = it.title || "animation";
          f.onload = () => ready();
          s.appendChild(f); break;
        }
        default: fail(); return null;
      }
      slidesEl.appendChild(s);
      return { el: s, api };
    }

    function show(n) {
      clearTimeout(timer);
      if (!items.length) return;
      i = (n + items.length) % items.length;
      const it = items[i];
      let done = false, built = null;
      // create() may call ready() synchronously, before `built` exists — defer.
      const ready = (secs) => queueMicrotask(() => onReady(secs));
      const fail = () => queueMicrotask(onFail);
      function onReady(mediaSeconds) {
        if (done) return; done = true; failures = 0;
        const prev = current; current = built;
        requestAnimationFrame(() => built.el.classList.add("active"));
        if (prev) {
          prev.el.classList.remove("active");
          setTimeout(() => { prev.api.destroy(); prev.el.remove(); }, 1100); // free GPU memory
        }
        setCaption(it);
        const secs = it.duration || (it.type === "video" && isFinite(mediaSeconds) ? mediaSeconds : 12);
        progress(items.length > 1 ? secs : 0);
        if (items.length > 1 && !(it.type === "video" && !it.duration)) timer = setTimeout(next, secs * 1000);
      }
      function onFail() {
        if (done) return; done = true;
        console.warn("[AM Lab] skipping media item:", it.src || it.type);
        if (built) { built.api.destroy(); built.el.remove(); }
        if (++failures >= items.length) return;
        timer = setTimeout(() => show(i + 1), 50);
      }
      built = create(it, ready, fail);
      setTimeout(() => { if (!done) fail(); }, (it.loadTimeout || 30) * 1000);
    }
    const next = () => show(i + 1);
    addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") show(i - 1);
    });
    return { start: () => show(0) };
  })();

  /* ---------------- Boot ---------------- */
  tickClock(); renderHours(); renderQR(); renderPrinters();
  setInterval(tickClock, 1000);
  setInterval(renderHours, 30 * 1000);
  setInterval(refreshSchedule, 5 * 60 * 1000);
  requestAnimationFrame(() => Player.start());

  if (root.classList.contains("kiosk") && C.kiosk?.reloadMinutes > 0) {
    setTimeout(() => location.reload(), C.kiosk.reloadMinutes * 60 * 1000);
  }
})();
