#!/usr/bin/env bash
# One-time setup on a Raspberry Pi (Raspberry Pi OS with desktop).
# Run from inside the cloned repo:   bash kiosk/setup-pi.sh
set -euo pipefail
SITE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
chmod +x "$SITE_DIR"/kiosk/*.sh

echo "• Installing Chromium (if missing)…"
if ! command -v chromium >/dev/null && ! command -v chromium-browser >/dev/null; then
  sudo apt-get update && (sudo apt-get install -y chromium || sudo apt-get install -y chromium-browser)
fi

echo "• Adding desktop autostart entry…"
mkdir -p "$HOME/.config/autostart"
cat > "$HOME/.config/autostart/am-lab-kiosk.desktop" <<DESK
[Desktop Entry]
Type=Application
Name=AM Lab Display
Exec=$SITE_DIR/kiosk/start-kiosk.sh
X-GNOME-Autostart-enabled=true
DESK

echo "• Installing the calendar reader (Python venv, outside the repo)…"
VENV="$HOME/.local/share/am-lab/venv"
if ! python3 -m venv --help >/dev/null 2>&1; then sudo apt-get install -y python3-venv; fi
[ -x "$VENV/bin/python3" ] || python3 -m venv "$VENV"
"$VENV/bin/pip" install --quiet --upgrade icalendar recurring-ical-events

echo "• Scheduling: git pull every 10 min, calendar every 5 min…"
LOG_DIR="$HOME/.cache/am-lab"; mkdir -p "$LOG_DIR"
( crontab -l 2>/dev/null | grep -v -e 'am-lab-update' -e 'am-lab-calendar' ; \
  echo "*/10 * * * * $SITE_DIR/kiosk/update.sh # am-lab-update" ; \
  echo "*/5 * * * * $SITE_DIR/kiosk/update-calendar.sh >>$LOG_DIR/calendar.log 2>&1 # am-lab-calendar" ) | crontab -

if [ ! -s "$HOME/.config/am-lab/calendar-url" ]; then
  echo
  read -rp "Connect the lab-hours Google Calendar now? [y/N] " yn
  case "$yn" in [Yy]*) "$SITE_DIR/kiosk/set-calendar.sh" ;; *) echo "  (later: bash kiosk/set-calendar.sh)";; esac
fi

echo
echo "Done. Also recommended: raspi-config → Display → Screen Blanking → Off,"
echo "and System → Auto Login → Desktop. Reboot to start the display."
