# SmartFCRA Supreme — Automated Cloudflare D1 Backup Script
# Powered by NeuronEdge Labs™ & RJ Business Solutions
# Schedule this weekly task via Task Scheduler or Cron

$ErrorActionPreference = "Stop"
$BackupDir = "./.backups"
$Date = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupFile = "$BackupDir/smart_fcra_backup_$Date.sql"
$R2Bucket = "r2://smart-fcra-database-backups"

# Ensure backup directory exists
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

Write-Host "[INFO] Commencing automated D1 SQLite database export..." -ForegroundColor Blue

# Trigger wrangler D1 export
wrangler d1 export fcra-detector-production --remote --output=$BackupFile

Write-Host "[SUCCESS] Backup written to local disk: $BackupFile" -ForegroundColor Green

# Upload to secure R2 storage bucket
if (Get-Command "aws" -ErrorAction SilentlyContinue) {
    Write-Host "[INFO] Replicating backup archive to secure R2 bucket..." -ForegroundColor Blue
    aws s3 cp $BackupFile "$R2Bucket/smart_fcra_backup_$Date.sql" --endpoint-url https://c1342.r2.cloudflarestorage.com
    Write-Host "[SUCCESS] Replication to Cloudflare R2 succeeded!" -ForegroundColor Green
} else {
    Write-Warning "[WARN] AWS CLI/Wrangler R2 bindings missing. Preserving backup locally on disk only."
}
