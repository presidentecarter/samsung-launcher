#!/usr/bin/env bash
# Open the launcher whenever the TV turns on, via a SmartThings rule.
#
# The rule lives in SmartThings' cloud — no PC needs to be on. The token is
# only needed to create/remove it (SmartThings PATs expire after 24 h; make a
# fresh one at https://account.smartthings.com/tokens with Devices + Rules
# scopes and put it in tv.env as SMARTTHINGS_TOKEN=...).
#
#   tools/autostart.sh on       create (or replace) the rule
#   tools/autostart.sh off      delete it
#   tools/autostart.sh status   show matching rules
#   tools/autostart.sh test     open the launcher now via SmartThings
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source tv.env; set +a

: "${SMARTTHINGS_TOKEN:?add SMARTTHINGS_TOKEN=... to tv.env}"
APP_ID="${LAUNCHER_APP_ID:-cmlauncher.launcher}"
RULE_NAME="Open launcher on TV power-on"
DELAY_SECONDS="${AUTOSTART_DELAY:-6}"   # let the TV finish booting first
API="https://api.smartthings.com/v1"

st() {  # st METHOD PATH [BODY]
    curl -sf -X "$1" -H "Authorization: Bearer $SMARTTHINGS_TOKEN" \
        -H "Content-Type: application/json" "$API$2" ${3:+-d "$3"} \
        || { echo "SmartThings API $1 $2 failed (token expired? scopes?)" >&2; exit 1; }
}

# first device with the launch-app capability (or ST_TV_DEVICE_ID from tv.env)
read -r TV LOC < <(st GET /devices | python3 -c '
import json, os, sys
want = os.environ.get("ST_TV_DEVICE_ID")
for d in json.load(sys.stdin)["items"]:
    caps = {c["id"] for comp in d.get("components", []) for c in comp.get("capabilities", [])}
    if (want and d["deviceId"] == want) or (not want and "custom.launchapp" in caps):
        print(d["deviceId"], d["locationId"]); break
')
[ -n "${TV:-}" ] || { echo "No TV with custom.launchapp found in SmartThings"; exit 1; }

rule_ids() {
    st GET "/rules?locationId=$LOC" | python3 -c '
import json, sys
for r in json.load(sys.stdin).get("items", []):
    if r.get("name") == sys.argv[1]: print(r["id"])
' "$RULE_NAME"
}

case "${1:-status}" in
on)
    for id in $(rule_ids); do st DELETE "/rules/$id?locationId=$LOC" >/dev/null; done
    body=$(python3 - "$RULE_NAME" "$TV" "$APP_ID" "$DELAY_SECONDS" <<'EOF'
import json, sys
name, tv, app, delay = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
launch = {"command": {"devices": [tv], "commands": [{
    "component": "main", "capability": "custom.launchapp",
    "command": "launchApp", "arguments": [{"string": app}]}]}}
then = ([{"sleep": {"duration": {"value": {"integer": delay}, "unit": "Second"}}}] if delay else []) + [launch]
print(json.dumps({"name": name, "actions": [{"if": {
    "equals": {
        "left": {"device": {"devices": [tv], "component": "main",
                            "capability": "switch", "attribute": "switch"}},
        "right": {"string": "on"}},
    "then": then}}]}))
EOF
)
    st POST "/rules?locationId=$LOC" "$body" | python3 -c 'import json,sys; r=json.load(sys.stdin); print("rule created:", r["id"], r.get("status", ""))'
    ;;
off)
    ids=$(rule_ids)
    [ -n "$ids" ] || { echo "no rule to remove"; exit 0; }
    for id in $ids; do st DELETE "/rules/$id?locationId=$LOC" >/dev/null; echo "removed $id"; done
    ;;
status)
    ids=$(rule_ids)
    [ -n "$ids" ] && echo "autostart ON (rule $ids)" || echo "autostart OFF"
    ;;
test)
    st POST "/devices/$TV/commands" "{\"commands\":[{\"component\":\"main\",\"capability\":\"custom.launchapp\",\"command\":\"launchApp\",\"arguments\":[\"$APP_ID\"]}]}"
    echo
    ;;
*)
    echo "usage: $0 on|off|status|test"; exit 1 ;;
esac
