# Milk's Backer Tracker

Everything you back on Kickstarter, Gamefound, BackerKit, Indiegogo and friends, from "ooh, that looks cool" to "it's on my porch".

- **Home**: live countdowns for campaigns you're watching or backed, soonest first (red under a day, orange under three).
  **Needs you** asks about campaigns that ended ("Did you back it?", "Did it fund?"), counts down pledge manager lock dates and
  flags an unfinished survey or address and money still owed. Also **Coming up** (launches, pledge managers opening),
  **On its way** (with tracking) and **Running late**.
- **The journey**: Watching → Backed → Funded → Pledge manager → In production → On the boat → Shipping to me → Delivered,
  plus Passed / Not funded / Cancelled / Refunded. Each step is dated (editable, so old backings can be entered properly),
  with undo. There's a late-pledge flag.
- **Money**: the pledge, add-ons, shipping, tax/VAT and other lines, each paid or not, in the project's own currency. Funding marks the
  pledge paid. **Stats** shows pledged / paid / still to pay per year (backed date) and currency, plus breakdowns by category and platform.
- **Lateness**: the first delivery estimate is remembered; changing it logs a delay (with a note). Badges show "8 months late".
- **Pledge manager card**: service, link, open and lock dates, survey done, address confirmed.
- **Reminders, kept light**: "Add to calendar" (.ics with one alert) on any countdown, or all at once in Settings. Optional phone
  notifications, one per deadline, only for things you're *watching* plus pledge manager locks. They fire while the app is open
  or the next time it's opened, because offline web apps can't wake themselves. Mute any project.
  The Home Screen icon gets a badge count where supported.
- **Categories & tags**: editable categories with emoji, free-form tags, filters and search.
- **Share**: copy a message with an `MBT:` code; the friend pastes it with "Paste a shared project". Money, notes and
  pictures are never included.
- **Adding**: paste a campaign link and the platform, name and creator are read from the address. The campaign pages themselves
  can't be read by an offline app (no public API, and CORS blocks it).

Everything stays on the device (IndexedDB). It works offline once opened and installs to the Home Screen.
Settings → Export backup moves everything to another device.

## Develop

```
npm.cmd install
npm.cmd run dev      # http://localhost:5173
npm.cmd test         # stages, deadlines, lateness, money, share code, backup and calendar tests
npm.cmd run build    # svelte-check + production build into dist/
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`
(one-time setup: repo Settings → Pages → Source: "GitHub Actions").
