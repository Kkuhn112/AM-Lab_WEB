# Display media: standard and how-to

Everything on the dynamic half of the lab screen comes from this folder.
You only ever touch two things:

- **the file**, which you drop into this `media/` folder, and
- **[`playlist.js`](playlist.js)**, where you add one line per item.

Nothing here affects the hours, printers or layout of the website.

---

## The standard

| | Spec |
|---|---|
| **Frame** | **1080 × 1080 px, square (1:1)**. For 4K screens you can use 2160 × 2160 instead (same proportions). |
| **Background** | **#0B0B0C** (near-black). The screen behind the video is this exact colour, so the edges disappear. |
| **Format** | MP4, H.264, 30 fps, `yuv420p`. Use about 8–12 Mbps (12 Mbps max). |
| **Audio** | None. The display is always muted, so audio is stripped. |
| **Length** | 10–60 seconds is the sweet spot. The playlist loops, so seamless loops look best. |
| **File size** | Under 50 MB (GitHub refuses files over 100 MB). |
| **Safe area** | Keep important content at least **60 px from every edge**. |
| **Caption zone** | If the slide has a `title`/`caption`, keep the **bottom 25 % (y 810–1080)** clear; the text is drawn there. Without a title, the whole frame is yours. |

**Why square?** The screen shows the media in a square-ish area: 960 × 1080 on a landscape TV and 1080 × 960 on a portrait TV. A square frame fits both whole, with nothing cropped, and the leftover sliver blends into the #0B0B0C background.

Images (`.jpg`, `.png`, `.webp`) follow the same standard. 3D models (`.glb`) frame themselves automatically.

### Guides for your editor
- [`guides/overlay-1080.png`](guides/overlay-1080.png) is a transparent overlay with the safe area and caption zone. Put it on the top track while you edit, then hide it before exporting.
- [`guides/template-1080.png`](guides/template-1080.png) is the same guide on the #0B0B0C background, to use as a starting frame.

### Exporting from CAD
| Tool | How |
|---|---|
| **SolidWorks** | Build an exploded view, then use *Animation Wizard → Explode*. Save the animation as MP4 (or AVI) and run it through `convert.sh`. Set the scene background to black (#0B0B0C) first. |
| **Fusion** | In the *Animation* workspace, set the background to a solid dark colour, then use *Publish Video* at a custom size of 1080 × 1080. |
| **Blender** | Set *Output → Resolution* to 1080 × 1080, *Frame rate* to 30, and *World colour* to #0B0B0C. Render to FFmpeg/MPEG-4 with H.264. Alternatively, export the animated model as `.glb` and use it directly. |
| **Anything else** | Export at any size, then run `convert.sh`. |

---

## Converting any video to the standard

[`convert.sh`](convert.sh) takes any video (wrong size, 4K, 60 fps, landscape, with audio) and outputs a correct file into this folder. Non-square video is padded with #0B0B0C, never cropped or stretched.

```bash
bash media/convert.sh ~/Downloads/gearbox_explode.mov gearbox
```

That writes `media/gearbox.mp4`. For a 4K square, run:

```bash
SIZE=2160 bash media/convert.sh input.mov name
```

You need `ffmpeg` installed (`brew install ffmpeg`, `winget install ffmpeg`, or `sudo apt install ffmpeg`).

---

## Adding it to the screen

1. Put the file in `media/`. On GitHub you can drag it into the folder in the browser (*Add file → Upload files*).
2. Open `media/playlist.js` (on GitHub, click the pencil to edit) and add a line:
   ```js
   { file: "gearbox.mp4", title: "Planetary gearbox", caption: "MECH 4xxx final project" },
   ```
3. Commit. The lab screen pulls changes every 10 minutes.

### Playlist fields
| Field | Meaning |
|---|---|
| `file` | The file name in `media/`. It can also be a full `https://` link, a YouTube link, or `"builtin:hotend"`. |
| `title` | Optional heading, drawn in the caption zone. |
| `caption` | Optional sentence under the title. |
| `seconds` | How long to show the item. Videos default to their own length; images default to 10 s; YouTube defaults to 30 s, so set it. |
| `fit` | `"contain"` (default) shows the whole frame. `"cover"` fills the area edge to edge and crops the sides (fine for real camera footage). |
| `orbit` | For `.glb` only: the starting camera angle, e.g. `"120deg 72deg 100%"`. |
| `skip` | Set to `true` to keep the line but not play it. |

Items are played top to bottom, then the list loops. If a file is missing or broken, it is skipped and the rest keeps playing.

**Tip:** to preview on a laptop, run `python3 -m http.server` in the repo and open `http://localhost:8000/?mode=kiosk`. Use the ← / → keys to step through the slides.
