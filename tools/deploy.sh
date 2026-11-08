#!/usr/bin/env bash
# Build, sign, install and run the launcher on the TV. ~5s on repeat runs.
# Requires: Tizen Studio tools (tools/setup-tizen.sh), certificate profile
# created via Certificate Manager (README step 4), TV in Developer Mode
# with Host PC IP set to THIS computer's IP.
set -euo pipefail
cd "$(dirname "$0")/.."

# ---------- env ----------
if [ ! -f tv.env ]; then
    echo "Missing tv.env — copy tv.env.example:  cp tv.env.example tv.env"
    exit 1
fi
# shellcheck disable=SC1091
source tv.env

TIZEN="$TIZEN_STUDIO/tools/ide/bin/tizen.sh"
SDB="$TIZEN_STUDIO/tools/sdb"
[ -x "$TIZEN" ] || { echo "tizen.sh not found at $TIZEN — set TIZEN_STUDIO in tv.env"; exit 1; }

# ---------- connect ----------
"$SDB" connect "$TV_IP"
$SDB devices | grep -q "$TV_IP" || { echo "TV not reachable at $TV_IP (is Developer Mode on? rebooted?)"; exit 1; }
# sdb devices row: <IP>:26101   device   <MODEL>
DEVICE_NAME=$($SDB devices | awk -v ip="$TV_IP" '$1 ~ "^"ip":" {print $3}')
[ -n "$DEVICE_NAME" ] || { echo "could not determine TV device name from sdb devices"; exit 1; }
echo "Device: $DEVICE_NAME"

# ---------- build & sign ----------
OUT=.buildResult
rm -rf "$OUT" .buildresult
"$TIZEN" build-web -out "$OUT" -e ".*" -e "tools/*" -e "tv.env*" -e "*.md" -e "node_modules/*" -- "$PWD"
"$TIZEN" package -t wgt -s "$CERT_PROFILE" -- "$PWD/$OUT"

WGT=$(find "$OUT" -maxdepth 1 -name "*.wgt" | head -1)
[ -n "$WGT" ] || { echo "no .wgt produced"; exit 1; }
echo "Package: $WGT ($(du -h "$WGT" | cut -f1))"

# ---------- install & run ----------
"$TIZEN" install -n "$(basename "$WGT")" -t "$DEVICE_NAME" -- "$PWD/$OUT"
"$TIZEN" run -p "cmlauncher.launcher" -t "$DEVICE_NAME"
