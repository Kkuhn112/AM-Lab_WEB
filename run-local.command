#!/usr/bin/env bash
# Double-click (macOS) or run from a terminal to start the lab display locally.
# Pass options too, e.g.:  ./run-local.command --portrait
cd "$(dirname "$0")" && exec python3 run-local.py "$@"
