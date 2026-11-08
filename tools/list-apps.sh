#!/usr/bin/env bash
# List every user-visible app on the TV with its appId (for js/config.js).
set -euo pipefail
cd "$(dirname "$0")/.."
source tv.env
SDB="$TIZEN_STUDIO/tools/sdb"
"$SDB" connect "$TV_IP" >/dev/null
"$SDB" -s "$TV_IP:26101" shell 0 vd_applist \
  | sed -nE 's/^-+(app_title|app_tizen_id) *=(.*)-+$/\2/p' \
  | sed 's/-*$//' | paste - - | sort -f | column -t -s $'\t'
