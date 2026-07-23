#!/bin/sh
set -e

DEMO_DIR="${DEMO_DIR:-/demo}"
SERVICE="${SERVICE:-editor}"

if [ "$SERVICE" = "web-demo" ]; then
  cd /app/templates/web-game
  exec npx vite preview --host 0.0.0.0 --port 5174
fi

# Initialize demo project on first run
if [ ! -f "$DEMO_DIR/gamekit/project.json" ]; then
  echo "Initializing demo project at $DEMO_DIR ..."
  mkdir -p "$DEMO_DIR"
  cd "$DEMO_DIR"
  node /app/packages/cli/dist/index.js init --name "Coin Rush Demo"

  if [ -d /app/templates/web-game/gamekit/scenes ]; then
    cp -r /app/templates/web-game/gamekit/scenes/. "$DEMO_DIR/gamekit/scenes/"
  fi
  if [ -d /app/templates/web-game/gamekit/assets ]; then
    cp -r /app/templates/web-game/gamekit/assets/. "$DEMO_DIR/gamekit/assets/"
  fi
  echo "Demo project ready."
fi

cd "$DEMO_DIR"
exec node /app/packages/cli/dist/index.js editor --host 0.0.0.0
