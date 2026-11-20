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
| **Caption zone** | Slides have **no title by default**, so the whole frame is yours. If you add a title, it's drawn over the **bottom 25 % (y 810–1080)**. |

**How it's shown:** videos and images **zoom to fill** the panel, centred, and whatever overflows is cropped, so there are never black bars. The panel is 960 × 1080 on a landscape TV and 1080 × 960 on a portrait TV. A square 1080 × 1080 video loses just 60 px on two sides, which the safe area allows for. A 16:9 video fills the panel too, but loses a lot more from its sides, so keep the subject centred. To show a file whole with no cropping, use `fit: "contain"` in a `playlist.js`.

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

**Step-by-step guide:** [CONVERTING.md](CONVERTING.md) covers checking a file, the converter, a one-line ffmpeg command, HandBrake, and phone and CAD export settings.

[`convert.sh`](convert.sh) takes any video (wrong size, 4K, 60 fps, landscape, with audio) and outputs a correct MP4 straight into `~/AM-Lab-Media`. Non-square video is zoomed to fill the square and centred, the same way the display fills its panel; use `PAD=1` to keep the whole picture with background bars instead. A leading number in the name sets the play order:

```bash
bash media/convert.sh ~/Downloads/gearbox_explode.mov "02 Planetary gearbox"
```

That writes `~/AM-Lab-Media/02 Planetary gearbox.mp4`. For a 4K square, run:

```bash
SIZE=2160 bash media/convert.sh input.mov name
```

To keep the whole picture instead of cropping:

```bash
PAD=1 bash media/convert.sh input.mov name
```

You need `ffmpeg` installed (`brew install ffmpeg`, `winget install ffmpeg`, or `sudo apt install ffmpeg`). On Windows, run it from Git Bash. Run it on your PC, then copy the result to the Pi, or run it on the Pi directly.

---

## Adding things to the screen

### The simple way: drop files in the folder
| You do | On screen |
|---|---|
| Put `02 Planetary gearbox.mp4` in `~/AM-Lab-Media` | It plays, filling the panel, with **no title** |
| Start names with numbers (`01 …`, `02 …`) | Sets the play order. The number isn't shown. Without numbers, files play alphabetically. |
| Add `02 Planetary gearbox.txt` next to it | **Line 1** is shown as the title; any further lines are the caption underneath |
| Delete or rename a file | It's removed or renamed on screen |

The screen checks the folder every **30 seconds**, so there's no restart or reload needed. A file that is still being copied in is ignored until the copy finishes. Unsupported files (e.g. `.docx`) and hidden files are ignored.

### Photos
Photos work the same way: copy them into `~/AM-Lab-Media`.
- **Accepted types:** `.jpg` / `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`, `.bmp`. Uppercase extensions like `.JPG` from cameras are fine.
- **Rotation:** phone photos that are stored sideways are turned upright automatically.
- **Framing:** like videos, photos zoom to fill the panel and are centred, so keep the subject in the middle.
- **iPhone HEIC photos (`.heic`)** can't be shown by the browser and are skipped. Convert them to JPG (see [CONVERTING.md](CONVERTING.md#photos-iphone-heic)), or set the iPhone to *Settings → Camera → Formats → Most Compatible*, which saves JPGs.
- **Size:** photos straight off a phone (12–48 MP) work. Shrinking them to about 2000 px on the long side saves space and loads faster on the Pi.

### Timing and transitions
Set in `js/config.js` under `display`:

| Setting | Default | Meaning |
|---|---|---|
| `slideSeconds` | `10` | How long each photo, 3D model or animation is shown |
| `videoSeconds` | `"full"` | Videos play to the end. Set a number (e.g. `10`) to cut every video to that length; shorter videos then loop to fill it. |
| `fadeSeconds` | `1.2` | Length of the crossfade between every slide |

A `seconds` value on a `playlist.js` line overrides these for that one item.

Every change of slide is a crossfade. The new slide fades in over the old one, and a video starts fading out about a second before its end while it's still playing, so it never freezes on its last frame.

### Getting files onto the Pi: from your laptop, with the screen running
You don't need to touch the Pi or stop the display. Copy files over the network, and they appear on screen within about 30 seconds, crossfading into the playlist. Deleting or replacing files works the same way. The QR code folder (`~/AM-Lab-QR`) works the same way too.

**Windows: WinSCP (free, drag and drop)**
1. Install [WinSCP](https://winscp.net).
2. Create a *New Site* with these settings:
   - File protocol: **SFTP**
   - Host name: **`raspberry.local`** (the Pi's name). If that doesn't connect, use its IP address; see below.
   - User name and password: the Pi's login, e.g. `kkuhn`.
3. *Save*, then *Login*. The first time, accept the host key prompt.
4. On the right (the Pi side), open **`AM-Lab-Media`**, and drag photos and videos into it from the left.

**Mac:** [Cyberduck](https://cyberduck.io) (free) works like WinSCP: choose *SFTP*, then the same host, user and password. Or use the Terminal:
```bash
scp "01 Bracket.jpg" "02 Gearbox.mp4" kkuhn@raspberry.local:AM-Lab-Media/
```

**Any laptop, command line (Windows PowerShell has `scp` built in):**
```bash
scp "photo.jpg" kkuhn@raspberry.local:AM-Lab-Media/
```

**If it won't connect:**
- **SSH must be on** (it is if you enabled it when flashing the SD card). To turn it on, run this on the Pi once:
  ```bash
  sudo systemctl enable --now ssh
  ```
- **Find the Pi's IP address** (on the Pi): `hostname -I`. Use that number instead of `raspberry.local`. Campus networks often block `.local` names.
- The laptop and the Pi must be on the **same network**, or one that lets them reach each other. Some campus Wi-Fi isolates devices. If so, use Ethernet or ask IT.

**Large videos:** files still being copied are ignored until the copy finishes, so a half-uploaded video is never shown. They appear about 5 seconds after the copy completes.

**USB stick (at the Pi):** close the kiosk (Alt+F4), copy the files into `AM-Lab-Media` with the file manager, then restart the kiosk or reboot.

### Full control: a `playlist.js` in the folder
To set durations, show a file uncropped (`fit: "contain"`), use 3D-model camera angles, or mix in the built-in animation or YouTube, copy the repo's [`playlist.js`](playlist.js) into `~/AM-Lab-Media/playlist.js` and edit it. `file` names then refer to files in `~/AM-Lab-Media`:

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
| `seconds` | How long to show the item. The defaults come from `display` in `js/config.js`: 10 s for photos and models, full length for videos. YouTube defaults to 30 s, so set it. |
| `fit` | `"cover"` (default) zooms to fill the panel, centred, cropping the overflow. `"contain"` shows the whole frame, with background around it. |
| `orbit` | For `.glb` only: the starting camera angle, e.g. `"120deg 72deg 100%"`. |
| `skip` | Set to `true` to keep the line but not play it. |

If a file is missing or broken, it is skipped and the rest keeps playing.

### Testing on your PC
`run-local.py` uses the same kind of folder on your PC: `AM-Lab-Media` in your home folder (`C:\Users\<you>\AM-Lab-Media` on Windows). Drop files there and run `python run-local.py`. Use ← / → to step through slides.
