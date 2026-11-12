#!/usr/bin/env bash
# Launches the AM Lab display full-screen on a Raspberry Pi.
# Serves the site on localhost (3D .glb models can't load over file://)
# then opens Chromium in kiosk mode.
set -u
SITE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${AMLAB_PORT:-8080}"

# Local web server (only reachable from the Pi itself)
if ! curl -fs "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$SITE_DIR" >/dev/null 2>&1 &
  for _ in $(seq 1 20); do curl -fs "http://127.0.0.1:${PORT}/" >/dev/null 2>&1 && break; sleep 0.5; done
fi

# Keep the screen awake (X11; harmless elsewhere)
command -v xset >/dev/null && { xset s off; xset -dpms; xset s noblank; } 2>/dev/null

BROWSER="$(command -v chromium || command -v chromium-browser)"
# Clear the "Chromium didn't shut down correctly" bubble after power loss
PREFS="$HOME/.config/chromium/Default/Preferences"
[ -f "$PREFS" ] && sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/; s/"exited_cleanly":false/"exited_cleanly":true/' "$PREFS"

exec "$BROWSER" \
  --kiosk --noerrdialogs --disable-infobars --no-first-run \
  --disable-session-crashed-bubble --disable-translate \
  --check-for-update-interval=31536000 --autoplay-policy=no-user-gesture-required \
  --ozone-platform-hint=auto --enable-gpu-rasterization --ignore-gpu-blocklist \
  "http://127.0.0.1:${PORT}/index.html?mode=kiosk"
