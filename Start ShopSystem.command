#!/bin/bash

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN_DIR="$SCRIPT_DIR/.run"
BACKEND_LOG="$RUN_DIR/backend.log"
BACKEND_PID=""

mkdir -p "$RUN_DIR"

cleanup() {
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null
  fi
}

trap cleanup EXIT INT TERM

echo "== ShopSystem Launcher =="
echo

if ! command -v npm >/dev/null 2>&1; then
  echo "Missing dependency: npm"
  echo "Install Node.js first, then run this launcher again."
  echo
  read -r -p "Press Enter to close..."
  exit 1
fi

if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "Missing frontend dependencies: node_modules"
  echo "Run 'npm install' once in the project root, then try again."
  echo
  read -r -p "Press Enter to close..."
  exit 1
fi

if [ ! -x "$SCRIPT_DIR/.venv/bin/python3" ]; then
  echo "Missing Python virtual environment: .venv"
  echo "Create it and install backend dependencies first:"
  echo "  python3 -m venv .venv"
  echo "  source .venv/bin/activate"
  echo "  pip install -r requirements.txt"
  echo
  read -r -p "Press Enter to close..."
  exit 1
fi

if ! "$SCRIPT_DIR/.venv/bin/python3" -c "import fastapi, uvicorn, reportlab" >/dev/null 2>&1; then
  echo "Missing backend Python dependencies in .venv"
  echo "Activate the virtual environment and reinstall requirements:"
  echo "  source .venv/bin/activate"
  echo "  pip install -r requirements.txt"
  echo
  read -r -p "Press Enter to close..."
  exit 1
fi

cd "$SCRIPT_DIR" || exit 1

echo "Building frontend bundle ..."
if ! npm run build >/dev/null 2>&1; then
  echo
  echo "Frontend build failed."
  echo "Run 'npm run build' in the project root to inspect the error."
  echo
  read -r -p "Press Enter to close..."
  exit 1
fi

echo "Starting app on http://127.0.0.1:8000 ..."
"$SCRIPT_DIR/.venv/bin/python3" -m uvicorn backend.main:app --port 8000 >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

sleep 3

if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  echo
  echo "Backend failed to start. Check: $BACKEND_LOG"
  echo
  read -r -p "Press Enter to close..."
  exit 1
fi

echo
echo "ShopSystem is launching."
echo "App: http://127.0.0.1:8000"
echo
echo "Logs:"
echo "  $BACKEND_LOG"
echo

open "http://127.0.0.1:8000"

echo "Keep this window open while using the app."
read -r -p "Press Enter to stop ShopSystem and close..."
