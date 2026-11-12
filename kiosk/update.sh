#!/usr/bin/env bash
# Pulls the latest site from GitHub. The page reloads itself every
# `kiosk.reloadMinutes` (config.js), so changes appear automatically.
cd "$(dirname "$0")/.." && git pull --ff-only --quiet
