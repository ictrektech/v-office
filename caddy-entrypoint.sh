#!/bin/sh
# Write runtime-injected configuration for the static frontend before
# starting Caddy. VOS installs render VOS_APP_VERSION into the compose file;
# standalone deployments leave it empty and the UI hides the version row.
set -eu
cat > /srv/runtime-config.js <<EOF
window.__VOS_APP_VERSION__="${VOS_APP_VERSION:-}";
EOF
exec "$@"
