# Kill any process on port 5000, then start the server
$conn = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
    Write-Host "Killing process $($conn.OwningProcess) on port 5000..."
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}
Write-Host "Starting server..."
npm run dev
