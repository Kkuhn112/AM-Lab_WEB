/* =====================================================================
   DEFAULT PLAYLIST — what the top panel plays when the machine's local
   media folder (~/AM-Lab-Media) is empty, and on the public website.

   ► Your own videos do NOT go here. Put them in ~/AM-Lab-Media on the
     Pi (or your PC for testing); they never touch GitHub.
     See media/README.md.

   You can also copy this file into ~/AM-Lab-Media/playlist.js for full
   control of the local media (order, titles, durations, built-ins);
   "file" names there refer to files in ~/AM-Lab-Media.

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

  // { file: "https://youtu.be/VIDEO_ID", title: "Lab tour", seconds: 45 },

];
