# Converting videos for the lab display

The display runs in the Chromium web browser, which plays far fewer video formats than a desktop player like VLC. A video that plays fine on your computer, or even on the Pi's desktop, can be **skipped by the display** if its encoding isn't one Chromium supports. This guide shows how to check a video and convert it into a format that always works.

**Short version:** run every video through the converter, then copy the result into `AM-Lab-Media`.

---

## 1. What "acceptable" means

| | Must be | Why |
|---|---|---|
| **Video codec** | **H.264** (also called AVC, x264) | Chromium on the Pi doesn't play HEVC/H.265 or ProRes. |
| **Pixel format** | **8-bit 4:2:0** (`yuv420p`) | 10-bit ("High 10", HDR) and 4:2:2 video won't play, even as H.264. |
| **Container** | **`.mp4`** | `.mkv` and `.avi` are ignored; `.mov` only works if it contains H.264. |
| **Size** | **1080 × 1080** (square) recommended | The display zooms every video to fill its panel, centred, so other sizes work too, but 4K is too heavy for a Pi to decode smoothly. |
| **Frame rate** | 30 fps | 60 fps doubles the work for no visible benefit. |
| **Audio** | None needed | The display is always muted. |

The converter below produces exactly this.

**Framing:** the display crops whatever doesn't fit its panel, so keep the subject **in the centre** and away from the edges. A 1080 × 1080 video loses only 60 px on two sides. A 16:9 video loses about half its width, keeping the middle.

---

## 2. Check a video

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,profile,pix_fmt,width,height -of default=nw=1 "my video.mp4"
```

**Good (plays as-is):**
```
codec_name=h264
pix_fmt=yuv420p
```

**Needs converting:** anything else, for example:
```
codec_name=hevc            ← phones, newer exports
profile=Main 10 / High 10  ← 10-bit
pix_fmt=yuv420p10le        ← 10-bit
pix_fmt=yuv422p            ← editing / camera formats
codec_name=prores          ← Mac / editing software
codec_name=mpeg4           ← old AVI exports
```

When in doubt, convert. It's quick and never hurts.

---

## 3. Install ffmpeg (once)

`ffmpeg` does the conversion (and includes `ffprobe` for checking).

| Computer | Command |
|---|---|
| **Raspberry Pi / Linux** | `sudo apt install -y ffmpeg` |
| **Mac** | `brew install ffmpeg` (needs [Homebrew](https://brew.sh)) |
| **Windows** | `winget install ffmpeg` in PowerShell, then close and reopen PowerShell |

Check that it worked:
```bash
ffmpeg -version
```

---

## 4. Convert

### Option A: the converter script (Pi, Mac, Linux, or Windows Git Bash)

From the website folder (`AM-Lab_WEB`):

```bash
bash media/convert.sh "path/to/original video.mov" "01 Gearbox exploded view"
```

- The output, `01 Gearbox exploded view.mp4`, goes **straight into `AM-Lab-Media`** in your home folder.
- The **leading number sets the play order** on the display; the name itself isn't shown.
- Non-square video is **zoomed to fill and centred**, the same way the display shows it.

Variations:

| Need | Command |
|---|---|
| Keep the whole picture (bars instead of cropping) | `PAD=1 bash media/convert.sh "in.mov" "01 Name"` |
| 4K screen (2160 × 2160) | `SIZE=2160 bash media/convert.sh "in.mov" "01 Name"` |
| Save somewhere else | `AMLAB_MEDIA_DIR=~/Desktop bash media/convert.sh "in.mov" "01 Name"` |

On Windows, run this from **Git Bash** (installed with Git for Windows), not PowerShell.

### Option B: one ffmpeg command (any computer, including Windows PowerShell)

This does exactly what the script does. Change the two file names:

```bash
ffmpeg -i "original video.mov" -vf "scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,fps=30,format=yuv420p" -c:v libx264 -profile:v high -preset slow -crf 20 -maxrate 12M -bufsize 24M -movflags +faststart -an "01 My video.mp4"
```

What each part does, if you want to adjust it:

| Part | Effect |
|---|---|
| `scale=…increase,crop=1080:1080` | Zoom to fill a 1080 × 1080 square, centred, cropping the overflow |
| `fps=30` | 30 frames per second |
| `format=yuv420p` | 8-bit 4:2:0, the pixel format Chromium needs |
| `-c:v libx264 -profile:v high` | H.264 video |
| `-crf 20` | Quality. Lower is better and bigger; 18–23 is sensible. |
| `-maxrate 12M -bufsize 24M` | Caps the bitrate so the Pi never stutters |
| `-movflags +faststart` | Puts the index at the start of the file, so playback begins instantly |
| `-an` | Removes the audio |

To pad instead of crop, replace the `-vf` part with:
`"scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=0x0B0B0C,fps=30,format=yuv420p"`

### Option C: HandBrake (no command line)

[HandBrake](https://handbrake.fr) is a free app for Windows, Mac and Linux.

1. Open your video in HandBrake.
2. **Preset:** *General → Fast 1080p30*.
3. **Summary tab:** Format **MP4**, and tick **Web Optimized**.
4. **Video tab:** Video Encoder **H.264 (x264)**, Framerate **30**, **Constant Framerate**.
5. **Audio tab:** remove the audio tracks (optional; the display is muted anyway).
6. Name the file with its order number (e.g. `01 Gearbox exploded view.mp4`), then click **Start Encode**.

HandBrake keeps the original shape (e.g. 16:9). That's fine; the display zooms it to fill and centres it.

---

## 5. Avoid converting: export it right the first time

| Source | Setting |
|---|---|
| **iPhone** | *Settings → Camera → Formats → **Most Compatible***. It records H.264 instead of HEVC. Turn off *HDR Video* too. |
| **Android** | In the camera's video settings, turn off **HEVC / High-efficiency video** and **HDR10+**. Exact names vary by phone. |
| **SolidWorks** | Set the background to plain black, then *Save Animation* as MP4 or AVI. SolidWorks' encoders vary, so **always run its output through the converter**. |
| **Fusion** | In the *Animation* workspace, use *Publish Video* with a custom size of **1080 × 1080**. Run the result through the converter to be safe. |
| **Blender** | *Output Properties:* resolution **1080 × 1080**, frame rate **30**. *File Format:* **FFmpeg Video**. *Container:* **MPEG-4**. *Video Codec:* **H.264**. *Audio Codec:* **No Audio**. This plays without conversion. |
| **OBS / screen recorders** | Recording format **MP4** (or record MKV and remux to MP4), encoder **x264** or **NVENC H.264** (not HEVC or AV1), color format **NV12**. |

---

## Photos (iPhone HEIC)

JPG, PNG and WebP photos need no conversion; drop them in as they are. iPhones save **`.heic`** by default, which the display can't show. Convert to JPG:

| On | How |
|---|---|
| **The iPhone (going forward)** | *Settings → Camera → Formats → **Most Compatible***. New photos are saved as JPG. |
| **The Pi / Linux** | `sudo apt install -y libheif-examples`, then `heif-convert "IMG_1234.HEIC" "01 Bracket.jpg"` |
| **Mac** | Open in Preview → *File → Export* → Format **JPEG**. Or in Terminal: `sips -s format jpeg "IMG_1234.HEIC" --out "01 Bracket.jpg"` |
| **Windows** | Open in the Photos app → *… → Save as* → choose **.jpg**. |

Sending a photo from the iPhone by email or AirDrop to a PC often converts it to JPG automatically.

## 6. Put it on the display

Copy the converted `.mp4` into **`AM-Lab-Media`** on the Pi, using WinSCP, `scp`, or a USB stick (see [README.md](README.md#getting-files-onto-the-pi)). It plays within about 30 seconds, with no restart, filling the panel with no title.

For an optional title, add a `.txt` file with the same name. Its first line is the title and any further lines are the caption.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Plays in VLC but not on the display | It's not H.264 / 8-bit. Convert it (section 4). |
| `ffmpeg: command not found` | Install it (section 3). On Windows, reopen PowerShell after installing. |
| `bash: media/convert.sh: No such file` | Run it from inside the `AM-Lab_WEB` folder, or give the full path, e.g. `bash ~/AM-Lab_WEB/media/convert.sh`. |
| The important part is cropped off | Re-export with the subject centred, or convert with `PAD=1`. |
| Stutters on the display | Make sure it's 1080 × 1080 at 30 fps, not 4K or 60 fps. Converting fixes both. |
| A photo doesn't appear | It's probably `.heic`. Convert it to JPG (see *Photos* above). |
| Converted file still doesn't appear | It must be directly inside `AM-Lab-Media` (not a subfolder) and end in `.mp4`. Windows can hide a double extension like `video.mp4.mov`. |
