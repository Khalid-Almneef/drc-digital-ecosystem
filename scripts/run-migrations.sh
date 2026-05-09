#!/usr/bin/env bash
# Apply every database/*.sql and database/migrations/*.sql against $DATABASE_URL
# in numeric order by basename, skipping the legacy 002 migration. Stops on
# first failure so problems surface immediately.
#
# Usage:
#   export DATABASE_URL='postgresql://...'
#   ./scripts/run-migrations.sh
#
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set." >&2
  exit 1
fi

cd "$(dirname "$0")/.."

# Collect all .sql files from both directories, sort by basename so 017 runs
# before 018 regardless of which folder it lives in.
files=()
while IFS= read -r f; do files+=("$f"); done < <(
  { ls database/*.sql 2>/dev/null; ls database/migrations/*.sql 2>/dev/null; } \
    | awk -F/ '{print $NF "\t" $0}' \
    | sort \
    | cut -f2-
)

for f in "${files[@]}"; do
  base="$(basename "$f")"
  if [[ "$base" == 002_migrate_from_old* ]]; then
    echo "--- skipping $f (legacy migration)"
    continue
  fi
  echo "=== $f ==="
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "All migrations applied."
