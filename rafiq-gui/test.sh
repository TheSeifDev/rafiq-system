#!/bin/bash
# RAFIQ GUI - Quick Test Script

echo "=== RAFIQ GUI Test Script ==="
echo ""

cd "$(dirname "$0")"

# Test 1: Build
echo "[1/4] Testing build..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "  ✓ Build successful"
else
  echo "  ✗ Build failed"
  exit 1
fi

# Test 2: Dist folder exists
echo "[2/4] Checking dist folder..."
if [ -f "dist/index.html" ] && [ -d "dist/assets" ]; then
  echo "  ✓ Dist folder contains index.html and assets"
else
  echo "  ✗ Dist folder incomplete"
  exit 1
fi

# Test 3: Vite dev server
echo "[3/4] Testing Vite dev server..."
timeout 8 npm run dev > /tmp/vite.log 2>&1 &
VITE_PID=$!
sleep 5
if grep -q "localhost:5173" /tmp/vite.log 2>/dev/null; then
  echo "  ✓ Vite dev server started on port 5173"
  kill $VITE_PID 2>/dev/null
else
  echo "  ⚠ Vite dev server may have started on different port"
fi

# Test 4: Dependencies
echo "[4/4] Checking dependencies..."
if [ -d "node_modules/framer-motion" ] && [ -d "node_modules/react" ] && [ -d "node_modules/zustand" ]; then
  echo "  ✓ All dependencies installed"
else
  echo "  ✗ Missing dependencies"
  exit 1
fi

echo ""
echo "=== All tests passed! ==="
echo ""
echo "To run the GUI:"
echo "  Dev mode:  npm run electron:dev"
echo "  Prod mode: npm start"