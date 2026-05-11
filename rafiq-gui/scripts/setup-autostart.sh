# ===========================================
# RAFIQ GUI - Ubuntu Auto-Start Setup
# ===========================================

# 1. Copy service file
sudo cp rafiq-gui.service /etc/systemd/system/

# 2. Reload systemd
sudo systemctl daemon-reload

# 3. Enable service
sudo systemctl enable rafiq-gui.service

# 4. Start service
sudo systemctl start rafiq-gui.service

# Check status
sudo systemctl status rafiq-gui.service

# ===========================================
# Alternative: Using XDG Autostart
# ===========================================

# Create desktop entry
cat > ~/.config/autostart/rafiq-gui.desktop << EOF
[Desktop Entry]
Type=Application
Name=RAFIQ GUI
Exec=/usr/bin/electron /home/user/rafiq-system/rafiq-gui --kiosk --fullscreen
Hidden=false
NoDisplay=true
X-GNOME-Autostart-enabled=true
EOF

# ===========================================
# Hide Ubuntu Desktop (Kiosk Mode)
# ===========================================

# Edit ~/.xinitrc or ~/.profile
echo "xset s off" >> ~/.profile
echo "xset s noblank" >> ~/.profile
echo "xset -dpms" >> ~/.profile

# Install unclutter to hide mouse
sudo apt install unclutter