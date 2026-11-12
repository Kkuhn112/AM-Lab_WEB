/* =====================================================================
   LYNX AM LAB DISPLAY — CONFIGURATION
   The only file most people need to edit. Plain JavaScript (not JSON)
   so the page also works when opened straight from disk.
   ===================================================================== */

window.LAB_CONFIG = {

  lab: {
    name: "Lynx AM Lab",
    logo: "assets/brand/lynx-am-lab.png",          // lab logo (header)
    universityLogo: "assets/brand/cu-denver.png",  // footer
    department: "Department of Mechanical Engineering",
    location: "North Classroom Building, Room NC1809G",
    email: "3dprint@ucdenver.edu"
  },

  printForm: {
    // TODO: the print-request form URL. The QR code is generated from it.
    url: "https://example.com/print-request",
    displayUrl: "",                 // optional shorter text under the QR
    heading: "Submit a print request",
    blurb: "Scan with your phone to upload a file.",
    qrImage: ""                     // optional: use your own QR image instead
  },

  /* Hours
     If a Google Calendar is connected (see CALENDAR.md), the timetable is
     drawn from that calendar and `weekly` below is only a fallback for
     dates the calendar data doesn't cover.
     Times are 24h "HH:MM" in the lab timezone.                         */
  hours: {
    timezone: "America/Denver",
    gridStart: "09:00",          // timetable shows this span
    gridEnd: "17:00",            //   (widens automatically if an event falls outside it)
    days: ["mon", "tue", "wed", "thu", "fri"],   // columns always shown; Sat/Sun appear if they have hours
    weekly: {
      mon: [["10:30", "12:00"]],
      tue: [["14:00", "17:00"]],
      wed: [["10:30", "12:00"]],
      thu: [["14:00", "17:00"]],
      fri: [],
      sat: [],
      sun: []
    },
    // Fallback-only closures, e.g. { date: "2026-11-26", label: "Thanksgiving", hours: [] }
    exceptions: []
  },

  /* Printers — photos live in assets/printers/ (square, white background). */
  printers: [
    {
      name: "Bambu Lab A1",
      count: 11,
      image: "assets/printers/bambu-a1.jpg",
      buildVolume: "256 × 256 × 256 mm"
    },
    {
      name: "Bambu Lab P1S",
      count: 1,
      image: "assets/printers/bambu-p1s.jpg",
      buildVolume: "256 × 256 × 256 mm",
      note: "Enclosed"
    },
    {
      name: "Prusa XL",
      count: 2,
      image: "assets/printers/prusa-xl.jpg",
      buildVolume: "360 × 360 × 360 mm",
      note: "5 toolheads, multi-material"
    },
    {
      name: "Elegoo OrangeStorm Giga",
      count: 1,
      image: "assets/printers/elegoo-giga.jpg",
      buildVolume: "800 × 800 × 1000 mm",
      note: "Large format"
    },
    {
      // TODO: add photo (assets/printers/fiber-seeker.jpg) and build volume
      name: "Fiber Seeker",
      count: 1,
      image: "",
      buildVolume: "",
      note: "Continuous fiber"
    }
  ],

  /* The dynamic half of the screen is NOT configured here —
     edit media/playlist.js (see media/README.md).                    */

  kiosk: {
    reloadMinutes: 60,   // reload so pulled changes appear (0 = never)
    hideCursor: true
  }
};
