# Kindle Dashboard

Finn's interactive e-ink home dashboard for a jailbroken Kindle Paperwhite (11th gen).

- `index.html` – the touch dashboard (landscape, 4 boxes, tap to open). Lives at https://lilmac2011.github.io/kindle-dashboard/
- `config.js` – address of the Google script the page talks to
- `apps-script/Code.gs` – Google Apps Script web app: serves `Data!A1` of the "Kindle Dashboard" sheet and saves taps to the `Actions` tab
- `kual/kindledash/` – KUAL launcher: copy into the Kindle's `extensions` folder. "Open dashboard (stay awake)" keeps the screen on and opens the page.

An hourly Claude check-in reads Gmail + Calendar, carries out the queued taps (replies become Gmail drafts), and rewrites `Data!A1`.
