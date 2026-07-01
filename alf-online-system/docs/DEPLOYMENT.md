# 🚀 Deployment and Packaging

## Desktop Packaging
1. Compile Python backend to executable using PyInstaller:
   ```bash
   pyinstaller --onedir src/gui_bridge.py
   ```
2. Build React artifacts inside `rafiq-gui/rafiq-gui`:
   ```bash
   npm run build
   ```
3. Compile Electron binaries:
   ```bash
   npm run electron:pack
   ```