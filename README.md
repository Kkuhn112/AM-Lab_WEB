# Lynx AM Lab Display — CU Denver Mechanical Engineering

A website for the AM Lab that works in two ways:

- **Lab display (Raspberry Pi + TV):** a full-screen split layout. One half shows the weekly hours timetable with a live open/closed line, the print-request QR code, and the printers. The other half plays exploded views, 3D models, videos and images.
- **Public website (GitHub Pages):** the same page. On phones and narrow windows it becomes a normal scrolling site.

It is plain HTML, CSS and JS with no build step. All libraries and fonts are vendored, so it runs **fully offline** on the Pi.

```
media/playlist.js     ← EDIT THIS to change what plays on the screen (see media/README.md)
media/                videos, images, 3D models + the video standard, guides, convert.sh
js/config.js          ← EDIT THIS for the QR link, printers, fallback hours
CALENDAR.md           drive the hours timetable from a Google Calendar
data/schedule.js      generated from the calendar by .github/workflows/calendar-sync.yml
tools/                gcal_to_schedule.py (calendar → data/schedule.js)
index.html, js/, css/ the page itself
assets/               printer photos, logos
kiosk/                Raspberry Pi kiosk scripts
vendor/, fonts/       model-viewer (Apache-2.0), qrcode-generator (MIT), Inter (OFL)
```

## 1. Make it yours (edit `js/config.js`)

| What | Where in config |
|---|---|
| **Print form link**. The QR code is generated from it automatically. | `printForm.url` (**still a placeholder**) |
| Hours: use a **Google Calendar** ([CALENDAR.md](CALENDAR.md)), or fixed weekly hours | `hours.weekly`, `hours.gridStart/gridEnd` |
| Printers: name, count, build volume, short note | `printers` |
| Location, email, logos | `lab` |

All times use the lab's timezone (`America/Denver`), so the open/closed status is correct no matter where the page is viewed from.

### Printer photos
Photos are square JPGs on a white background in `assets/printers/`. The current ones come from the lab's existing site. To add one (e.g. the Fiber Seeker), crop the machine tightly, then centre it on a white square of about 1000×1000 px with a small margin. Point the printer's `image` to the file.

On 16:9 screens with an odd number of printers, the first printer gets a large feature tile and the rest fill a 2-row grid beside it. On 9:16 screens they sit in one row.

## 2. The dynamic half (videos, exploded views, anything)

It is edited in one place, **[`media/playlist.js`](media/playlist.js)**, which is separate from the rest of the site. Drop a file into `media/` and add one line to the playlist. It can be a video, image, `.glb` 3D model, HTML animation or YouTube link.

**Video standard:** 1080 × 1080 square, MP4 (H.264), 30 fps, background #0B0B0C. Keep 60 px clear around the edges, and keep the bottom 25 % clear when the slide has a title. `media/convert.sh` turns any video into this format. Full details, editor guides and CAD export tips are in **[media/README.md](media/README.md)**.

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
