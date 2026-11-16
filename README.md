# Lynx AM Lab Display — CU Denver Mechanical Engineering

A website for the AM Lab that works in two ways:

- **Lab display (Raspberry Pi + TV):** a full-screen split layout. One half shows the weekly hours timetable with a live open/closed line, the print-request QR code, and the printers. The other half plays exploded views, 3D models, videos and images.
- **Public website (GitHub Pages):** the same page. On phones and narrow windows it becomes a normal scrolling site.

It is plain HTML, CSS and JS with no build step. All libraries and fonts are vendored, so it runs **fully offline** on the Pi.

```
~/AM-Lab-Media/       ← ON THE PI (not in the repo): drop videos/images/3D models here for the top panel
media/                the video standard, convert.sh, editor guides, default playlist
js/config.js          ← EDIT THIS for the QR link, printers, fallback hours
CALENDAR.md           drive the hours timetable from a private Google Calendar (on the Pi)
tools/                gcal_to_schedule.py (calendar → data/schedule.js, generated on the Pi, never committed)
index.html, js/, css/ the page itself
assets/               printer photos, logos
kiosk/                Raspberry Pi kiosk scripts
vendor/, fonts/       model-viewer (Apache-2.0), qrcode-generator (MIT), Inter (OFL)
```

## 1. Make it yours (edit `js/config.js`)

| What | Where in config |
|---|---|
| **Print form link**. The QR code is generated from it automatically. | `printForm.url` (**still a placeholder**) |
| Hours: a private **Google Calendar** read by the Pi ([CALENDAR.md](CALENDAR.md)), or fixed weekly hours | `hours.weekly`, `hours.gridStart/gridEnd` |
| Printers: name, count, build volume, short note | `printers` |
| Location, email, logos | `lab` |

All times use the lab's timezone (`America/Denver`), so the open/closed status is correct no matter where the page is viewed from.

### Printer photos
Photos are square JPGs on a white background in `assets/printers/`. The current ones come from the lab's existing site. To add one (e.g. the Fiber Seeker), crop the machine tightly, then centre it on a white square of about 1000×1000 px with a small margin. Point the printer's `image` to the file.

On 16:9 screens with an odd number of printers, the first printer gets a large feature tile and the rest fill a 2-row grid beside it. On 9:16 screens they sit in one row.

## Test it on your computer (same as the Pi)

`run-local.py` runs the display the way the Pi does. It serves the folder locally, reads the calendar every 5 minutes if one is connected, and opens kiosk mode in a Chrome/Edge window shaped like the TV. It needs only Python 3.9+ and works on Windows, macOS and Linux.

| Do | Windows | macOS / Linux |
|---|---|---|
| TV layout (orientation follows the window, like the Pi) | double-click `run-local.bat` | double-click `run-local.command`, or `python3 run-local.py` |
| Force landscape (16:9) or portrait (9:16) | `run-local.bat --landscape` / `--portrait` | `python3 run-local.py --landscape` / `--portrait` |
| Exactly like the Pi (full screen, no cursor) | `--fullscreen` (exit with Alt+F4) | `--fullscreen` (exit with Cmd+Q) |
| Normal website | `--web` | `--web` |
| Connect the calendar on this PC | `--set-calendar` | `--set-calendar` |

- Put test media in `AM-Lab-Media` in your home folder (the same as on the Pi). It's picked up within 2 minutes; for `js/config.js` edits, press **F5** in the display window. Use **← / →** to step through slides. Stop with **Ctrl+C** in the terminal.
- For calendar hours, install the reader once with `python -m pip install icalendar recurring-ical-events`, then run with `--set-calendar`. The link is stored in `~/.config/am-lab/calendar-url` on your PC, never in the repo.
- Whatever size or shape the window is (a VM, a small laptop screen), the page draws an exact 16:9 or 9:16 TV scaled to fit, with black bars around any leftover space. So the preview is always what the real TV will show. Use `--size 1920x1080` for full size.
- If Chrome, Edge or Chromium isn't installed, it opens your default browser instead.

## 2. The dynamic half (videos, exploded views, anything)

Media is stored **on the Pi**, not on GitHub. Drop files into **`~/AM-Lab-Media`** and they play in filename order, zoomed to fill the panel (centred, no black bars) with no title. An optional same-named `.txt` file adds one: line 1 is the title, the rest is a caption. The screen picks up changes within 2 minutes. Copy files in with a USB stick, or over the network with WinSCP or `scp`. Add a `playlist.js` to that folder for full control.

**Video standard:** 1080 × 1080 square, MP4 (H.264), 30 fps, background #0B0B0C. Keep the subject centred and 60 px clear of the edges. `media/convert.sh` turns any video into this format and saves it straight into `~/AM-Lab-Media`. Full details are in **[media/README.md](media/README.md)**.

## 3. Publish on GitHub Pages (optional)
The Pi does not need this. A public copy shows the fixed `hours.weekly` from `js/config.js`, because the calendar is only read on the Pi.

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
- Reads the lab-hours Google Calendar every 5 minutes, if one is connected. `setup-pi.sh` offers to connect it; to connect it later, run `bash kiosk/set-calendar.sh`. The calendar link is stored only on the Pi. See [CALENDAR.md](CALENDAR.md).

### Portrait (9:16) screens
The layout follows the screen's orientation automatically:
- **Portrait (9:16, e.g. 1080×1920):** animations fill the **top half**; hours, QR and printers fill the bottom half.
- **Landscape (16:9):** animations fill the right half; everything else is on the left.

To use a TV mounted on its side, rotate the Pi's output so that Chromium sees a tall screen. Open **Menu → Preferences → Screen Configuration**, right-click the display and choose **Orientation → Right** (or Left). To force a layout regardless of the screen, add `&orient=portrait` or `&orient=landscape` to the URL in `kiosk/start-kiosk.sh`.

Also set **raspi-config → Display → Screen Blanking → Off**, and set **Auto Login** to Desktop.

**Preview locally:** run `python3 -m http.server`, then open `http://localhost:8000/?mode=kiosk`. Opening `index.html` directly also works, except for `.glb` models.
