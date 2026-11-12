/* =====================================================================
   DISPLAY PLAYLIST — what plays on the dynamic half of the screen.

   This is the ONLY file you need to edit to change the display. It is
   separate from the rest of the website, so nothing you do here can
   break the hours, printers, or layout.

   HOW TO ADD SOMETHING
     1. Export your video to the standard in media/README.md
        (1080 × 1080, MP4, background #0B0B0C). media/convert.sh can do it for you.
     2. Put the file in this media/ folder.
     3. Add one line below:  { file: "my-video.mp4", title: "My title" },
     4. Commit. The lab screen picks it up within about 10 minutes.

   WHAT "file" CAN BE (the type is detected from the extension)
     .mp4 .webm .mov    video. Plays once, then moves on (or set seconds).
     .jpg .png .webp .gif   image, shown for `seconds` (default 10)
     .glb .gltf         3D model. Its animation autoplays and it slowly turns.
     .html              any custom animation page
     https://youtu.be/… or a youtube.com link: YouTube video (needs internet)
     "builtin:hotend"   the built-in animated hotend exploded view

   OPTIONAL FIELDS
     title      large heading over the bottom of the frame
     caption    one or two sentences under the title
     seconds    how long to show it (videos default to their own length)
     fit        "contain" (default: whole frame, never cropped)
                or "cover" (fill the screen edge to edge, crops the sides)
     orbit      3D models only: camera angle, e.g. "120deg 72deg 100%"
     skip       true = keep the line but don't play it
   ===================================================================== */

window.LAB_PLAYLIST = [

  { file: "builtin:hotend",
    title: "Inside an FDM hotend",
    caption: "Filament passes through the heat break into the heater block, melts, and leaves through the nozzle.",
    seconds: 16 },

  { file: "hotend-assembly.glb",
    title: "Hotend assembly",
    caption: "Exploded-view animations exported from CAD play here in 3D.",
    seconds: 18,
    orbit: "120deg 72deg 100%" },

  // { file: "gearbox-exploded.mp4", title: "Planetary gearbox", caption: "MECH 4xxx final project" },
  // { file: "lattice.jpg", title: "Gyroid lattice bracket", seconds: 10 },
  // { file: "https://youtu.be/VIDEO_ID", title: "Lab tour" },

];
