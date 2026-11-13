# Lab hours from Google Calendar

The timetable on the lab screen can be driven by a private Google Calendar. Edit the calendar, and the screen follows within about 10 minutes. The timetable looks exactly the same; only the source of the hours changes.

**Privacy:** the calendar is read **only by the lab Pi**.
- The calendar's secret link is stored on the Pi in `~/.config/am-lab/calendar-url`, readable only by the Pi's user. That file is outside the git repo and outside the folder the Pi's local web server serves.
- The link is never committed, pushed, or put on GitHub, and failed fetches never print it.
- The hours generated from it (`data/schedule.js`) stay on the Pi too; git ignores that file.

## How the calendar is read

| In Google Calendar | On the screen |
|---|---|
| **A timed event**, e.g. Mon 10:30–12:00 repeating weekly | An open block in the timetable. The event title doesn't matter. |
| **An all-day event** | The lab is **closed** that day. The event title is shown as the reason, e.g. "Thanksgiving". |
| A deleted or moved single occurrence of a repeating event | Handled: that day shows the change. |
| An event on Saturday or Sunday | A weekend column appears for that week automatically. |
| An event outside 9 AM–5 PM | The timetable stretches to fit it. |

Use a **dedicated calendar** for lab hours only: every timed event counts as open time.

## Setup

**1. Create the calendar** (in Google Calendar, on any computer)
- Go to *Other calendars* **+** → *Create new calendar*.
- Name it, e.g. "Lynx AM Lab Hours", and set the time zone to **(GMT-07:00) Mountain Time – Denver**.
- Add the regular hours as repeating events.
- Keep it **private**. There's no need to make it public.

**2. Copy its secret link**
- Open the calendar's *Settings and sharing* → *Integrate calendar*.
- Copy **"Secret address in iCal format"**.

**3. Give the link to the Pi.** On the Pi, run:

```bash
bash ~/AM-Lab_WEB/kiosk/set-calendar.sh
```

Paste the link and press Enter; the input is hidden. The script saves the link privately and fetches the calendar straight away.

`kiosk/setup-pi.sh` also offers to do this during first-time setup.

That's it. The Pi re-reads the calendar every 5 minutes, and the page refreshes its hours every 5 minutes.

## Managing it

| Task | How |
|---|---|
| Change the calendar link | Run `bash kiosk/set-calendar.sh` again. |
| Disconnect the calendar | Run `bash kiosk/set-calendar.sh --remove`. The screen goes back to `hours.weekly` in `js/config.js`. |
| Update right now | Run `bash kiosk/update-calendar.sh`. |
| See errors | `cat ~/.cache/am-lab/calendar.log` (successful runs only log when the hours changed). |
| Someone saw the link | In Google Calendar, use *Reset* next to the secret address, then run `set-calendar.sh` with the new link. |

## Good to know

- **Internet:** the Pi needs internet access to read the calendar. If the connection drops, the last hours it read stay on screen; they cover the next 8 weeks. For dates beyond what it has read, the screen falls back to `hours.weekly` in `js/config.js`.
- **The public website** (GitHub Pages, if you use it) cannot see the calendar. It shows `hours.weekly` from `js/config.js`.
- **Google's iCal feed** can lag a few minutes behind an edit.
