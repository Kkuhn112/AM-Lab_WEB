/* =====================================================================
   AM Lab display — app logic
   ===================================================================== */
(function () {
  "use strict";

  const C = window.LAB_CONFIG;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const params = new URLSearchParams(location.search);
  const TZ = (C.hours && C.hours.timezone) || "America/Denver";

  /* ---------------- Mode: split (kiosk) vs stacked (web) ---------------- */
  const forced = params.get("mode"); // "kiosk" | "web"
  const root = document.documentElement;
  if (forced === "kiosk") {
    root.classList.add("kiosk");
    if (C.kiosk?.hideCursor !== false) root.classList.add("hide-cursor");
  }
  // Orientation: auto-detected, or force with ?orient=portrait | landscape
  const orient = params.get("orient");
  function applyMode() {
    const wide = innerWidth >= 1100 && innerWidth / innerHeight >= 1.25;
    const tall = innerHeight / innerWidth >= 1.4 && (forced === "kiosk" || innerWidth >= 900);
    const portrait = forced !== "web" && orient !== "landscape" && (orient === "portrait" || tall);
    root.classList.toggle("portrait", portrait);
    root.classList.toggle("split", portrait || forced === "kiosk" || (forced !== "web" && wide));
  }
  applyMode();
  addEventListener("resize", () => { applyMode(); layoutPrinters(); });

  /* ---------------- Identity ---------------- */
  $("labName").textContent = C.lab.name;
  $("labUniversity").textContent = C.lab.university;
  $("labDept").textContent = [C.lab.department, C.lab.location].filter(Boolean).join(" · ");
  $("labContact").textContent = C.lab.email || "";
  if (C.lab.logo) { const l = $("brandLogo"); l.src = C.lab.logo; l.hidden = false; }

  /* ---------------- Time helpers (always in the lab's timezone) ---------------- */
  const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function labNow() {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    const y = +p.year, m = +p.month, d = +p.day;
    return { y, m, d, mins: +p.hour * 60 + +p.minute, sec: +p.second, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
  }
  // Calendar day `offset` days from today (lab time)
  function dayInfo(now, offset) {
    const dt = new Date(Date.UTC(now.y, now.m - 1, now.d + offset));
    const iso = dt.toISOString().slice(0, 10);
    const dow = dt.getUTCDay();
    const ex = (C.hours.exceptions || []).find((e) => e.date === iso);
    const ranges = (ex ? ex.hours : C.hours.weekly[DAYS[dow]]) || [];
    return { iso, dow, ex, ranges: ranges.map(([a, b]) => [toMin(a), toMin(b)]), date: dt };
  }
  const toMin = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  function fmt(mins) {
    let h = Math.floor(mins / 60) % 24; const m = mins % 60;
    const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
    return m ? `${h}:${String(m).padStart(2, "0")} ${ap}` : `${h} ${ap}`;
  }
  // Each time in its own span so portrait mode can stack open/close vertically
  const fmtRangeHTML = (r) => r.map(([a, b]) =>
    `<span class="r"><span class="t">${fmt(a)}</span><span class="sep"> – </span><span class="t">${fmt(b)}</span></span>`).join("");

  /* ---------------- Clock ---------------- */
  function tickClock() {
    const now = new Date();
    const t = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).formatToParts(now);
    const hm = t.filter((x) => x.type !== "dayPeriod").map((x) => x.value).join("").trim();
    const ap = (t.find((x) => x.type === "dayPeriod") || {}).value || "";
    $("clockTime").innerHTML = `${esc(hm)}<small>${esc(ap)}</small>`;
    $("clockDate").textContent = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, weekday: "long", month: "long", day: "numeric"
    }).format(now);
  }

  /* ---------------- Hours ---------------- */
  function renderHours() {
    const now = labNow();
    const today = dayInfo(now, 0);
    const pill = $("statusPill"), text = $("statusText"), sub = $("statusSub");

    const current = today.ranges.find(([a, b]) => now.mins >= a && now.mins < b);
    pill.className = "status-pill";
    if (current) {
      const left = current[1] - now.mins;
      pill.classList.add(left <= 30 ? "closing" : "open");
      text.textContent = left <= 30 ? "Closing Soon" : "Open Now";
      sub.textContent = `Open until ${fmt(current[1])}`;
    } else {
      pill.classList.add("closed");
      text.textContent = "Closed";
      sub.textContent = nextOpening(now) || "See posted hours";
    }

    // Week list: the next 7 days starting Monday of this week
    const mondayOffset = -((now.dow + 6) % 7);
    const list = $("weekList");
    list.innerHTML = "";
    for (let i = 0; i < 7; i++) {
      const di = dayInfo(now, mondayOffset + i);
      const li = document.createElement("li");
      if (i === -mondayOffset) li.classList.add("today");
      if (!di.ranges.length) li.classList.add("closed");
      const label = di.ex ? `<span class="x">${esc(di.ex.label)}</span>` : "";
      li.innerHTML = `<span class="d">${DAY_NAMES[di.dow].slice(0, 3)}</span>` +
        `<span class="h">${di.ranges.length ? fmtRangeHTML(di.ranges) : "Closed"}${label}</span>`;
      list.appendChild(li);
    }
    $("hoursNote").textContent = C.hours.note || "";
  }
  function nextOpening(now) {
    for (let i = 0; i < 21; i++) {
      const di = dayInfo(now, i);
      const r = di.ranges.find(([a]) => i > 0 || a > now.mins);
      if (r) {
        const when = i === 0 ? "today" : i === 1 ? "tomorrow" : DAY_NAMES[di.dow];
        const why = (i > 0 && dayInfo(now, 0).ex && !dayInfo(now, 0).ranges.length) ? ` · ${dayInfo(now, 0).ex.label}` : "";
        return `Opens ${when} at ${fmt(r[0])}${why}`;
      }
    }
    return "";
  }

  /* ---------------- QR code ---------------- */
  function renderQR() {
    const f = C.printForm;
    $("qrTitle").textContent = f.heading;
    $("qrBlurb").textContent = f.blurb;
    const url = $("qrUrl");
    url.href = f.url; url.textContent = f.displayUrl || f.url.replace(/^https?:\/\//, "");
    $("qrLink").href = f.url;
    const box = $("qrBox");
    if (f.qrImage) { box.innerHTML = `<img src="${esc(f.qrImage)}" alt="">`; return; }
    if (typeof qrcode !== "function") { box.textContent = "QR library missing"; return; }
    const qr = qrcode(0, "M"); qr.addData(f.url); qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c},${r}h1v1h-1z`;
    box.innerHTML = `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="#111214"/></svg>`;
  }

  /* ---------------- Printers ---------------- */
  const PLACEHOLDER = "assets/printers/placeholder.svg";
  const STATUS_TEXT = { available: "Available", busy: "In use", maintenance: "Maintenance", offline: "Offline" };
  let printerPage = 0, printerTimer;

  function printerCard(p) {
    const st = STATUS_TEXT[p.status] ? p.status : "offline";
    return `<article class="printer">
      <div class="printer-photo">
        <img src="${esc(p.image || PLACEHOLDER)}" alt="${esc(p.name)}" loading="lazy"
             onerror="this.onerror=null;this.src='${PLACEHOLDER}';this.classList.add('placeholder')">
        <span class="tech-chip">${esc(p.tech)}</span>
        ${p.count > 1 ? `<span class="count-chip">×${p.count}</span>` : ""}
      </div>
      <div class="printer-body">
        <h3 class="printer-name"><span class="s s-${st}" title="${STATUS_TEXT[st]}"></span>${esc(p.name)}</h3>
        <p class="printer-meta">${esc(p.buildVolume || "")}</p>
        <div class="printer-mats">${(p.materials || []).map((m) => `<span>${esc(m)}</span>`).join("")}</div>
      </div>
    </article>`;
  }
  function layoutPrinters() {
    clearInterval(printerTimer);
    const grid = $("printerGrid"), pager = $("printerPager");
    const all = C.printers || [];
    const split = root.classList.contains("split");
    const per = split ? (C.printersPerPage || 6) : all.length;
    const pages = Math.max(1, Math.ceil(all.length / per));
    const show = (i) => {
      printerPage = i % pages;
      grid.innerHTML = all.slice(printerPage * per, printerPage * per + per).map(printerCard).join("");
      pager.innerHTML = pages > 1 ? Array.from({ length: pages }, (_, k) => `<i class="${k === printerPage ? "on" : ""}"></i>`).join("") : "";
    };
    show(Math.min(printerPage, pages - 1));
    if (pages > 1) {
      printerTimer = setInterval(() => {
        grid.classList.add("fading");
        setTimeout(() => { show(printerPage + 1); grid.classList.remove("fading"); }, 520);
      }, (C.printerPageSeconds || 12) * 1000);
    }
  }

  /* ---------------- Announcements ticker ---------------- */
  function startTicker() {
    const items = C.announcements || [];
    const el = $("tickerText");
    if (!items.length) { $("ticker").hidden = true; return; }
    let i = 0;
    el.textContent = items[0];
    if (items.length < 2) return;
    setInterval(() => {
      el.classList.add("out");
      setTimeout(() => { i = (i + 1) % items.length; el.textContent = items[i]; el.classList.remove("out"); }, 500);
    }, (C.announcementSeconds || 9) * 1000);
  }

  /* ---------------- Media player (right half) ---------------- */
  const Player = (() => {
    const slidesEl = $("slides"), cap = $("stageCaption"), bar = $("stageProgress"), idx = $("stageIndex");
    const hasModelViewer = () => !!customElements.get("model-viewer");
    let items = (C.media || []).slice();
    let i = -1, current = null, timer = null, failures = 0;

    function setCaption(it) {
      cap.classList.add("out");
      setTimeout(() => {
        $("stageKicker").textContent = it.kicker || "";
        $("stageTitle").textContent = it.title || "";
        $("stageText").textContent = it.caption || "";
        cap.hidden = !(it.kicker || it.title || it.caption);
        cap.classList.remove("out");
      }, 350);
    }
    function progress(seconds) {
      bar.style.transition = "none"; bar.style.width = "0";
      void bar.offsetWidth;
      if (seconds) { bar.style.transition = `width ${seconds}s linear`; bar.style.width = "100%"; }
    }
    function index() {
      idx.innerHTML = `<b>${String(i + 1).padStart(2, "0")}</b> / ${String(items.length).padStart(2, "0")}`;
    }

    // Build a slide element; calls ready() once it can be shown, fail() if it can't.
    function create(it, ready, fail) {
      const s = document.createElement("div");
      s.className = "slide" + (it.title || it.caption ? " has-caption" : "");
      let api = { destroy() {} };
      switch (it.type) {
        case "exploded-demo": {
          api = window.ExplodedDemo.mount(s, it.options || {});
          ready(); break;
        }
        case "model": {
          if (!hasModelViewer()) { fail(); break; }
          const mv = document.createElement("model-viewer");
          mv.setAttribute("src", it.src);
          mv.setAttribute("autoplay", "");
          mv.setAttribute("environment-image", it.environment || "neutral");
          mv.setAttribute("shadow-intensity", it.shadow ?? "1.1");
          mv.setAttribute("exposure", it.exposure ?? "1.05");
          mv.setAttribute("interaction-prompt", "none");
          mv.setAttribute("loading", "eager");
          if (it.autoRotate !== false) { mv.setAttribute("auto-rotate", ""); mv.setAttribute("auto-rotate-delay", "0"); mv.setAttribute("rotation-per-second", it.rotationSpeed || "14deg"); }
          if (it.cameraOrbit) mv.setAttribute("camera-orbit", it.cameraOrbit);
          if (it.animation) mv.setAttribute("animation-name", it.animation);
          if (!root.classList.contains("kiosk")) mv.setAttribute("camera-controls", "");
          mv.addEventListener("load", ready, { once: true });
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
          if (it.duration) im.style.animationDuration = it.duration + 2 + "s";
          s.appendChild(im); break;
        }
        case "iframe": {
          const f = document.createElement("iframe");
          f.src = it.src; f.setAttribute("scrolling", "no"); f.title = it.title || "animation";
          f.onload = () => ready();
          s.appendChild(f); break;
        }
        default: fail(); return;
      }
      slidesEl.appendChild(s);
      return { el: s, api };
    }

    function show(n) {
      clearTimeout(timer);
      if (!items.length) return;
      i = (n + items.length) % items.length;
      const it = items[i];
      let done = false;
      let built;
      // create() may report ready synchronously, before `built` is assigned — defer.
      const ready = (mediaSeconds) => queueMicrotask(() => onReady(mediaSeconds));
      const onReady = (mediaSeconds) => {
        if (done) return; done = true; failures = 0;
        const prev = current;
        current = built;
        requestAnimationFrame(() => built.el.classList.add("active"));
        if (prev) {
          prev.el.classList.remove("active");
          setTimeout(() => { prev.api.destroy(); prev.el.remove(); }, 1200); // free GPU memory on the Pi
        }
        setCaption(it); index();
        const secs = it.duration || (it.type === "video" && isFinite(mediaSeconds) ? mediaSeconds : 12);
        progress(items.length > 1 ? secs : 0);
        if (items.length > 1 && !(it.type === "video" && !it.duration)) timer = setTimeout(next, secs * 1000);
      };
      const fail = () => queueMicrotask(onFail);
      const onFail = () => {
        if (done) return; done = true;
        console.warn("[AM Lab] skipping media item (failed to load):", it);
        if (built) { built.api.destroy(); built.el.remove(); }
        if (++failures >= items.length) return; // nothing playable
        timer = setTimeout(() => show(i + 1), 50);
      };
      built = create(it, ready, fail);
      // Safety net: if something never reports ready, move on.
      setTimeout(() => { if (!done) fail(); }, (it.loadTimeout || 30) * 1000);
    }
    const next = () => show(i + 1);

    // Keyboard control (handy when previewing on a laptop)
    addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") show(i - 1);
    });

    return { start: () => show(0) };
  })();

  /* ---------------- Boot ---------------- */
  tickClock(); renderHours(); renderQR(); layoutPrinters(); startTicker();
  setInterval(tickClock, 1000);
  setInterval(renderHours, 30 * 1000);
  // model-viewer is a classic script registered synchronously, but wait a tick anyway
  requestAnimationFrame(() => Player.start());

  if (root.classList.contains("kiosk") && C.kiosk?.reloadMinutes > 0) {
    setTimeout(() => location.reload(), C.kiosk.reloadMinutes * 60 * 1000);
  }
})();
