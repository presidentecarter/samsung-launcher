#!/usr/bin/env bash
# One-time setup: installs Tizen Studio CLI (tizen + sdb) so this app can be
# built/signed/pushed to the TV. Tizen Studio installer is a self-extracting
# binary downloaded from Samsung. Keep an eye on:
#   https://docs.tizen.org/tizen-studio/setup/install/con/standard-install/
set -euo pipefail

DEST="${TIZEN_STUDIO:-$HOME/tizen-studio}"
if [ -d "$DEST/tools/sdb" ] && [ -d "$DEST/tools/ide/bin" ]; then
    echo "tizen tools already at $DEST — skipping install"
    exit 0
fi

ARCH=$(uname -m)
case "$ARCH" in
    x86_64) TIZ_ARCH=ubuntu64 ;;
    aarch64) TIZ_ARCH=ubuntu64 ;;
    *) echo "unsupported uname: $ARCH (only x86_64/aarch64 handled)"; exit 1;;
esac

mkdir -p /tmp/opencode/tizen-setup && cd /tmp/opencode/tizen-setup

echo "Fetching the Tizen Studio CLI list..."
# The version-tagged URL below is stable, but check
# https://developer.samsung.com/tizen-studio/download for the current CLI link.
BASE="https://download.tizen.org/tizen-studio-cli"
echo "  $BASE"
LS=$(curl -fsSL "$BASE" | grep -oE 'href="[^"]+"' | sed 's/href="//;s/"//' | grep -v '\.\./' | tail -1 | tr -d '/')
echo "Latest major dir: $LS"

curl -fsSL -o tizen-cli.sha256 "$BASE/$LS/ubuntu64/tizen-studio-cli-$LS-ubuntu64.tar.gz.sha256"
cat tizen-cli.sha256
TARGET=$(cat tizen-cli.sha256 | awk '{print $2}')
echo "Downloading $BASE/$LS/ubuntu64/$TARGET"
curl -fsSL -o "$TARGET" "$BASE/$LS/ubuntu64/$TARGET"
tar xf "$TARGET"

echo "Installing to $DEST (accept default when prompted)"
./tizen-studio-cli-"$LS"-ubuntu64.bin -- "$DEST" 2>/dev/null || ./tizen-studio-cli-"$LS"-ubuntu64.bin

echo
echo "Done. Next:"
echo "  1. Run: $DEST/tools/ide/bin/tizen.sh cli-config default.profiles.path=\"\$PWD/profiles\" (see README step 4)"
echo "  2. Create your Samsung certificate in Tizen Studio's Certificate Manager (README step 4)"
