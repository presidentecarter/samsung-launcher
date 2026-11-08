#!/usr/bin/env bash
# One-time setup: installs the Tizen Studio CLI (tizen + sdb) plus Samsung's
# certificate extension, so this app can be built/signed/pushed to the TV.
# Installers: https://download.tizen.org/sdk/Installer/
set -euo pipefail

VERSION="${TIZEN_VERSION:-6.1}"
DEST="${TIZEN_STUDIO:-$HOME/tizen-studio}"
INSTALLER="web-cli_Tizen_Studio_${VERSION}_ubuntu-64.bin"
URL="https://download.tizen.org/sdk/Installer/tizen-studio_${VERSION}/${INSTALLER}"

[ "$(uname -m)" = "x86_64" ] || { echo "Tizen Studio CLI is x86_64-only"; exit 1; }

if [ -x "$DEST/tools/sdb" ] && [ -x "$DEST/tools/ide/bin/tizen" ]; then
    echo "Tizen tools already at $DEST — skipping base install"
else
    TMP=$(mktemp -d)
    trap 'rm -rf "$TMP"' EXIT
    echo "Downloading $URL"
    curl -fL --progress-bar -o "$TMP/$INSTALLER" "$URL"
    chmod +x "$TMP/$INSTALLER"
    echo "Installing to $DEST"
    "$TMP/$INSTALLER" --accept-license "$DEST"
fi

# Samsung TV certificates need Samsung's certificate extension (adds the
# Certificate Manager with "Samsung" profile + Samsung account sign-in).
PM="$DEST/package-manager/package-manager-cli.bin"
if [ -x "$PM" ]; then
    # The package manager checks Ubuntu deps with `dpkg -l <pkg> | grep ^ii`.
    # On non-Debian distros (Arch) give it a stand-in that reports them present.
    PMPATH="$PATH"
    if ! command -v dpkg >/dev/null; then
        SHIM=$(mktemp -d)
        printf '#!/bin/sh\nshift; for p in "$@"; do echo "ii  $p  0  all  stub"; done\n' > "$SHIM/dpkg"
        chmod +x "$SHIM/dpkg"
        PMPATH="$SHIM:$PATH"
    fi
    echo "Installing Samsung certificate extension + Certificate Manager…"
    PATH="$PMPATH" "$PM" install --accept-license cert-add-on Certificate-Manager TV-SAMSUNG-Extension-Tools \
        || echo "  ! install failed — run $PM show-pkgs and install them manually"
fi

echo
echo "Done. sdb:   $DEST/tools/sdb"
echo "      tizen: $DEST/tools/ide/bin/tizen"
