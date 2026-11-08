#!/usr/bin/env python3
"""
Import Omarchy themes into the launcher.

For each theme it reads ~/.local/share/omarchy/themes/<name>/colors.toml and
backgrounds/*, then writes:

  img/themes/<name>/1.jpg, 2.jpg …   screensaver wallpapers (1920px JPG)
  img/themes/<name>/home.jpg         blurred + tinted backdrop behind the tiles
  js/themes.js                       palettes + wallpaper lists (generated)

Usage:
  tools/sync-themes.py                       # the default set below
  tools/sync-themes.py jade-horse nord ...   # specific themes
  tools/sync-themes.py --all                 # every theme with a colors.toml

Re-run after adding themes, then tools/deploy.sh. Needs ImageMagick (magick).
"""
import json
import os
import shutil
import subprocess
import sys
import tomllib
from pathlib import Path

DEFAULT = ["jade-horse", "tokyo-night", "starship", "vantablack"]
SEARCH = [
    Path.home() / ".config/omarchy/themes",       # user themes win
    Path.home() / ".local/share/omarchy/themes",
]
ROOT = Path(__file__).resolve().parent.parent
OUT_IMG = ROOT / "img/themes"
OUT_JS = ROOT / "js/themes.js"
IMG_EXT = {".png", ".jpg", ".jpeg", ".webp"}
WIDTH = 1920           # TV web apps render at 1920x1080 regardless of panel
QUALITY = "85"
HOME_TINT = 40         # % of theme background blended over the home backdrop
HOME_BLUR = 0          # Gaussian blur sigma for the home backdrop (0 = sharp)


def find_theme(name):
    for base in SEARCH:
        d = base / name
        if (d / "colors.toml").is_file():
            return d
    return None


def rgba(hex_color, alpha):
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return f"rgba({r}, {g}, {b}, {alpha})"


def magick(*args):
    subprocess.run(["magick", *map(str, args)], check=True)


def palette(c):
    bg = c.get("background", "#101010")
    darker = c.get("darker_background", bg)
    lighter = c.get("lighter_background", bg)
    fg = c.get("foreground", "#e0e0e0")
    return {
        "mode": c.get("mode", "dark"),
        "bg": bg,
        "tile": rgba(lighter, 0.72),
        "tileFocus": rgba(c.get("selection", lighter), 0.88),
        "text": fg,
        "textBright": c.get("bright_foreground", fg),
        "muted": c.get("muted", c.get("dark_foreground", fg)),
        "accent": c.get("accent", fg),
        "accentGlow": rgba(c.get("accent", fg), 0.45),
        "border": c.get("selection", lighter),
        "scrim": rgba(darker, 0.9),
    }


def sync(name):
    src = find_theme(name)
    if not src:
        print(f"  ! {name}: no colors.toml found, skipped")
        return None
    with open(src / "colors.toml", "rb") as f:
        colors = tomllib.load(f)
    pal = palette(colors)

    bgs = sorted(p for p in (src / "backgrounds").glob("*") if p.suffix.lower() in IMG_EXT) \
        if (src / "backgrounds").is_dir() else []
    out = OUT_IMG / name
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True)

    wallpapers = []
    for i, p in enumerate(bgs, 1):
        dst = out / f"{i}.jpg"
        # first frame only ([0]) in case of animated webp
        magick(f"{p}[0]", "-resize", f"{WIDTH}x>", "-strip", "-quality", QUALITY, dst)
        wallpapers.append(f"img/themes/{name}/{i}.jpg")

    home = None
    if bgs:
        dst = out / "home.jpg"
        # Blur/tint here, not in CSS: CSS filters stutter on Tizen.
        blur = ["-blur", f"0x{HOME_BLUR}"] if HOME_BLUR else []
        magick(f"{bgs[0]}[0]", "-resize", "1920x1080^", "-gravity", "center",
               "-extent", "1920x1080", *blur,
               "(", "-size", "1920x1080", f"xc:{pal['bg']}", ")",
               "-compose", "blend", "-define", f"compose:args={HOME_TINT}",
               "-composite", "-strip", "-quality", "82", dst)
        home = f"img/themes/{name}/home.jpg"

    print(f"  ✓ {name}: {len(wallpapers)} wallpapers")
    return {
        "name": colors.get("name") or name.replace("-", " ").title(),
        "palette": pal,
        "home": home,
        "wallpapers": wallpapers,
    }


def main(argv):
    if not shutil.which("magick"):
        sys.exit("ImageMagick 'magick' not found (pacman -S imagemagick)")
    if "--all" in argv:
        names = sorted({d.name for base in SEARCH if base.is_dir()
                        for d in base.iterdir() if (d / "colors.toml").is_file()})
    else:
        names = [a for a in argv if not a.startswith("-")] or DEFAULT

    print(f"Syncing {len(names)} theme(s) → img/themes/")
    themes = {}
    for n in names:
        t = sync(n)
        if t:
            themes[n] = t

    # drop image folders for themes no longer synced
    if OUT_IMG.is_dir():
        for d in OUT_IMG.iterdir():
            if d.is_dir() and d.name not in themes:
                shutil.rmtree(d)

    shared = sorted(
        (f"img/savers/{p.name}" for p in (ROOT / "img/savers").glob("*")
         if p.suffix.lower() in IMG_EXT),
        key=lambda s: (len(s), s),
    ) if (ROOT / "img/savers").is_dir() else []

    OUT_JS.write_text(
        "/* GENERATED by tools/sync-themes.py from Omarchy themes. Do not edit;\n"
        " * re-run the script instead. */\n"
        f"const THEMES = {json.dumps(themes, indent=4, ensure_ascii=False)};\n\n"
        f"const SHARED_SAVERS = {json.dumps(shared, indent=4)};\n"
    )
    print(f"Wrote js/themes.js ({len(themes)} themes, {len(shared)} shared savers)")


if __name__ == "__main__":
    main(sys.argv[1:])
