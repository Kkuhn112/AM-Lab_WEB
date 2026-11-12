/* =====================================================================
   AM LAB DISPLAY — CONFIGURATION
   ---------------------------------------------------------------------
   This is the only file most people need to edit. It is plain
   JavaScript (not JSON) so the site also works when opened directly
   from disk on the Raspberry Pi (file://), where fetch() is blocked.

   After editing: commit + push. The Pi kiosk pulls changes and
   reloads automatically (see kiosk/README in the main README).
   ===================================================================== */

window.LAB_CONFIG = {

  /* ---------------- Identity ---------------- */
  lab: {
    name: "Additive Manufacturing Lab",
    university: "University of Colorado Denver",
    department: "College of Engineering, Design and Computing",
    location: "",            // e.g. "North Classroom 1234" — leave "" to hide
    email: "",               // e.g. "amlab@ucdenver.edu"  — leave "" to hide
    logo: ""                 // optional, e.g. "assets/brand/logo.svg"
  },

  /* ---------------- Print request form / QR ---------------- */
  printForm: {
    // TODO: replace with the real print-request form URL.
    // The QR code is generated from this automatically.
    url: "https://example.com/print-request",
    // Shorter text shown under the QR for people who'd rather type it.
    displayUrl: "",
    heading: "Submit a Print Request",
    blurb: "Scan with your phone camera to upload your model and request a print.",
    // Optional: use your own QR image instead of the generated one.
    qrImage: ""
  },

  /* ---------------- Hours ----------------
     Times are 24h "HH:MM" in the lab's timezone. A day can have several
     ranges, e.g. [["09:00","12:00"],["13:00","17:00"]]. [] = closed.   */
  hours: {
    timezone: "America/Denver",
    weekly: {
      mon: [["09:00", "17:00"]],
      tue: [["09:00", "17:00"]],
      wed: [["09:00", "17:00"]],
      thu: [["09:00", "19:00"]],
      fri: [["09:00", "15:00"]],
      sat: [],
      sun: []
    },
    // One-off closures / special hours. "hours": [] means closed all day.
    exceptions: [
      { date: "2026-11-26", label: "Thanksgiving", hours: [] },
      { date: "2026-11-27", label: "Fall Break",   hours: [] }
    ],
    note: "Prints may be picked up during open hours."
  },

  /* ---------------- Printers ----------------
     REPLACE these sample entries with the lab's actual machines.
     Put photos in assets/printers/ (landscape ~1600×1000 JPG/WebP,
     printer on a clean/neutral background looks best).
     status: "available" | "busy" | "maintenance" | "offline"          */
  printers: [
    {
      name: "Prusa MK4S",
      tech: "FDM",
      image: "assets/printers/prusa-mk4s.jpg",
      buildVolume: "250 × 210 × 220 mm",
      materials: ["PLA", "PETG", "TPU"],
      count: 4,
      status: "available"
    },
    {
      name: "Bambu Lab X1-Carbon",
      tech: "FDM",
      image: "assets/printers/bambu-x1c.jpg",
      buildVolume: "256 × 256 × 256 mm",
      materials: ["PLA", "PETG", "ABS", "PA-CF"],
      count: 2,
      status: "busy"
    },
    {
      name: "Formlabs Form 4",
      tech: "SLA",
      image: "assets/printers/form-4.jpg",
      buildVolume: "200 × 125 × 210 mm",
      materials: ["Standard", "Tough", "Clear"],
      count: 1,
      status: "available"
    },
    {
      name: "Formlabs Fuse 1+",
      tech: "SLS",
      image: "assets/printers/fuse-1.jpg",
      buildVolume: "165 × 165 × 300 mm",
      materials: ["Nylon 12", "Nylon 11"],
      count: 1,
      status: "maintenance"
    },
    {
      name: "Stratasys F370",
      tech: "FDM",
      image: "assets/printers/f370.jpg",
      buildVolume: "355 × 254 × 355 mm",
      materials: ["ABS", "ASA", "PC-ABS"],
      count: 1,
      status: "available"
    },
    {
      name: "Markforged Onyx Pro",
      tech: "CFR",
      image: "assets/printers/onyx-pro.jpg",
      buildVolume: "320 × 132 × 154 mm",
      materials: ["Onyx", "Fiberglass"],
      count: 1,
      status: "available"
    }
  ],
  // In kiosk mode, printers are paged if there are more than this many.
  printersPerPage: 6,
  printerPageSeconds: 12,

  /* ---------------- Dynamic media (right half) ----------------
     Plays in order, then loops. Types:
       "exploded-demo"  built-in animated exploded view (no files needed)
       "model"          .glb/.gltf 3D model; its first animation autoplays
                        (export exploded-view animations from Fusion /
                        SolidWorks / Blender as glTF)
       "video"          .mp4/.webm — advances when the video ends
                        unless "duration" is set
       "image"          .jpg/.png/.webp with a slow Ken Burns pan
       "iframe"         any local HTML animation, e.g. assets/media/x.html
     Common fields: kicker, title, caption, duration (seconds).
     Items whose files are missing are skipped automatically.          */
  media: [
    {
      type: "exploded-demo",
      kicker: "Exploded View",
      title: "Inside an FDM Hotend",
      caption: "Filament is pushed through a heat break into the heater block, melted, and extruded through the nozzle.",
      duration: 16
    },
    {
      type: "model",
      src: "assets/media/hotend-assembly.glb",
      kicker: "3D Assembly",
      title: "Hotend Assembly — Animated",
      caption: "Exploded-view animations exported straight from CAD play here as interactive 3D.",
      duration: 18,
      cameraOrbit: "120deg 72deg 100%",
      autoRotate: true
    }
    // { type: "video", src: "assets/media/gearbox-explode.mp4",
    //   kicker: "Student Project", title: "Planetary Gearbox", caption: "" },
    // { type: "image", src: "assets/media/lattice.jpg",
    //   kicker: "Featured Print", title: "Gyroid Lattice Bracket", duration: 10 },
  ],

  /* ---------------- Ticker (bottom-left) ---------------- */
  announcements: [
    "Safety glasses are required beyond the yellow line.",
    "Large or multi-day prints need staff approval — note it on your request.",
    "Clean the build plate and remove supports at the post-processing station."
  ],
  announcementSeconds: 9,

  /* ---------------- Kiosk behaviour ---------------- */
  kiosk: {
    // Reload the page this often so pulled changes appear (0 = never).
    reloadMinutes: 60,
    hideCursor: true
  }
};
