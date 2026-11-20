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
    if (C.kiosk?.hideCursor !== false && params.get("cursor") !== "show") root.classList.add("hide-cursor");
  }
  // TV mode draws an exact 16:9 (or 9:16) screen, scaled to fit the window
  // with black bars if the window has a different shape. On the real TV the
  // shapes match and it fills edge to edge; in a test window or VM it is a
  // faithful scaled-down preview instead of a squeezed layout.
  function applyMode() {
    const W = innerWidth, H = innerHeight;
    let split, portrait;
    if (mode === "web") {
      split = portrait = false;
    } else if (mode === "kiosk") {
      split = true;
      portrait = orient ? orient === "portrait" : H > W;
    } else {                                   // public website: auto
      portrait = orient === "portrait" || (orient !== "landscape" && H / W >= 1.4 && W >= 900);
      split = portrait || orient === "landscape" || (W >= 1100 && W / H >= 1.25);
    }
    root.classList.toggle("portrait", portrait);
    root.classList.toggle("split", split);

    let bw = W, bh = H;
    if (split) {
      const target = portrait ? 9 / 16 : 16 / 9;
      const off = Math.abs(W / H / target - 1);
      if (off > (mode === "kiosk" ? 0.02 : 0.15)) {
        if (W / H > target) { bh = H; bw = H * target; } else { bw = W; bh = W / target; }
      }
    }
    const boxed = split && (Math.round(bw) < W || Math.round(bh) < H);
    root.classList.toggle("boxed", boxed);
    root.style.setProperty("--boxw", bw + "px");
    root.style.setProperty("--boxh", bh + "px");
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

    // Rolling week: the next five weekdays starting today (Mon–Fri by default,
    // from hours.days). As each day passes it drops off the left and the same
    // weekday of next week appears on the right — on Wednesday the columns are
    // Wed Thu Fri | Mon Tue. On a weekend it starts at Monday.
    const base = C.hours.days || ["mon", "tue", "wed", "thu", "fri"];
    const week = [];
    for (let off = 0; week.length < base.length && off < 14; off++) {
      const di = dayInfo(now, off);
      if (base.includes(DAYS[di.dow])) week.push({ idx: di.dow, off, di });
    }
    const monFirst = (d) => (d + 6) % 7;          // Mon = 0 … Sun = 6
    week.forEach((w, k) => { w.newWeek = k > 0 && monFirst(w.idx) <= monFirst(week[k - 1].idx); });

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
    week.forEach(({ idx, off, di, newWeek }) => {
      const isToday = off === 0;
      const closed = !di.ranges.length;            // no hours that day = closed
      const cls = (isToday ? " today" : "") + (newWeek ? " wk-start" : "") + (closed ? " closed" : "");
      head += `<div class="tt-day${cls}">${DAY_NAMES[idx].slice(0, 3)}<span>${di.date}</span></div>`;
      let blocks = di.ranges.map(([a, b]) => {
        const past = off < 0 || (isToday && now.mins >= b);
        return `<div class="tt-block${past ? " past" : ""}" style="top:${pct(a)}%;height:${pct(b) - pct(a)}%">${fmt(a, false)}–${fmt(b, false)}</div>`;
      }).join("");
      if (closed) {
        blocks += `<div class="tt-closed">Closed</div>`;
        if (di.ex && di.ex.label) closures.push(`${DAY_NAMES[idx]} ${di.month + 1}/${di.date}: ${esc(di.ex.label)}`);
      }
      if (isToday && now.mins >= g0 && now.mins <= g1) blocks += `<div class="tt-now" style="top:${pct(now.mins)}%"></div>`;
      cols += `<div class="tt-col${cls}">${blocks}</div>`;
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
    u.href = f.url; u.textContent = f.displayUrl || f.url.replace(/^https?:\/\//, ""); u.hidden = false;
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

  // A QR image kept on the machine (~/AM-Lab-QR, served at local-qr/) wins
  // over the generated one; link.txt there sets the address shown under it.
  // Re-checked every minute; on GitHub Pages / file:// there's none → no change.
  let localQR = "";
  async function checkLocalQR() {
    let idx = null;
    try {
      const r = await fetch("local-qr/index.json", { cache: "no-store" });
      if (r.ok) idx = await r.json();
    } catch (e) { /* no local server */ }
    const key = idx && idx.image ? JSON.stringify(idx) : "";
    if (key === localQR) return;
    localQR = key;
    if (!key) { renderQR(); return; }                  // image removed → generated QR again
    const link = (idx.link || "").trim();
    const href = /^https?:\/\//i.test(link) ? link : (link ? "https://" + link : "");
    $("qrBox").innerHTML = `<img src="local-qr/${encodeURIComponent(idx.image.name)}?v=${idx.image.mtime}" alt="QR code for the print request form">`;
    const u = $("qrUrl");
    u.textContent = link.replace(/^https?:\/\//i, "");
    u.hidden = !link;
    if (href) { u.href = href; $("qrLink").href = href; }
    else { u.removeAttribute("href"); $("qrLink").removeAttribute("href"); }
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

  const DISPLAY = C.display || {};
  const SLIDE_SECONDS = DISPLAY.slideSeconds ?? 10;
  const FADE = DISPLAY.fadeSeconds ?? 1.2;
  root.style.setProperty("--fade", FADE + "s");

  /* ---------------- Playlist ----------------
     Where the top panel's media comes from, first match wins:
       1. ~/AM-Lab-Media/playlist.js on the machine   (full control)
       2. ~/AM-Lab-Media/* files, played in name order (just drop files in)
       3. media/playlist.js in the repo                (default / public site)
     The local folder is served by run-local.py at local-media/ — on GitHub
     Pages or file:// it simply isn't there and (3) is used.

     normalize() turns a { file, title, caption, seconds, fit, orbit } line
     into the player's internal shape. Type comes from the file extension. */
  function normalize(e, prefix = "media/") {
    if (!e || e.skip) return null;
    if (e.type && e.src) return e;                       // legacy config.js format
    const f = String(e.file || "").trim();
    if (!f) return null;
    // fit: "cover" (default) zooms to fill the panel, centred, cropping the overflow;
    //      "contain" shows the whole frame with background around it.
    const base = { title: e.title, caption: e.caption, duration: e.seconds, fit: e.fit === "contain" ? "contain" : "cover" };
    const vidDefault = typeof DISPLAY.videoSeconds === "number" ? DISPLAY.videoSeconds : undefined;
    if (f === "builtin:hotend") return { ...base, type: "exploded-demo", duration: e.seconds ?? SLIDE_SECONDS };
    const yt = f.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (yt) return { ...base, type: "youtube", id: yt[1], duration: e.seconds ?? vidDefault ?? 30 };
    const src = /^(https?:)?\/\/|^\//.test(f) ? f : prefix + f.split("/").map(encodeURIComponent).join("/");
    const ext = (f.split("?")[0].split(".").pop() || "").toLowerCase();
    const type = { mp4: "video", webm: "video", mov: "video", m4v: "video",
      jpg: "image", jpeg: "image", jfif: "image", png: "image", webp: "image", gif: "image", avif: "image", bmp: "image",
      glb: "model", gltf: "model", html: "iframe", htm: "iframe" }[ext];
    if (!type) { console.warn("[AM Lab] unknown file type in playlist:", f); return null; }
    const out = { ...base, type, src };
    // Photos/models/animations: config display.slideSeconds (10). Videos: their own
    // length ("full") unless display.videoSeconds or the line's `seconds` says otherwise.
    if (type === "video") out.duration = e.seconds ?? vidDefault;
    else out.duration = e.seconds ?? SLIDE_SECONDS;
    if (type === "model") { out.cameraOrbit = e.orbit; out.autoRotate = e.rotate !== false; out.animation = e.animation; }
    return out;
  }

  const REPO_PLAYLIST = window.LAB_PLAYLIST || C.media || [];
  const LOCAL = "local-media/";

  // Optional "<same name>.txt" next to a file: first line = title, rest = caption.
  // No .txt → no title (the filename is only used for ordering).
  const textParts = (t) => {
    const lines = String(t || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return { title: lines[0] || "", caption: lines.slice(1).join(" ") };
  };

  function loadScript(src) {
    return new Promise((ok, bad) => {
      const t = document.createElement("script");
      t.src = src; t.onload = () => { t.remove(); ok(); }; t.onerror = () => { t.remove(); bad(); };
      document.head.appendChild(t);
    });
  }

  async function loadPlaylist() {
    try {
      const r = await fetch(LOCAL + "index.json", { cache: "no-store" });
      if (r.ok) {
        const idx = await r.json();
        // ?v=<modified time> on each local file: a file replaced under the same
        // name gets a new URL, so the player notices and plays the new one.
        const mtime = Object.fromEntries((idx.files || []).map((f) => [f.name, f.mtime]));
        const stamp = (it) => {
          if (it && it.src && it.src.startsWith(LOCAL)) {
            const name = decodeURIComponent(it.src.slice(LOCAL.length));
            if (mtime[name]) it.src += "?v=" + mtime[name];
          }
          return it;
        };
        if (idx.playlist) {                        // local playlist.js (same format as the repo one)
          const saved = window.LAB_PLAYLIST;
          window.LAB_PLAYLIST = undefined;
          try { await loadScript(LOCAL + "playlist.js?t=" + Date.now()); } catch (e) { /* fall through */ }
          const list = window.LAB_PLAYLIST;
          window.LAB_PLAYLIST = saved;
          if (Array.isArray(list)) {
            const items = list.map((e) => stamp(normalize(e, LOCAL))).filter(Boolean);
            if (items.length) return items;
          }
          console.warn("[AM Lab] local playlist.js is empty or has an error — using the files in the folder");
        }
        const files = (idx.files || []).slice()
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
        const items = files.map((f) => stamp(normalize({ file: f.name, ...textParts(f.caption) }, LOCAL))).filter(Boolean);
        if (items.length) return items;
      }
    } catch (e) { /* no local server (GitHub Pages, file://) */ }
    return REPO_PLAYLIST.map((e) => normalize(e)).filter(Boolean);
  }
  const signature = (items) => JSON.stringify(items.map((x) => [x.src || x.type, x.title, x.caption, x.duration]));

  /* ---------------- Media player ---------------- */
  const Player = (() => {
    const slidesEl = $("slides"), cap = $("stageCaption"), bar = $("stageProgress");
    let items = [];
    let i = -1, current = null, timer = null, failures = 0, gen = 0;

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
      s.className = "slide" + (it.title || it.caption ? " has-caption" : "") + (it.fit === "contain" ? " fit-contain" : "");
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
          if (!it.duration) {
            // Full-length video: start the crossfade just before the last frame, so
            // it's still playing while the next slide fades in (no frozen frame).
            let advanced = false;
            const go = () => { if (!advanced && current && current.el === s) { advanced = true; next(); } };
            v.addEventListener("timeupdate", () => {
              if (items.length > 1 && v.duration && v.currentTime >= v.duration - FADE) go();
            });
            v.addEventListener("ended", go);
          }
          s.appendChild(v); break;
        }
        case "image": {
          const im = new Image();
          // decode before fading in, so big photos don't stutter mid-fade
          im.onload = () => (im.decode ? im.decode() : Promise.resolve()).then(() => ready(), () => ready());
          im.onerror = fail;
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
      const my = ++gen;                 // a slide that finishes loading after we've moved on is dropped
      let done = false, built = null;
      // create() may call ready() synchronously, before `built` exists — defer.
      const ready = (secs) => queueMicrotask(() => onReady(secs));
      const fail = () => queueMicrotask(onFail);
      function onReady(mediaSeconds) {
        if (done) return; done = true;
        if (my !== gen) { built.api.destroy(); built.el.remove(); return; }
        failures = 0;
        const prev = current; current = built;
        // Crossfade: the new slide fades in on top; the old one stays visible
        // underneath, then fades out during the second half (no dip to dark).
        requestAnimationFrame(() => requestAnimationFrame(() => built.el.classList.add("active")));
        if (prev) {
          prev.el.classList.add("leaving");
          prev.el.classList.remove("active");
          setTimeout(() => { prev.api.destroy(); prev.el.remove(); }, FADE * 1000 + 200); // free GPU memory
        }
        setCaption(it);
        const secs = it.duration || (it.type === "video" && isFinite(mediaSeconds) ? mediaSeconds : SLIDE_SECONDS);
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
    // Check the media folder every 2 min; if anything changed, start the new list.
    async function refresh() {
      const fresh = await loadPlaylist();
      if (signature(fresh) === signature(items)) return;
      items = fresh; failures = 0;
      show(0);
    }
    return {
      start: async () => { items = await loadPlaylist(); show(0); setInterval(refresh, 2 * 60 * 1000); }
    };
  })();

  /* ---------------- Boot ---------------- */
  tickClock(); renderHours(); renderQR(); renderPrinters(); checkLocalQR();
  setInterval(checkLocalQR, 60 * 1000);
  setInterval(tickClock, 1000);
  setInterval(renderHours, 30 * 1000);
  setInterval(refreshSchedule, 60 * 1000);   // cheap local file; the server re-reads the calendar every 5 min
  requestAnimationFrame(() => Player.start());

  if (root.classList.contains("kiosk") && C.kiosk?.reloadMinutes > 0) {
    setTimeout(() => location.reload(), C.kiosk.reloadMinutes * 60 * 1000);
  }
})();
