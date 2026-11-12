#!/usr/bin/env python3
"""
Google Calendar → data/schedule.js

Reads the lab-hours Google Calendar (its iCal / .ics address), expands
recurring events, and writes the open hours for each day into
data/schedule.js, which the website's timetable reads.

Calendar rules (see CALENDAR.md):
  • A timed event   = the lab is open for that time span. The title doesn't matter.
  • An all-day event = the lab is CLOSED that day. Its title becomes the
                       label, e.g. "Thanksgiving".

Usage
  GCAL_ICS_URL="https://calendar.google.com/…/basic.ics" python3 tools/gcal_to_schedule.py
  python3 tools/gcal_to_schedule.py --ics some-file.ics        (local file, for testing)

Requires:  pip install icalendar recurring-ical-events
"""
import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import icalendar
import recurring_ical_events

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "schedule.js"
PAST_DAYS = 14      # keep last two weeks (timetable shows the current week)
FUTURE_DAYS = 56    # and eight weeks ahead (for "opens Tuesday at…")


def load_calendar(args):
    if args.ics:
        return Path(args.ics).read_bytes()
    url = args.url or os.environ.get("GCAL_ICS_URL", "").strip()
    if not url:
        sys.exit("No calendar: set GCAL_ICS_URL or pass --ics FILE")
    url = re.sub(r"^webcal://", "https://", url)
    req = urllib.request.Request(url, headers={"User-Agent": "am-lab-display/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def hm(t: time) -> str:
    return f"{t.hour:02d}:{t.minute:02d}"


def merge(ranges):
    out = []
    for a, b in sorted(ranges):
        if out and a <= out[-1][1]:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def build(raw: bytes, tz: ZoneInfo, today: date):
    cal = icalendar.Calendar.from_ical(raw)
    if not any(c.name == "VEVENT" for c in cal.walk()):
        raise SystemExit("Calendar has no events at all — refusing to overwrite the schedule.")

    # Week-aligned window so the output only changes when the calendar does
    # (or once a week as the window slides), not every day.
    start = today - timedelta(days=PAST_DAYS)
    start -= timedelta(days=start.weekday())               # back to Monday
    end = start + timedelta(days=PAST_DAYS + FUTURE_DAYS + 6)
    open_ranges = {}   # iso -> [[minutes, minutes], ...]
    closed = {}        # iso -> label

    window_start = datetime.combine(start, time.min, tz)
    window_end = datetime.combine(end + timedelta(days=1), time.min, tz)
    for ev in recurring_ical_events.of(cal).between(window_start, window_end):
        if str(ev.get("STATUS", "")).upper() == "CANCELLED":
            continue
        title = str(ev.get("SUMMARY", "")).strip()
        s = ev.decoded("DTSTART")
        e = ev.decoded("DTEND") if ev.get("DTEND") else None

        if not isinstance(s, datetime):                     # all-day → closed
            last = (e - timedelta(days=1)) if isinstance(e, date) else s
            d = s
            while d <= last:
                if start <= d <= end:
                    closed[d.isoformat()] = title or "Closed"
                d += timedelta(days=1)
            continue

        if s.tzinfo is None:                                # floating time = lab time
            s = s.replace(tzinfo=tz)
        e = e or (s + timedelta(hours=1))
        if e.tzinfo is None:
            e = e.replace(tzinfo=tz)
        s, e = s.astimezone(tz), e.astimezone(tz)
        d = s.date()
        while d <= e.date():                                # split across midnight
            day_s = max(s, datetime.combine(d, time.min, tz))
            day_e = min(e, datetime.combine(d + timedelta(days=1), time.min, tz))
            a = day_s.hour * 60 + day_s.minute
            b = 24 * 60 if day_e.date() > d else day_e.hour * 60 + day_e.minute
            if b > a and start <= d <= end:
                open_ranges.setdefault(d.isoformat(), []).append([a, b])
            d += timedelta(days=1)

    days = {}
    for iso in sorted(set(open_ranges) | set(closed)):
        if iso in closed:
            days[iso] = {"closed": closed[iso]}
        else:
            to_hm = lambda m: "24:00" if m >= 1440 else f"{m // 60:02d}:{m % 60:02d}"
            days[iso] = {"open": [[to_hm(a), to_hm(b)] for a, b in merge(open_ranges[iso])]}
    return {"timezone": str(tz), "from": start.isoformat(), "to": end.isoformat(), "days": days}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ics", help="read a local .ics file instead of GCAL_ICS_URL")
    ap.add_argument("--url", help="calendar iCal address (default: $GCAL_ICS_URL)")
    ap.add_argument("--tz", default="America/Denver")
    ap.add_argument("--today", help="YYYY-MM-DD (testing)")
    ap.add_argument("--out", default=str(OUT))
    args = ap.parse_args()

    tz = ZoneInfo(args.tz)
    today = date.fromisoformat(args.today) if args.today else datetime.now(tz).date()
    data = build(load_calendar(args), tz, today)

    body = json.dumps(data, indent=1, ensure_ascii=False)
    text = ("/* AUTO-GENERATED from the lab-hours Google Calendar by tools/gcal_to_schedule.py.\n"
            "   Do not edit by hand — edit the calendar instead (see CALENDAR.md). */\n"
            f"window.LAB_SCHEDULE = {body};\n")
    out = Path(args.out)
    if out.exists() and out.read_text(encoding="utf-8") == text:
        print("schedule unchanged")
        return
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    print(f"wrote {out} — {len(data['days'])} days with hours or closures")


if __name__ == "__main__":
    main()
