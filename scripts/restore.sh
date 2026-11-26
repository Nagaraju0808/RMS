#!/usr/bin/env bash
# Restore a backup made by backup.sh INTO AN EMPTY DATABASE (it does not delete anything first).
# Usage:  DATABASE_URL=postgresql://user:pass@host:5432/dineflow_restored ./scripts/restore.sh backups/dineflow-2026-11-26_0300.sql.gz
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to the EMPTY database to restore into}"
FILE="${1:?Give the backup file}"
gunzip -c "$FILE" | psql --set ON_ERROR_STOP=1 -q "$DATABASE_URL"
echo "Restored $FILE"
