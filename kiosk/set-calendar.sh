#!/usr/bin/env bash
# Stores the lab-hours Google Calendar link ON THIS PI ONLY.
#
#   bash kiosk/set-calendar.sh          (asks for the link; input is hidden)
#   bash kiosk/set-calendar.sh --remove (disconnect; falls back to config.js hours)
#
# The link is saved in ~/.config/am-lab/calendar-url with owner-only
# permissions — outside the git repo and outside the folder the local web
# server serves, so it is never committed, pushed, or served.
set -euo pipefail
SITE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONF_DIR="${AMLAB_CONFIG_DIR:-$HOME/.config/am-lab}"
URL_FILE="$CONF_DIR/calendar-url"

if [ "${1:-}" = "--remove" ]; then
  rm -f "$URL_FILE" "$SITE_DIR/data/schedule.js"
  echo "Calendar disconnected. The display now uses hours.weekly from js/config.js."
  exit 0
fi

echo "Paste the calendar's \"Secret address in iCal format\""
echo "(Google Calendar → calendar settings → Integrate calendar), then press Enter:"
read -rs URL; echo
URL="$(printf '%s' "$URL" | tr -d '[:space:]')"
case "$URL" in
  https://*|webcal://*) ;;
  *) echo "That doesn't look like a calendar link (should start with https://)." >&2; exit 1 ;;
esac

umask 077
mkdir -p "$CONF_DIR"
printf '%s\n' "$URL" > "$URL_FILE"
chmod 600 "$URL_FILE"
echo "Saved to $URL_FILE (readable only by $(whoami))."

echo "Fetching the calendar now…"
"$SITE_DIR/kiosk/update-calendar.sh" && echo "✓ Hours updated from the calendar."
