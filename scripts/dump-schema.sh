#!/usr/bin/env bash
# Dump the current PostgreSQL/Supabase schema to a single SQL file.

set -euo pipefail

DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER=""
DB_PASSWORD=""
OUTPUT_FILE="api/src/schema.sql"
DUMP_MODE="schema"
SCHEMAS=("public")
SSL_MODE="prefer"

usage() {
  cat <<'USAGE'
Usage:
  scripts/dump-schema.sh --user USER --password PASSWORD [options]

Required:
  -u, --user USER           Database user
  -p, --password PASSWORD   Database password

Options:
  -h, --host HOST           Database host (default: localhost)
  -P, --port PORT           Database port (default: 5432)
  -d, --database NAME       Database name (default: postgres)
  -o, --output FILE         Output file (default: api/src/schema.sql)
  -s, --schema NAME         Schema to dump; repeatable (default: public)
      --sslmode MODE        PostgreSQL sslmode (default: prefer; use require for Supabase)
      --full                Dump schema and data instead of schema only
      --help                Show this help

Examples:
  scripts/dump-schema.sh --user postgres --password "$DB_PASSWORD"
  scripts/dump-schema.sh --host db.project.supabase.co --user postgres --password "$DB_PASSWORD" --sslmode require
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -u|--user)
      DB_USER="${2:-}"
      shift 2
      ;;
    -p|--password)
      DB_PASSWORD="${2:-}"
      shift 2
      ;;
    -h|--host)
      DB_HOST="${2:-}"
      shift 2
      ;;
    -P|--port)
      DB_PORT="${2:-}"
      shift 2
      ;;
    -d|--database)
      DB_NAME="${2:-}"
      shift 2
      ;;
    -o|--output)
      OUTPUT_FILE="${2:-}"
      shift 2
      ;;
    -s|--schema)
      if [[ "${#SCHEMAS[@]}" -eq 1 && "${SCHEMAS[0]}" == "public" ]]; then
        SCHEMAS=()
      fi
      SCHEMAS+=("${2:-}")
      shift 2
      ;;
    --sslmode)
      SSL_MODE="${2:-}"
      shift 2
      ;;
    --full)
      DUMP_MODE="full"
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$DB_USER" || -z "$DB_PASSWORD" ]]; then
  echo "Error: --user and --password are required." >&2
  usage >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: pg_dump is not installed or not on PATH." >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

PG_DUMP_ARGS=(
  "--host=$DB_HOST"
  "--port=$DB_PORT"
  "--username=$DB_USER"
  "--dbname=$DB_NAME"
  "--no-owner"
  "--no-privileges"
  "--file=$OUTPUT_FILE"
)

if [[ "$DUMP_MODE" == "schema" ]]; then
  PG_DUMP_ARGS+=("--schema-only")
fi

for schema in "${SCHEMAS[@]}"; do
  PG_DUMP_ARGS+=("--schema=$schema")
done

echo "Dumping $DUMP_MODE dump from $DB_HOST:$DB_PORT/$DB_NAME to $OUTPUT_FILE"

PGPASSWORD="$DB_PASSWORD" PGSSLMODE="$SSL_MODE" pg_dump "${PG_DUMP_ARGS[@]}"

echo "Done: $OUTPUT_FILE"
