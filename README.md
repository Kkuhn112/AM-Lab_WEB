# CU Denver — Additive Manufacturing Lab Display

A website for the AM Lab that works in two ways:

- **Lab display (Raspberry Pi + TV):** a full-screen split layout. The left half shows lab hours with a live open/closed status, the print-request QR code, and the printers. The right half plays exploded views, 3D models, videos and images.
- **Public website (GitHub Pages):** the same page. On phones and narrow windows it becomes a normal scrolling site.

It is plain HTML, CSS and JS with no build step. All libraries and fonts are vendored, so it runs **fully offline** on the Pi.

```
index.html            page structure
js/config.js          ← EDIT THIS: hours, QR link, printers, media playlist, notices
js/app.js             clock, hours logic, QR, printer grid, media player
js/exploded-demo.js   built-in animated SVG exploded view (hotend)
css/styles.css        styles
assets/printers/      printer photos
assets/media/         animations: .glb / .mp4 / .webm / images
kiosk/                Raspberry Pi kiosk scripts
vendor/, fonts/       model-viewer (Apache-2.0), qrcode-generator (MIT), Inter + Barlow Condensed (OFL)
```

## 1. Make it yours (edit `js/config.js`)

| What | Where in config |
|---|---|
| **Print form link**. The QR code is generated from it automatically. | `printForm.url` (currently a placeholder) |
| Weekly hours and holiday closures | `hours.weekly`, `hours.exceptions` |
| Printers: name, tech, build volume, materials, status | `printers` (the current entries are **samples**; replace them with the lab's real machines) |
| Right-half playlist | `media` |
| Bottom ticker notices | `announcements` |
| Room, email, logo | `lab` |

All times use the lab's timezone (`America/Denver`), so the open/closed status is correct no matter where the page is viewed from.

### Printer photos
Put photos in `assets/printers/` and point each printer's `image` to its file. For a professional look:
- Use **landscape** photos, about 1600×1200 px, in JPG or WebP format.
- Shoot against a plain, neutral backdrop with the machine centred and nothing in the lower third (the name and specs are overlaid there).
- Use the same angle and lighting for every machine so the grid looks consistent.

Until a photo is added, the card shows a "photo coming soon" placeholder. In kiosk mode six printers are shown at once. If the lab has more, the grid pages through them automatically (`printersPerPage`).

## 2. Animations on the right half

Each item in `media` plays in order, then the playlist loops. Items whose file is missing are skipped.

| `type` | Use for | Notes |
|---|---|---|
| `exploded-demo` | Built-in hotend exploded view | Needs no files. Lightweight SVG. |
| `model` | **Exploded-view animations from CAD** | A `.glb` file. Its first animation autoplays and the model slowly turntables. |
| `video` | Rendered animations, timelapses | Use `.mp4` (H.264) or `.webm`. Plays muted and advances when it ends. |
| `image` | Featured prints | Slow Ken Burns pan. |
| `iframe` | Any custom HTML animation | Use a local file in `assets/media/`. |

**Getting exploded views out of CAD**
- **Fusion:** animate the explode in the *Animation* workspace, then publish a video (**`video`**). Alternatively, export the model to Blender and animate it there.
- **SolidWorks:** use *Exploded View* plus an *Animation Wizard* (Explode). Then save it as an MP4, or export it as glTF with an add-in.
- **Blender:** keyframe each part's location, then use *File → Export → glTF 2.0 (.glb)* with *Animation* ticked.
- **Tip for `.glb`:** save the file with the parts in their **exploded** positions, so the camera frames the whole explode. If parts fly off-screen, increase the 3rd value of `cameraOrbit`, e.g. `"120deg 72deg 140%"`.
- **Raspberry Pi tip:** keep videos at 1080p and under about 20 Mbps, and keep `.glb` files under about 20 MB.

`assets/media/hotend-assembly.glb` is a sample animated assembly that shows the `model` type working.

Use **←/→** on a keyboard to step through slides while previewing.

## 3. Publish on GitHub Pages
1. Open repo **Settings → Pages** and choose *Deploy from a branch*. Set the branch to `main` and the folder to `/ (root)`.
2. The site will be live at `https://<user>.github.io/<repo>/`.
3. Add `?mode=kiosk` to force the TV layout, or `?mode=web` to force the normal scrolling page. Add `&orient=portrait` to preview the 9:16 layout.

## 4. Raspberry Pi display
Use a Pi 4 or 5 running Raspberry Pi OS (desktop), connected to a 1080p or 4K TV.

```bash
git clone https://github.com/Kkuhn112/AM-Lab_WEB.git ~/AM-Lab_WEB
```

```bash
bash ~/AM-Lab_WEB/kiosk/setup-pi.sh
```

```bash
sudo reboot
```

On boot, the Pi does the following:
- Serves the folder on `127.0.0.1:8080`. This is needed because browsers block loading 3D `.glb` files straight from disk.
- Opens Chromium full-screen in kiosk mode with the cursor hidden.
- Runs `git pull` every 10 minutes. The page reloads every hour (`kiosk.reloadMinutes`), so anything pushed to GitHub shows up on the TV automatically.

### Portrait (9:16) screens
The layout follows the screen's orientation automatically:
- **Portrait (9:16, e.g. 1080×1920):** animations fill the **top half**; hours, QR and printers fill the bottom half.
- **Landscape (16:9):** animations fill the right half; everything else is on the left.

To use a TV mounted on its side, rotate the Pi's output so that Chromium sees a tall screen. Open **Menu → Preferences → Screen Configuration**, right-click the display and choose **Orientation → Right** (or Left). To force a layout regardless of the screen, add `&orient=portrait` or `&orient=landscape` to the URL in `kiosk/start-kiosk.sh`.

Also set **raspi-config → Display → Screen Blanking → Off**, and set **Auto Login** to Desktop.

**Preview locally:** run `python3 -m http.server`, then open `http://localhost:8000/?mode=kiosk`. Opening `index.html` directly also works, except for `.glb` models.
