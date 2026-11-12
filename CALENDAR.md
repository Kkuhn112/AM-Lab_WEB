# Lab hours from Google Calendar

The timetable on the website and lab screen can be driven by a Google Calendar. Edit the calendar, and the website follows. The timetable looks exactly the same; only the source of the hours changes.

## How the calendar is read

| In Google Calendar | On the website |
|---|---|
| **A timed event**, e.g. Mon 10:30–12:00 repeating weekly | An open block in the timetable. The event title doesn't matter. |
| **An all-day event** | The lab is **closed** that day. The event title is shown as the reason, e.g. "Thanksgiving". |
| A deleted or moved single occurrence of a repeating event | Handled: that day shows the change. |
| An event on Saturday or Sunday | A weekend column appears for that week automatically. |
| An event outside 9 AM–5 PM | The timetable stretches to fit it. |

Use a **dedicated calendar** for lab hours only: every timed event counts as open time.

## One-time setup (about 5 minutes)

**1. Create the calendar**
- In Google Calendar, go to *Other calendars* **+** → *Create new calendar*.
- Name it, e.g. "Lynx AM Lab Hours", and set the time zone to **(GMT-07:00) Mountain Time – Denver**.
- Add the regular hours as repeating events, e.g. "Open", Mon & Wed 10:30–12:00, repeating weekly.

**2. Copy the calendar's iCal address**
- Open the calendar's *Settings and sharing* → *Integrate calendar*.
- Copy **"Secret address in iCal format"**. This keeps the calendar private: only the website can read it.
- If the calendar is public, the "Public address in iCal format" works too.

**3. Give the address to GitHub**
- In the GitHub repo, go to *Settings* → *Secrets and variables* → *Actions* → *New repository secret*.
- Name: `GCAL_ICS_URL`
- Secret: paste the address.

**4. Run it once**
- On the repo's *Actions* tab, choose *Sync lab hours from Google Calendar* → *Run workflow*.
- About a minute later `data/schedule.js` is updated, and the website shows the calendar's hours.

That's it. From then on, the workflow checks the calendar every 15 minutes.

## How fast do changes show up?

| Step | Time |
|---|---|
| GitHub checks the calendar | every 15 min (GitHub sometimes runs a few minutes late) |
| The lab Pi pulls from GitHub | every 10 min |
| The page re-reads the hours | every 5 min |

Changes usually appear within 30 minutes. To show one right away, use *Run workflow* on the Actions tab. Google's iCal feed can itself lag a few minutes behind your edit.

## Good to know

- **The workflow only runs on the repo's default branch (`main`).**
- **Fallback:** if the calendar is unreachable, the last good schedule stays in place. For dates the calendar data doesn't cover, the site falls back to `hours.weekly` in `js/config.js`. If nothing is connected, it simply uses `hours.weekly`.
- **Inactivity:** GitHub pauses scheduled workflows in a public repo after 60 days with no commits, and sends an email first. Re-enable it on the Actions tab with one click. Any calendar change that gets committed counts as activity.
- **Testing on your own computer:**

  ```bash
  pip install icalendar recurring-ical-events
  ```

  ```bash
  GCAL_ICS_URL="https://calendar.google.com/…/basic.ics" python3 tools/gcal_to_schedule.py
  ```
