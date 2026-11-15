# Display media: standard and how-to

Your videos, images and 3D models for the top (or right) panel live **on the Pi**, in a plain folder:

```
~/AM-Lab-Media          (/home/<user>/AM-Lab-Media)
```

They are **not** stored in this repo and never go to GitHub. Drop a file in and it plays; delete it and it's gone. Nothing in that folder affects the hours, printers or layout.

This `media/` folder in the repo only holds the standard (below), the conversion script, the editor guides, and the **default playlist**. That playlist plays when the Pi's folder is empty, and on the public website.

---

## The standard

| | Spec |
|---|---|
| **Frame** | **1080 × 1080 px, square (1:1)**. For 4K screens you can use 2160 × 2160 instead (same proportions). |
| **Background** | **#0B0B0C** (near-black). The screen behind the video is this exact colour, so the edges disappear. |
| **Format** | MP4, H.264, 30 fps, `yuv420p`. Use about 8–12 Mbps (12 Mbps max). |
| **Audio** | None. The display is always muted, so audio is stripped. |
| **Length** | 10–60 seconds is the sweet spot. The playlist loops, so seamless loops look best. |
| **File size** | Under about 100 MB per file keeps playback smooth on the Pi. |
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

[`convert.sh`](convert.sh) takes any video (wrong size, 4K, 60 fps, landscape, with audio) and outputs a correct MP4 straight into `~/AM-Lab-Media`. Non-square video is padded with #0B0B0C, never cropped or stretched. The name you give becomes the title on screen:

```bash
bash media/convert.sh ~/Downloads/gearbox_explode.mov "02 Planetary gearbox"
```

That writes `~/AM-Lab-Media/02 Planetary gearbox.mp4`. For a 4K square, run:

```bash
SIZE=2160 bash media/convert.sh input.mov name
```

You need `ffmpeg` installed (`brew install ffmpeg`, `winget install ffmpeg`, or `sudo apt install ffmpeg`). On Windows, run it from Git Bash. Run it on your PC, then copy the result to the Pi, or run it on the Pi directly.

---

## Adding things to the screen

### The simple way: drop files in the folder
| You do | On screen |
|---|---|
| Put `02 Planetary gearbox.mp4` in `~/AM-Lab-Media` | It plays, with the title **"Planetary gearbox"** |
| Start names with numbers (`01 …`, `02 …`) | Sets the play order. The number isn't shown. Without numbers, files play alphabetically. |
| Add `02 Planetary gearbox.txt` containing a sentence | That sentence is the caption under the title |
| Delete or rename a file | It's removed or renamed on screen |

The screen checks the folder every **2 minutes**, so there's no restart or reload needed. Underscores in names show as spaces. Unsupported files (e.g. `.docx`) and hidden files are ignored.

### Getting files onto the Pi
| From | How |
|---|---|
| **A USB stick** | Close the kiosk (Alt+F4). Copy the files into the `AM-Lab-Media` folder in the Pi's home folder using the file manager, then reboot or restart the kiosk. |
| **Your PC, over the network** (Windows) | Use [WinSCP](https://winscp.net), protocol **SFTP**, host `amlab-display.local`, with the Pi's username and password. Drag files into `AM-Lab-Media`. |
| **Your PC, over the network** (Mac) | Use [Cyberduck](https://cyberduck.io) (SFTP), or the terminal: `scp "02 Planetary gearbox.mp4" amlab@amlab-display.local:AM-Lab-Media/` |

SFTP works out of the box because SSH was turned on when the SD card was flashed.

### Full control: a `playlist.js` in the folder
To pick exact titles, show a slide with no title, set durations, use 3D-model camera angles, or mix in the built-in animation or YouTube, copy the repo's [`playlist.js`](playlist.js) into `~/AM-Lab-Media/playlist.js` and edit it. `file` names then refer to files in `~/AM-Lab-Media`:

```js
window.LAB_PLAYLIST = [
  { file: "02 Planetary gearbox.mp4", title: "Planetary gearbox", caption: "MECH 3xxx final project" },
  { file: "bracket.jpg", seconds: 8 },                     // no title
  { file: "builtin:hotend", title: "Inside an FDM hotend", seconds: 16 },
];
```

When `playlist.js` is present, only what it lists plays. If it has a typo, the screen ignores it and plays the folder's files instead. Delete `playlist.js` to go back to drop-in mode.

### Playlist fields
| Field | Meaning |
|---|---|
| `file` | The file name in the folder. It can also be a full `https://` link, a YouTube link, or `"builtin:hotend"`. |
| `title` | Optional heading, drawn in the caption zone. |
| `caption` | Optional sentence under the title. |
| `seconds` | How long to show the item. Videos default to their own length; images default to 10 s; YouTube defaults to 30 s, so set it. |
| `fit` | `"contain"` (default) shows the whole frame. `"cover"` fills the area edge to edge and crops the sides (fine for real camera footage). |
| `orbit` | For `.glb` only: the starting camera angle, e.g. `"120deg 72deg 100%"`. |
| `skip` | Set to `true` to keep the line but not play it. |

If a file is missing or broken, it is skipped and the rest keeps playing.

### Testing on your PC
`run-local.py` uses the same kind of folder on your PC: `AM-Lab-Media` in your home folder (`C:\Users\<you>\AM-Lab-Media` on Windows). Drop files there and run `python run-local.py`. Use ← / → to step through slides.
