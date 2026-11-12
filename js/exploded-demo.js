/* =====================================================================
   Built-in "exploded view" animation — FDM hotend assembly.
   Pure SVG + CSS transitions (no WebGL), so it is light enough for a
   Raspberry Pi and needs no external files. Used by the media player
   for slides with  type: "exploded-demo".
   ===================================================================== */
(function () {
  "use strict";

  const CX = 430; // assembly centre line in viewBox units

  /* ---------- primitive builders (origin = top-centre of part) ---------- */
  function cyl(r, h, fill, top, extra = "") {
    const ry = r * 0.5;
    return `
      <path d="M${-r},0 L${-r},${h} A${r},${ry} 0 0 0 ${r},${h} L${r},0 Z" fill="${fill}"/>
      ${extra}
      <ellipse cx="0" cy="0" rx="${r}" ry="${ry}" fill="${top}"/>`;
  }
  function box(hw, h, top, left, right) {
    const q = hw / 2;
    return `
      <path d="M${-hw},0 L0,${q} L0,${q + h} L${-hw},${h} Z" fill="${left}"/>
      <path d="M0,${q} L${hw},0 L${hw},${h} L0,${q + h} Z" fill="${right}"/>
      <path d="M0,${-q} L${hw},0 L0,${q} L${-hw},0 Z" fill="${top}"/>`;
  }
  function rod(len, r, fill, cap, angle) {
    // a capsule along +x, rotated into an isometric axis
    return `<g transform="rotate(${angle})">
      <rect x="0" y="${-r}" width="${len}" height="${2 * r}" rx="${r}" fill="${fill}"/>
      <rect x="${len - 6}" y="${-r}" width="6" height="${2 * r}" fill="${cap}"/>
    </g>`;
  }

  /* ---------- parts ---------- */
  function heatsink() {
    const r = 72, h = 150, ry = r / 2;
    let fins = "";
    for (let y = 16; y < h; y += 16) {
      fins += `<path d="M${-r},${y} A${r},${ry} 0 0 0 ${r},${y}" fill="none" stroke="#5d636c" stroke-width="2.2" opacity=".75"/>`;
      fins += `<path d="M${-r},${y + 2.5} A${r},${ry} 0 0 0 ${r},${y + 2.5}" fill="none" stroke="#eef1f4" stroke-width="1" opacity=".35"/>`;
    }
    return cyl(r, h, "url(#xd-alu)", "url(#xd-aluTop)", fins) +
      `<ellipse cx="0" cy="0" rx="14" ry="7" fill="#2a2d32"/>` +
      `<ellipse cx="0" cy="0" rx="${r - 8}" ry="${ry - 4}" fill="none" stroke="#fff" stroke-opacity=".25"/>`;
  }
  function fan() {
    const hw = 88, h = 150;
    const blades = [0, 72, 144, 216, 288].map(a =>
      `<path transform="rotate(${a})" d="M0,0 C10,-8 30,-14 34,-4 C30,4 12,6 0,0 Z" fill="#3a3e45"/>`).join("");
    return box(hw, h, "#34373d", "#1d1f23", "#26292e") +
      // fan opening on the left (front) face, drawn in that face's plane
      `<g transform="matrix(1,0.5,0,1,${-hw},0)">
        <circle cx="${hw / 2}" cy="${h / 2}" r="38" fill="#0e0f11"/>
        <g class="xd-spin" transform="translate(${hw / 2},${h / 2})">
          <g class="xd-rotor">${blades}<circle r="9" fill="#cfb87c"/></g>
        </g>
        <circle cx="${hw / 2}" cy="${h / 2}" r="38" fill="none" stroke="#4a4e56" stroke-width="2"/>
        <rect x="8" y="8" width="${hw - 16}" height="4" fill="#cfb87c" opacity=".8"/>
      </g>`;
  }
  function heatbreak() {
    const r = 13, h = 60, ry = r / 2;
    let rings = "";
    for (let y = 10; y < 34; y += 6) rings += `<path d="M${-r},${y} A${r},${ry} 0 0 0 ${r},${y}" fill="none" stroke="#565b62" stroke-width="1.6"/>`;
    return cyl(r, h, "url(#xd-steel)", "#d9dde2", rings) + `<ellipse cx="0" cy="0" rx="5" ry="2.5" fill="#2a2d32"/>`;
  }
  function block() {
    return box(62, 58, "#d7dbe0", "url(#xd-blockL)", "url(#xd-blockR)") +
      `<ellipse cx="0" cy="0" rx="13" ry="6.5" fill="#3a3e45"/>` +
      // cartridge bore on right face
      `<ellipse cx="34" cy="31" rx="9" ry="10" fill="#4b5058" transform="skewY(-26.565) translate(0,17)"/>`;
  }
  function nozzle() {
    return cyl(24, 18, "url(#xd-brass)", "#ecd38f") +
      `<path d="M-18,18 L-3,58 Q0,63 3,58 L18,18 A18,9 0 0 1 -18,18 Z" fill="url(#xd-brass)"/>` +
      `<ellipse cx="0" cy="0" rx="7" ry="3.5" fill="#5b4a1c"/>`;
  }
  function cartridge() {
    return rod(110, 9, "url(#xd-rod)", "#4b5058", 30) +
      `<path d="M95,55 C120,70 140,62 160,82" stroke="#c2413a" stroke-width="3" fill="none" stroke-linecap="round"/>` +
      `<path d="M95,55 C116,76 130,74 150,96" stroke="#e6e7ea" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  function thermistor() {
    return rod(70, 5, "url(#xd-rod)", "#cfb87c", 150) +
      `<path d="M-61,35 C-80,48 -92,40 -110,60" stroke="#e6e7ea" stroke-width="2" fill="none"/>` +
      `<path d="M-61,35 C-76,54 -88,52 -102,72" stroke="#cfb87c" stroke-width="2" fill="none"/>`;
  }

  /* ---------- assembly: [id, svg, assembledXY, explodedXY, delay] ----------
     Order = paint order (back to front). */
  const PARTS = [
    ["nozzle",     nozzle(),     [CX, 418],      [CX, 640],      0.00],
    ["cartridge",  cartridge(),  [CX - 30, 380], [CX + 169, 495], 0.18],
    ["thermistor", thermistor(), [CX + 10, 390], [CX - 163, 490], 0.24],
    ["block",      block(),      [CX, 360],      [CX, 500],      0.08],
    ["heatbreak",  heatbreak(),  [CX, 300],      [CX, 330],      0.12],
    ["heatsink",   heatsink(),   [CX, 170],      [CX, 110],      0.04],
    ["fan",        fan(),        [CX - 112, 165],[CX - 250, 140], 0.30]
  ];

  // [number, title, subtitle, leader points, text x, text y, anchor]
  const LABELS = [
    ["01", "Cooling Fan",      "Keeps the cold zone cold",        "180,96 180,70",              92, 52, "start"],
    ["02", "Heat Sink",        "Finned aluminum",                 "502,190 560,150 640,150",   650, 146, "start"],
    ["03", "Heat Break",       "Thermal barrier",                 "443,362 560,300 640,300",   650, 296, "start"],
    ["04", "Heater Block",     "Aluminum · 200–260 °C",           "492,529 560,440 640,440",   650, 436, "start"],
    ["05", "Heater Cartridge", "40 W resistive element",          "694,552 694,580 700,590",   650, 606, "start"],
    ["06", "Thermistor",       "Closed-loop temp sensing",        "206,527 150,600 60,600",     40, 620, "start"],
    ["07", "Nozzle",           "Brass · 0.4 mm orifice",          "448,672 560,700 640,700",   650, 696, "start"]
  ];

  const CSS = `
    .xd text { font-family: "Inter", sans-serif; }
    .xd .part { transition: transform 1.7s cubic-bezier(.7,0,.3,1); transition-delay: calc(0.3s - var(--d)); }
    .xd .part { transform: translate(var(--ax), var(--ay)); }
    .xd.exploded .part { transform: translate(var(--ex), var(--ey)); transition-delay: var(--d); }
    .xd .assy { animation: xd-float 7s ease-in-out infinite; }
    @keyframes xd-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
    .xd .lbl { opacity: 0; transition: opacity .5s ease; transition-delay: 0s; }
    .xd.exploded .lbl { opacity: 1; transition-delay: calc(1.5s + var(--i) * .12s); }
    .xd .lbl polyline { stroke-dasharray: 260; stroke-dashoffset: 260; transition: stroke-dashoffset .8s ease; }
    .xd.exploded .lbl polyline { stroke-dashoffset: 0; transition-delay: calc(1.4s + var(--i) * .12s); }
    .xd .xd-rotor { animation: xd-rot 0.6s linear infinite; }
    @keyframes xd-rot { to { transform: rotate(360deg) } }
    .xd .fil { stroke-dasharray: 6 10; animation: xd-flow 1.2s linear infinite; }
    @keyframes xd-flow { to { stroke-dashoffset: -32 } }
    .xd .state { transition: opacity .4s; }
    @media (prefers-reduced-motion: reduce) { .xd .assy, .xd .xd-rotor, .xd .fil { animation: none } }
  `;

  const DEFS = `
    <linearGradient id="xd-alu" x1="0" x2="1"><stop offset="0" stop-color="#7d838c"/><stop offset=".35" stop-color="#d9dde2"/><stop offset=".6" stop-color="#b2b8c0"/><stop offset="1" stop-color="#6b7179"/></linearGradient>
    <linearGradient id="xd-aluTop" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#eef1f4"/><stop offset="1" stop-color="#b9bfc7"/></linearGradient>
    <linearGradient id="xd-steel" x1="0" x2="1"><stop offset="0" stop-color="#6e737b"/><stop offset=".4" stop-color="#e3e6ea"/><stop offset="1" stop-color="#7a8088"/></linearGradient>
    <linearGradient id="xd-brass" x1="0" x2="1"><stop offset="0" stop-color="#8a6a22"/><stop offset=".4" stop-color="#f1d58a"/><stop offset=".7" stop-color="#cfa94c"/><stop offset="1" stop-color="#7c5d1b"/></linearGradient>
    <linearGradient id="xd-blockL" x1="0" x2="1"><stop offset="0" stop-color="#7e858e"/><stop offset="1" stop-color="#a7aeb6"/></linearGradient>
    <linearGradient id="xd-blockR" x1="0" x2="1"><stop offset="0" stop-color="#bcc2c9"/><stop offset="1" stop-color="#9097a0"/></linearGradient>
    <linearGradient id="xd-rod" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eceef1"/><stop offset=".5" stop-color="#a9afb7"/><stop offset="1" stop-color="#6c727a"/></linearGradient>
    <radialGradient id="xd-shadow"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  `;

  function build() {
    const parts = PARTS.map(([id, svg, a, e, d]) =>
      `<g class="part p-${id}" style="--ax:${a[0]}px;--ay:${a[1]}px;--ex:${e[0]}px;--ey:${e[1]}px;--d:${d}s">${svg}</g>`
    ).join("");
    const labels = LABELS.map(([n, t, s, pts, x, y, anchor], i) => {
      const p0 = pts.split(" ")[0].split(",");
      return `<g class="lbl" style="--i:${i}">
        <polyline points="${pts}" fill="none" stroke="#cfb87c" stroke-width="1.4" opacity=".85"/>
        <circle cx="${p0[0]}" cy="${p0[1]}" r="3.5" fill="#0a0b0d" stroke="#cfb87c" stroke-width="1.6"/>
        <text x="${x}" y="${y}" text-anchor="${anchor}" fill="#cfb87c" font-size="13" font-weight="700" letter-spacing="2">${n}</text>
        <text x="${x + 28}" y="${y}" text-anchor="${anchor}" fill="#fff" font-size="19" font-weight="650">${t}</text>
        <text x="${x + 28}" y="${y + 20}" text-anchor="${anchor}" fill="#9aa0a8" font-size="13.5">${s}</text>
      </g>`;
    }).join("");

    return `<svg class="xd" viewBox="0 0 900 780" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Animated exploded view of a 3D printer hotend">
      <style>${CSS}</style>
      <defs>${DEFS}</defs>
      <g font-family="Inter, sans-serif">
        <text x="40" y="760" fill="#5d636c" font-size="12" letter-spacing="3">FIG. 01 — FDM HOTEND ASSEMBLY</text>
        <text class="state" x="860" y="760" text-anchor="end" fill="#cfb87c" font-size="12" font-weight="700" letter-spacing="3">ASSEMBLED</text>
      </g>
      <ellipse cx="${CX}" cy="745" rx="170" ry="22" fill="url(#xd-shadow)" opacity=".7"/>
      <g class="assy">
        <line class="fil" x1="${CX}" y1="0" x2="${CX}" y2="200" stroke="#cfb87c" stroke-width="3" stroke-linecap="round"/>
        ${parts}
      </g>
      ${labels}
    </svg>`;
  }

  /**
   * Mount the demo into a container. Returns { destroy }.
   * The assembly explodes, holds with callouts, collapses, and repeats.
   */
  function mount(container, opts = {}) {
    container.insertAdjacentHTML("beforeend", build());
    const svg = container.lastElementChild;
    const state = svg.querySelector(".state");
    const hold = (opts.holdSeconds || 6.5) * 1000;
    const rest = (opts.restSeconds || 2.8) * 1000;
    let timer;
    const explode = () => {
      svg.classList.add("exploded"); state.textContent = "EXPLODED VIEW";
      timer = setTimeout(collapse, hold);
    };
    const collapse = () => {
      svg.classList.remove("exploded"); state.textContent = "ASSEMBLED";
      timer = setTimeout(explode, rest);
    };
    timer = setTimeout(explode, (opts.startDelay ?? 1.2) * 1000);
    return { el: svg, destroy() { clearTimeout(timer); svg.remove(); } };
  }

  window.ExplodedDemo = { mount };
})();
