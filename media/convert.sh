#!/usr/bin/env bash
# Converts any video (Fusion/SolidWorks/Blender export, screen recording,
# phone clip…) to the display standard described in media/README.md:
#   1080 × 1080, H.264 MP4, 30 fps, no audio, background #0B0B0C.
# The whole picture is kept — anything that isn't square gets padded with
# the background colour, never cropped or stretched.
#
# Output goes to the top-panel media folder, ~/AM-Lab-Media (on this
# machine, not in the repo); set AMLAB_MEDIA_DIR to use another folder.
# The name you give becomes the title on screen; a leading number sets
# the play order.
#
#   bash media/convert.sh input.mov "02 Planetary gearbox"  → ~/AM-Lab-Media/02 Planetary gearbox.mp4
#   bash media/convert.sh input.mov                         → ~/AM-Lab-Media/input.mp4
#   SIZE=2160 bash media/convert.sh input.mov name          → 4K square (2160 × 2160)
#
# Needs ffmpeg  (Mac: brew install ffmpeg · Windows: winget install ffmpeg
#                · Linux/Pi: sudo apt install ffmpeg)
set -euo pipefail
[ $# -ge 1 ] || { sed -n '2,20p' "$0"; exit 1; }
IN="$1"
NAME="${2:-$(basename "${IN%.*}")}"
SIZE="${SIZE:-1080}"
OUT_DIR="${AMLAB_MEDIA_DIR:-$HOME/AM-Lab-Media}"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/${NAME%.mp4}.mp4"

ffmpeg -hide_banner -loglevel warning -stats -y -i "$IN" \
  -vf "scale=${SIZE}:${SIZE}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${SIZE}:${SIZE}:(ow-iw)/2:(oh-ih)/2:color=0x0B0B0C,fps=30,format=yuv420p" \
  -c:v libx264 -profile:v high -preset slow -crf 20 -maxrate 12M -bufsize 24M \
  -movflags +faststart -an "$OUT"

echo "✓ $OUT  ($(du -h "$OUT" | cut -f1))"
echo "  It will play on the display automatically (title: the filename)."
echo "  Caption (optional): put the text in \"${OUT%.mp4}.txt\""
