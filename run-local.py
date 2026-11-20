#!/usr/bin/env python3
"""
Run the lab display on your own computer, the same way the Raspberry Pi does.

  • serves this folder on http://127.0.0.1:8080 (like kiosk/start-kiosk.sh)
  • reads the lab-hours Google Calendar every 5 min, if connected
    (like kiosk/update-calendar.sh, same private link location)
  • serves the top-panel media from ~/AM-Lab-Media (on this machine, not GitHub)
  • opens the page in kiosk mode in a Chrome/Edge/Chromium app window
    shaped like the lab TV

Usage (Windows, macOS, Linux — needs Python 3.9+):
  python run-local.py                    TV layout picked from the window's shape, like the Pi
  python run-local.py --landscape        force the landscape TV (16:9)
  python run-local.py --portrait         force the portrait TV (9:16)
  python run-local.py --fullscreen       exactly like the Pi: full screen, no cursor (Alt+F4 / Cmd+Q to exit)
  python run-local.py --web              the normal website instead of the TV layout
  python run-local.py --set-calendar     connect the lab-hours calendar on this computer
  python run-local.py --help             all options

Or double-click run-local.bat (Windows) / run-local.command (macOS).
Press Ctrl+C in this window to stop. Edit files, then press F5 in the
display window to see the change.
"""
import argparse
import functools
import getpass
import http.server
import json
import os
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONF_DIR = Path(os.environ.get("AMLAB_CONFIG_DIR", Path.home() / ".config" / "am-lab"))
URL_FILE = CONF_DIR / "calendar-url"
CAL_SCRIPT = ROOT / "tools" / "gcal_to_schedule.py"
CAL_EVERY = int(os.environ.get("AMLAB_CAL_EVERY", 5 * 60))   # seconds
# Top-panel media lives here, on the machine — not in the repo / on GitHub.
MEDIA_DIR = Path(os.environ.get("AMLAB_MEDIA_DIR", Path.home() / "AM-Lab-Media"))
MEDIA_EXT = {".mp4", ".webm", ".mov", ".m4v", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif",
             ".glb", ".gltf", ".html", ".htm"}
MEDIA_URL = "/local-media/"
MEDIA_README = """AM LAB DISPLAY - TOP PANEL MEDIA
================================
Everything in this folder plays on the top/right panel of the lab screen.

  * Drop in videos (.mp4), images (.jpg/.png), or 3D models (.glb).
  * They play in filename order. Start names with numbers to set the order:
        01 Planetary gearbox.mp4
        02 Gyroid bracket.jpg
  * Videos and images zoom to fill the panel, centred. No title is shown.
  * For a title, add a .txt file with the same name. Line 1 = title,
    any further lines = caption:
        01 Planetary gearbox.txt   ->  Planetary gearbox
                                       MECH 3xxx final project
  * Delete a file to remove it. The screen picks up changes within 2 minutes.

Video standard: 1080 x 1080, MP4 (H.264), background #0B0B0C.
media/convert.sh in the website repo converts any video to it.

For full control (durations, uncropped "contain", built-ins), put a
playlist.js here - see media/README.md in the website repo.
"""


# ---------------------------------------------------------------- server
class Handler(http.server.SimpleHTTPRequestHandler):
    """Static files from the repo; never cached, so F5 always shows your edits."""
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".js": "text/javascript", ".mjs": "text/javascript",
                      ".glb": "model/gltf-binary", ".gltf": "model/gltf+json",
                      ".webm": "video/webm", ".mp4": "video/mp4", ".woff2": "font/woff2"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # /local-media/…  → files in MEDIA_DIR (outside the repo)
    # /local-media/index.json → what's in it, for the player
    def do_GET(self):
        if self.path.split("?")[0] == MEDIA_URL + "index.json":
            return self.send_media_index()
        return super().do_GET()

    def translate_path(self, path):
        clean = urllib.parse.unquote(path.split("?", 1)[0].split("#", 1)[0])
        if not clean.startswith(MEDIA_URL):
            return super().translate_path(path)
        parts = [p for p in clean[len(MEDIA_URL):].split("/") if p not in ("", ".", "..")]
        target = MEDIA_DIR.joinpath(*parts).resolve() if parts else MEDIA_DIR.resolve()
        base = MEDIA_DIR.resolve()
        if target != base and base not in target.parents:     # no escaping the folder
            return str(base / "__forbidden__")
        return str(target)

    def list_directory(self, path):                            # no folder listings
        self.send_error(404)
        return None

    def send_media_index(self):
        files, has_playlist = [], False
        if MEDIA_DIR.is_dir():
            has_playlist = (MEDIA_DIR / "playlist.js").is_file()
            for f in MEDIA_DIR.iterdir():
                if f.is_file() and not f.name.startswith((".", "~$")) and f.suffix.lower() in MEDIA_EXT:
                    cap = f.with_suffix(".txt")
                    caption = cap.read_text(encoding="utf-8", errors="replace").strip()[:400] if cap.is_file() else ""
                    files.append({"name": f.name, "caption": caption, "mtime": int(f.stat().st_mtime)})
        body = json.dumps({"files": files, "playlist": has_playlist}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        if len(args) > 1 and str(args[1])[0] in "45" and not self.path.startswith("/favicon"):
            print(f"  ! {args[1]} {self.path}")


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def start_server(port):
    handler = functools.partial(Handler, directory=str(ROOT))
    for p in range(port, port + 20):
        try:
            srv = Server(("127.0.0.1", p), handler)
        except OSError:
            continue
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        return srv, p
    sys.exit(f"No free port between {port} and {port + 19}.")


# ---------------------------------------------------------------- calendar
def set_calendar():
    print('Paste the calendar\'s "Secret address in iCal format"')
    print("(Google Calendar → calendar settings → Integrate calendar). Input is hidden.")
    url = "".join(getpass.getpass("Link: ").split())
    if not url.startswith(("https://", "webcal://")):
        sys.exit("That doesn't look like a calendar link (should start with https://).")
    CONF_DIR.mkdir(parents=True, exist_ok=True)
    URL_FILE.write_text(url + "\n", encoding="utf-8")
    try:
        os.chmod(URL_FILE, 0o600)
    except OSError:
        pass
    print(f"Saved to {URL_FILE} (only on this computer, never in the repo).")


def calendar_python():
    """The Python that has the calendar reader: the Pi's private venv
    (~/.local/share/am-lab/venv, made by setup-pi.sh) if present, else this one."""
    venv = Path(os.environ.get("AMLAB_VENV", Path.home() / ".local" / "share" / "am-lab" / "venv"))
    for exe in (venv / "bin" / "python3", venv / "Scripts" / "python.exe"):
        if exe.exists():
            return str(exe)
    return sys.executable


def calendar_deps_ok():
    r = subprocess.run([calendar_python(), "-I", "-c", "import icalendar, recurring_ical_events"],
                       capture_output=True)
    return r.returncode == 0


def fetch_calendar(quiet=True):
    url = URL_FILE.read_text(encoding="utf-8").strip()
    env = {**os.environ, "GCAL_ICS_URL": url}       # env, not argv: keeps it out of process lists
    args = [calendar_python(), "-I", str(CAL_SCRIPT), "--out", str(ROOT / "data" / "schedule.js")]
    if quiet:
        args.append("--quiet")
    r = subprocess.run(args, env=env, capture_output=True, text=True)
    for line in (r.stdout + r.stderr).strip().splitlines():
        print("  calendar:", line, flush=True)


def calendar_loop():
    """Every 5 min while the display runs. Checks for the link each time, so a
    calendar connected later (set-calendar) starts working without a restart."""
    while True:
        try:
            if URL_FILE.is_file():
                fetch_calendar()
        except Exception as e:                      # never let the loop die
            print(f"  calendar: {time.strftime('%Y-%m-%d %H:%M')} error: {type(e).__name__}", flush=True)
        time.sleep(CAL_EVERY)


# ---------------------------------------------------------------- browser
def find_browser():
    cands = []
    if sys.platform.startswith("win"):
        for base in (os.environ.get("PROGRAMFILES"), os.environ.get("PROGRAMFILES(X86)"), os.environ.get("LOCALAPPDATA")):
            if base:
                cands += [Path(base, "Google/Chrome/Application/chrome.exe"),
                          Path(base, "Microsoft/Edge/Application/msedge.exe"),
                          Path(base, "Chromium/Application/chrome.exe")]
    elif sys.platform == "darwin":
        cands += [Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
                  Path("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
                  Path("/Applications/Chromium.app/Contents/MacOS/Chromium")]
    for name in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "microsoft-edge"):
        w = shutil.which(name)
        if w:
            cands.append(Path(w))
    return next((str(c) for c in cands if c.exists()), None)


def open_display(url, size, fullscreen):
    exe = find_browser()
    if not exe:
        print("  Chrome/Edge/Chromium not found — opening your default browser instead.")
        print("  (Resize the window to the TV shape, or press F11 for full screen.)")
        webbrowser.open(url)
        return None
    profile = Path(tempfile.gettempdir()) / "am-lab-display-profile"   # separate profile: own window, own size
    args = [exe, f"--user-data-dir={profile}", "--no-first-run", "--no-default-browser-check",
            "--autoplay-policy=no-user-gesture-required", "--disable-session-crashed-bubble"]
    args += ["--kiosk", url] if fullscreen else [f"--app={url}", f"--window-size={size[0]},{size[1]}", "--window-position=40,40"]
    return subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--portrait", action="store_true", help="force the portrait TV (9:16)")
    ap.add_argument("--landscape", action="store_true", help="force the landscape TV (16:9)")
    ap.add_argument("--web", action="store_true", help="the normal website, not the TV layout")
    ap.add_argument("--fullscreen", action="store_true", help="full screen with hidden cursor, exactly like the Pi")
    ap.add_argument("--size", help="window size WxH, e.g. 1920x1080 (default fits a typical laptop screen)")
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--no-browser", action="store_true", help="only run the server")
    ap.add_argument("--no-calendar", action="store_true", help="ignore the calendar; use hours.weekly from js/config.js")
    ap.add_argument("--set-calendar", action="store_true", help="store the calendar link on this computer, then start")
    ap.add_argument("--remove-calendar", action="store_true", help="forget the calendar link and generated hours")
    a = ap.parse_args()

    if a.remove_calendar:
        URL_FILE.unlink(missing_ok=True)
        (ROOT / "data" / "schedule.js").unlink(missing_ok=True)
        print("Calendar disconnected on this computer.")
        return
    if a.set_calendar:
        set_calendar()

    if not MEDIA_DIR.exists():
        MEDIA_DIR.mkdir(parents=True, exist_ok=True)
        (MEDIA_DIR / "README.txt").write_text(MEDIA_README, encoding="utf-8")
    srv, port = start_server(a.port)
    if a.web:
        query, size = "?mode=web", (1280, 860)
    elif a.portrait:
        query, size = "?mode=kiosk&orient=portrait", (540, 960)   # 9:16, renders like 1080×1920
    elif a.landscape:
        query, size = "?mode=kiosk&orient=landscape", (1440, 810)  # 16:9, renders like 1920×1080
    else:
        query, size = "?mode=kiosk", (1440, 810)                   # orientation follows the window, like the Pi
    if not a.fullscreen and not a.web:
        query += "&cursor=show"                                    # Pi hides the cursor; keep it while testing
    if a.size:
        w, h = (int(v) for v in a.size.lower().split("x"))
        size = (w, h)
    url = f"http://127.0.0.1:{port}/index.html{query}"

    print(f"\nLynx AM Lab display — {time.strftime('%Y-%m-%d %H:%M')}\n  {url}\n", flush=True)
    if a.no_calendar:
        print("  hours:    hours.weekly from js/config.js (--no-calendar)")
    elif not calendar_deps_ok():
        print("  hours:    hours.weekly from js/config.js — calendar reader not installed:")
        print(f"            {Path(sys.executable).name} -m pip install icalendar recurring-ical-events")
    else:
        if URL_FILE.is_file():
            print("  hours:    Google Calendar, re-read every 5 min")
        else:
            print("  hours:    hours.weekly from js/config.js  (connect a calendar: --set-calendar;")
            print("            it's picked up within 5 min, no restart needed)")
        threading.Thread(target=calendar_loop, daemon=True).start()
    print(f"  media:    {MEDIA_DIR}   (drop files in; empty = media/playlist.js from the repo)")
    print("  stop:     Ctrl+C\n", flush=True)

    proc = None if a.no_browser else open_display(url, size, a.fullscreen)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping.")
    finally:
        if proc and proc.poll() is None:
            proc.terminate()
        srv.shutdown()


if __name__ == "__main__":
    main()
