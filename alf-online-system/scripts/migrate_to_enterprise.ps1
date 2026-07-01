# Automated Migration Script for Phase 3 (Enterprise Re-Architecture)
# Run only when explicitly approved!

$ErrorActionPreference = "Stop"

Write-Host "Starting Phase 3 Migration..." -ForegroundColor Cyan

# 1. Directory Renames
Write-Host "Renaming src to backend..."
Rename-Item -Path "src" -NewName "backend" -Force
Write-Host "Extracting rafiq-gui/rafiq-gui to frontend..."
Move-Item -Path "rafiq-gui/rafiq-gui" -Destination "frontend" -Force
Remove-Item -Path "rafiq-gui" -Force

# 2. Database Renames
Write-Host "Renaming test_rafiq_v4_1.db to data/databases/rafiq_dev.db..."
Move-Item -Path "test_rafiq_v4_1.db" -Destination "data/databases/rafiq_dev.db" -Force

# 3. Launcher Migration
Write-Host "Moving rafiq_launcher.py..."
New-Item -ItemType Directory -Force -Path "backend/launcher"
Move-Item -Path "rafiq_launcher.py" -Destination "backend/launcher/rafiq_launcher.py" -Force

# 4. Import Mutations (Python)
Write-Host "Executing Mass Import Mutations in backend and tests..."
$files = Get-ChildItem -Path "backend", "tests" -Recurse -Filter "*.py"
foreach ($file in $files) {
    $content = Get-Content $file.FullName
    $content = $content -replace 'from src ', 'from backend '
    $content = $content -replace 'from src\.', 'from backend.'
    $content = $content -replace 'import src\.', 'import backend.'
    $content = $content -replace 'test_rafiq_v4_1\.db', 'data/databases/rafiq_dev.db'
    Set-Content -Path $file.FullName -Value $content
}

# 5. Bat File Update
Write-Host "Updating run_rafiq.bat..."
$batContent = Get-Content "run_rafiq.bat"
$batContent = $batContent -replace 'python rafiq_launcher\.py', 'python backend/launcher/rafiq_launcher.py'
Set-Content -Path "run_rafiq.bat" -Value $batContent

# 6. Launcher Internal Paths Update
Write-Host "Updating rafiq_launcher.py targets..."
$launcher = Get-Content "backend/launcher/rafiq_launcher.py"
$launcher = $launcher -replace '"src\.gui_bridge"', '"backend.gui_bridge"'
$launcher = $launcher -replace '"src\.services\.voice_listener"', '"backend.services.voice_listener"'
$launcher = $launcher -replace '"rafiq-gui", "rafiq-gui"', '"frontend"'
Set-Content -Path "backend/launcher/rafiq_launcher.py" -Value $launcher

Write-Host "Phase 3 Migration Completed!" -ForegroundColor Green
