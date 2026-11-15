#!/usr/bin/env python3
"""
Run the lab display on your own computer, the same way the Raspberry Pi does.

  • serves this folder on http://127.0.0.1:8080 (like kiosk/start-kiosk.sh)
  • reads the lab-hours Google Calendar every 5 min, if connected
    (like kiosk/update-calendar.sh, same private link location)
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
import os
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONF_DIR = Path(os.environ.get("AMLAB_CONFIG_DIR", Path.home() / ".config" / "am-lab"))
URL_FILE = CONF_DIR / "calendar-url"
CAL_SCRIPT = ROOT / "tools" / "gcal_to_schedule.py"
CAL_EVERY = 5 * 60


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


def calendar_deps_ok():
    try:
        import icalendar, recurring_ical_events  # noqa: F401
        return True
    except ImportError:
        return False


def fetch_calendar(quiet=True):
    url = URL_FILE.read_text(encoding="utf-8").strip()
    env = {**os.environ, "GCAL_ICS_URL": url}       # env, not argv: keeps it out of process lists
    args = [sys.executable, "-I", str(CAL_SCRIPT), "--out", str(ROOT / "data" / "schedule.js")]
    if quiet:
        args.append("--quiet")
    r = subprocess.run(args, env=env, capture_output=True, text=True)
    for line in (r.stdout + r.stderr).strip().splitlines():
        print("  calendar:", line)


def calendar_loop():
    while True:
        fetch_calendar()
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

    print(f"\nLynx AM Lab display — local test\n  {url}\n")
    if a.no_calendar:
        print("  hours:    hours.weekly from js/config.js (--no-calendar)")
    elif not URL_FILE.exists():
        print("  hours:    hours.weekly from js/config.js  (connect a calendar: --set-calendar)")
    elif not calendar_deps_ok():
        print("  hours:    hours.weekly from js/config.js — calendar reader not installed:")
        print(f"            {Path(sys.executable).name} -m pip install icalendar recurring-ical-events")
    else:
        print("  hours:    Google Calendar, re-read every 5 min")
        threading.Thread(target=calendar_loop, daemon=True).start()
    print("  playlist: media/playlist.js   (edit, then press F5 in the display window)")
    print("  stop:     Ctrl+C\n")

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
