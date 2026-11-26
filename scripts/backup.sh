#!/usr/bin/env bash
# Database backup: a compressed pg_dump with the date in the name; keeps the newest $KEEP_DAYS days.
# Usage:  DATABASE_URL=postgresql://user:pass@host:5432/dineflow ./scripts/backup.sh [backup-folder]
# Daily at 3 AM (crontab -e):  0 3 * * * cd /srv/dineflow && DATABASE_URL=... ./scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail
DIR="${1:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
: "${DATABASE_URL:?Set DATABASE_URL}"
mkdir -p "$DIR"
FILE="$DIR/dineflow-$(date +%Y-%m-%d_%H%M).sql.gz"
pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip -9 > "$FILE.part"
mv "$FILE.part" "$FILE"
# a backup that cannot be read is no backup: check the archive
gzip -t "$FILE"
find "$DIR" -name 'dineflow-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "$(date '+%F %T') backup ok: $FILE ($(du -h "$FILE" | cut -f1))"
