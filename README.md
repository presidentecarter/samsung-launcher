# samsung-launcher

A custom home-screen launcher for Samsung Smart TVs (Tizen OS). Sideloaded as
a signed developer web app — no root, no firmware changes, and **all native
apps and their logins keep working normally** (Dropout, Disney+, YouTube,
YouTube TV, Max, Apple TV, …).

## What it does

- Big-tile app launcher as the TV's default "home" via `Settings → General →
  Smart Features → Autorun Last App` (leave the launcher running when you turn
  the TV off)
- **Number-key shortcuts** — remote `1`–`6` jump straight to apps
- **`0`** opens the TV settings page (falls back to a hint if Tizen refuses)
- Arrow/OK navigation, live clock
- **`9` = appId discovery overlay** — lists every installed app with its exact
  `appId` so `js/config.js` can be filled in accurately
- Real remote Back/Exit keys supported via `hwkey-event`

## Known limits (so we're honest)

- The remote's **hard buttons** (Netflix/Prime/etc. keys, Home) cannot be
  remapped in firmware. The launcher sidesteps them; a programmable remote is
  the only true fix for those.
- A sideloaded app can't read other apps' data — so no cross-service "Up Next"
  row. Tiles deep-launch the official apps, where those rows live.
- Sideloaded apps survive firmware updates but Developer Mode does not flip
  back — re-check `Developer mode: ON` after big firmware updates.

## Setup

1. **TV: install the stock apps first** (Apps → search). Dropout, Max,
   Disney+, Apple TV, YouTube, YouTube TV. Logins live here, untouched.

2. **TV: enable Developer Mode**
   - Open `Apps`, type `12345` with the remote (use the 1-2-3 button)
   - Developer mode: **ON**, Host PC IP = your computer's LAN IP
   - Reboot when prompted (hold power)

3. **PC: this machine needs Tizen Studio tools (one-time)**
   - `tools/setup-tizen.sh` installs the CLI (`tizen`, `sdb`) to `~/tizen-studio`

4. **PC: create the signing certificate (one-time)**
   - In Tizen Studio (or `tools/ide`): *Tools → Certificate Manager*
   - Create a Samsung **author + distributor** certificate, sign in with a
     Samsung account, and add this TV's **DUID** (shows in Certificate Manager
     once the TV is connected)
   - Name the profile `SamsungCert` or change `CERT_PROFILE` in `tv.env`

5. **Deploy**
   ```bash
   cp tv.env.example tv.env      # set TV_IP, verify TIZEN_STUDIO, CERT_PROFILE
   tools/deploy.sh               # build → sign → install → run (~5 s)
   ```
   Re-run `tools/deploy.sh` after every edit.

6. **Fill in appIds**
   - Deploy once, open the launcher, press **9** on the remote
   - Copy each app's exact `appId` into `js/config.js`, redeploy
   - `CONFIG.known` has a couple of commonly cited IDs from public projects —
     **verify with the overlay before trusting**

7. **Make it the default home screen**
   - Win the settings race: keep the launcher open when powering off
   - Enable `Settings → General → Smart Features → Autorun Last App`
   - Disables (if present): Smart Hub autorun — pointed at anything else

## Project layout

```
config.xml        app identity + privileges (app launch, settings, app list)
index.html        shell: tiles grid, clock, toast, appId overlay
css/style.css     big-TV styling
js/config.js      YOUR tiles — appIds, shortcuts, logos/text
js/main.js        key handling, navigation, launching, settings, overlay
tools/deploy.sh   build/sign/install/run loop
tools/setup-tizen.sh  one-time Tizen Studio CLI install
tv.env.example    TV IP + tool paths (copy to tv.env)
```

## Screensaver images

`img/savers/saver-1.png` … `saver-15.png` — the loader walks the numbers in
sequence and skips missing files. Includes real Omarchy wallpapers
(tokyo-night, starship, last-horizon, miasma, vantablack, matte-black,
retro-82, rose-pine, nord, ethereal) plus generated gradients. Swap in your
own photos any time — just keep the `saver-N.png` naming.

## Debugging

- `sdb connect <TV_IP>` then `sdb shell dumpsys`-style tricks vary by firmware;
  the reliable path is: deploy with `tools/deploy.sh`, observe, edit, redeploy.
- Key events: set `CONFIG.debugToasts = true`.
- If installs silently fail: reboot TV (unplug 30 s), then re-check Developer
  Mode's Host PC IP — it must be **this computer's** IP while deploying.
