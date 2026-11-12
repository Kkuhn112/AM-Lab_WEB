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

echo "• Scheduling git pull every 10 minutes…"
( crontab -l 2>/dev/null | grep -v 'am-lab-update' ; \
  echo "*/10 * * * * $SITE_DIR/kiosk/update.sh # am-lab-update" ) | crontab -

echo
echo "Done. Also recommended: raspi-config → Display → Screen Blanking → Off,"
echo "and System → Auto Login → Desktop. Reboot to start the display."
