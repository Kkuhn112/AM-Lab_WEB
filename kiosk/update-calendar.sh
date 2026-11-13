#!/usr/bin/env bash
# Pulls the lab-hours calendar and writes data/schedule.js (untracked).
# Run by cron every 5 minutes; does nothing if no calendar is connected.
# If the fetch fails, the previous schedule stays in place.
set -euo pipefail
SITE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONF_DIR="${AMLAB_CONFIG_DIR:-$HOME/.config/am-lab}"
VENV="${AMLAB_VENV:-$HOME/.local/share/am-lab/venv}"
URL_FILE="$CONF_DIR/calendar-url"

[ -s "$URL_FILE" ] || exit 0
# Passed via the environment, not the command line, so it never shows up in `ps`.
GCAL_ICS_URL="$(head -n1 "$URL_FILE")" \
  "$VENV/bin/python3" -I "$SITE_DIR/tools/gcal_to_schedule.py" --out "$SITE_DIR/data/schedule.js" --quiet
