# samsung-launcher

A custom home-screen launcher for Samsung Smart TVs (Tizen OS). Sideloaded as
a signed developer web app — no root, no firmware changes, and **all native
apps and their logins keep working normally** (Dropout, Disney+, YouTube,
YouTube TV, Max, Apple TV, …).

## What it does

- Big-tile app launcher as the TV's default "home" via `Settings → General →
  Smart Features → Autorun Last App` (leave the launcher running when you turn
  the TV off)
- App tiles with each app's **real icon, pulled from the TV**
- Top bar (press **Up** from the tiles): **App Store**, **Theme**, **Screensaver**, **Settings**
- Arrow/OK navigation only — no number pad needed; live clock
- **Omarchy themes** — palette + wallpapers imported from your Omarchy
  install (Jade Horse by default). The theme's wallpaper sits blurred behind
  the tiles and its wallpapers drive the screensaver. The **Theme** button
  cycles themes (remembered across power cycles)
- **`tools/list-apps.sh`** lists every installed app with its exact `appId`
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
   - `tools/list-apps.sh` prints every installed app and its `appId`
   - Copy them into `js/config.js`, redeploy

7. **Make it the default home screen**
   - Win the settings race: keep the launcher open when powering off
   - Enable `Settings → General → Smart Features → Autorun Last App`
   - Disables (if present): Smart Hub autorun — pointed at anything else

## Open on power-on (SmartThings)

The TV can't be told to start a sideloaded app at boot, and the SmartThings
app's routine editor can't pick one either — but a SmartThings **rule**
created through the API can. It runs in Samsung's cloud, so no PC needs to be
on:

```bash
# token from https://account.smartthings.com/tokens (Devices + Rules scopes)
echo 'SMARTTHINGS_TOKEN=...' >> tv.env
tools/autostart.sh on       # TV turns on -> open the launcher (AUTOSTART_DELAY=n to wait)
tools/autostart.sh status | off | test
```

Tokens expire after 24 h; that only matters for changing the rule — the rule
itself keeps running. The TV must be reachable by SmartThings when it powers
on (Settings → General → Network → Expert Settings → Power On with Mobile).

## Themes

Themes come from Omarchy (`~/.local/share/omarchy/themes`, plus your own in
`~/.config/omarchy/themes`). Import them, then redeploy:

```bash
tools/sync-themes.py                      # default: jade-horse tokyo-night starship vantablack
tools/sync-themes.py jade-horse nord kanagawa
tools/sync-themes.py --all                # every installed theme
```

This converts each theme's backgrounds to 1920px JPGs in `img/themes/<name>/`,
renders a pre-blurred `home.jpg` backdrop (CSS blur is too slow on Tizen), and
regenerates `js/themes.js`. Set the starting theme with `theme:` in
`js/config.js`. Needs ImageMagick.

## Project layout

```
config.xml        app identity + privileges (app launch, settings, app list)
index.html        shell: tiles grid, clock, toast, appId overlay
css/style.css     big-TV styling
js/config.js      YOUR tiles — appIds, shortcuts, logos/text
js/main.js        key handling, navigation, launching, themes, settings, overlay
js/themes.js      GENERATED theme palettes + wallpaper lists
img/themes/       GENERATED per-theme wallpapers + blurred home backdrop
img/savers/       shared screensaver set (screensaver.includeShared)
tools/deploy.sh   build/sign/install/run loop
tools/setup-tizen.sh  one-time Tizen Studio CLI install
tools/sync-themes.py  import Omarchy themes
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
