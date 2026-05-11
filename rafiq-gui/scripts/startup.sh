#!/bin/bash

# ===========================================
# RAFIQ GUI Startup Script
# For Ubuntu Mini PC - Kiosk Mode
# ===========================================

# Wait for display
sleep 5

# Set environment variables
export DISPLAY=:0
export XDG_RUNTIME_DIR=/run/user/1000

# Launch Electron in fullscreen kiosk mode
cd /home/user/rafiq-system/rafiq-gui

# Check if running in production or development
if [ -f "./dist/index.html" ]; then
  echo "Starting RAFIQ GUI (Production)..."
  electron . --kiosk --fullscreen --no-sandbox
else
  echo "Starting RAFIQ GUI (Development)..."
  npm run dev &
  sleep 3
  electron . --kiosk --fullscreen --no-sandbox
fi

# If Electron crashes, restart
while true; do
  wait $!
  echo "RAFIQ GUI crashed. Restarting in 5 seconds..."
  sleep 5
done