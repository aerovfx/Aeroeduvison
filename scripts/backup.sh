#!/bin/bash
# Automated PostgreSQL Backup Script for AeroeduVision
# Runs daily via cron, keeps 7 daily backups + 4 weekly backups

set -e

# Configuration
BACKUP_DIR="/backups"
DB_NAME="${POSTGRES_DB:-aeroedu}"
DB_USER="${POSTGRES_USER:-aero_user}"
PGPASSWORD="${PGPASSWORD:-change_me_in_production}"
DATE=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"

echo "[$(date)] Starting PostgreSQL backup..."

# Daily backup
DAILY_BACKUP="$BACKUP_DIR/daily/${DB_NAME}_daily_${DATE}.sql.gz"
pg_dump -h postgres -U "$DB_USER" -d "$DB_NAME" | gzip > "$DAILY_BACKUP"

if [ $? -eq 0 ]; then
    echo "[$(date)] Daily backup completed: $DAILY_BACKUP"
    ls -lh "$DAILY_BACKUP"
else
    echo "[$(date)] ERROR: Daily backup failed!"
    exit 1
fi

# Weekly backup (every Sunday)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    WEEKLY_BACKUP="$BACKUP_DIR/weekly/${DB_NAME}_weekly_${DATE}.sql.gz"
    cp "$DAILY_BACKUP" "$WEEKLY_BACKUP"
    echo "[$(date)] Weekly backup created: $WEEKLY_BACKUP"
fi

# Cleanup old backups
# Keep 7 daily backups
echo "[$(date)] Cleaning up old daily backups..."
cd "$BACKUP_DIR/daily"
ls -t ${DB_NAME}_daily_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm
DAILY_COUNT=$(ls -1 ${DB_NAME}_daily_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] Daily backups remaining: $DAILY_COUNT"

# Keep 4 weekly backups
echo "[$(date)] Cleaning up old weekly backups..."
cd "$BACKUP_DIR/weekly"
ls -t ${DB_NAME}_weekly_*.sql.gz 2>/dev/null | tail -n +5 | xargs -r rm
WEEKLY_COUNT=$(ls -1 ${DB_NAME}_weekly_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] Weekly backups remaining: $WEEKLY_COUNT"

# Show disk usage
echo "[$(date)] Backup directory disk usage:"
du -sh "$BACKUP_DIR"

echo "[$(date)] Backup completed successfully!"
