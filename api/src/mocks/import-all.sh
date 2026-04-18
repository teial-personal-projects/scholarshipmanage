#!/bin/bash
# Batch convert all JSON files in data/ directory to PostgreSQL SQL

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"
OUTPUT_DIR="$SCRIPT_DIR/output"

echo "🔄 Converting MySQL JSON exports to PostgreSQL..."

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if data directory exists
if [ ! -d "$DATA_DIR" ]; then
  echo "📁 Creating data directory..."
  mkdir -p "$DATA_DIR"
  echo "⚠️  Please place your JSON export files in: $DATA_DIR"
  echo ""
  echo "Expected files:"
  echo "  - users.json (or user_profiles.json)"
  echo "  - recommenders.json"
  echo "  - applications.json"
  echo "  - essays.json"
  echo "  - recommendations.json"
  exit 1
fi

# Check if conversion script exists
if [ ! -f "$SCRIPT_DIR/convert-mysql-to-postgres.mjs" ]; then
  echo "❌ Error: convert-mysql-to-postgres.mjs not found"
  exit 1
fi

# Import order (respects foreign key dependencies)
IMPORT_ORDER=(
  "users.json"
  "user_profiles.json"
  "recommenders.json"
  "scholarships.json"  # Actually contains applications data
  "applications.json"
  "essays.json"
  "recommendations.json"
)

# Track which files were converted
CONVERTED_FILES=()

# Convert files in order
for file in "${IMPORT_ORDER[@]}"; do
  if [ -f "$DATA_DIR/$file" ]; then
    echo ""
    echo "📄 Converting $file..."
    
    # Determine output filename
    case "$file" in
      "users.json"|"user_profiles.json")
        output_file="user_profiles.sql"
        ;;
      "recommenders.json")
        output_file="collaborators.sql"
        ;;
      "scholarships.json")
        output_file="applications.sql"
        ;;
      *)
        output_file="${file%.json}.sql"
        ;;
    esac
    
    node "$SCRIPT_DIR/convert-mysql-to-postgres.mjs" "$DATA_DIR/$file" "$OUTPUT_DIR/$output_file"
    CONVERTED_FILES+=("$output_file")
  fi
done

# Convert any other JSON files found
echo ""
echo "🔍 Checking for additional JSON files..."
for file in "$DATA_DIR"/*.json; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    if [[ ! " ${IMPORT_ORDER[@]} " =~ " ${filename} " ]]; then
      echo "📄 Converting $filename..."
      output_file="${filename%.json}.sql"
      node "$SCRIPT_DIR/convert-mysql-to-postgres.mjs" "$file" "$OUTPUT_DIR/$output_file"
      CONVERTED_FILES+=("$output_file")
    fi
  fi
done

# Create combined import file
echo ""
echo "📦 Creating combined import file..."

COMBINED_FILE="$OUTPUT_DIR/import-all.sql"

cat > "$COMBINED_FILE" << 'EOF'
-- Combined import file for all MySQL to PostgreSQL conversions
-- Generated automatically from JSON exports
--
-- IMPORTANT: Review this file before importing!
-- You may need to:
--   1. Verify foreign key relationships (user_id, application_id, etc.)
--   2. Check that user_id=1 matches your existing user in user_profiles
--   3. Verify date formats
--   4. Check enum values match your PostgreSQL enums
--
-- Import order (already handled in this file):
--   1. collaborators (owned by user_id=1)
--   2. applications (owned by user_id=1)
--   3. essays (linked to applications)
--   4. recommendations (linked to applications and collaborators)

BEGIN;

EOF

# Add files in correct order
for file in "${IMPORT_ORDER[@]}"; do
  case "$file" in
    "users.json"|"user_profiles.json")
      sql_file="user_profiles.sql"
      ;;
    "recommenders.json")
      sql_file="collaborators.sql"
      ;;
    "scholarships.json")
      sql_file="applications.sql"
      ;;
    *)
      sql_file="${file%.json}.sql"
      ;;
  esac
  
  if [ -f "$OUTPUT_DIR/$sql_file" ]; then
    echo "" >> "$COMBINED_FILE"
    echo "-- ========================================" >> "$COMBINED_FILE"
    echo "-- Importing: $sql_file" >> "$COMBINED_FILE"
    echo "-- ========================================" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
    # Remove BEGIN/COMMIT from individual files when combining
    sed '/^BEGIN;$/d; /^COMMIT;$/d' "$OUTPUT_DIR/$sql_file" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
  fi
done

echo "" >> "$COMBINED_FILE"
echo "COMMIT;" >> "$COMBINED_FILE"

echo "✅ Combined file created: $COMBINED_FILE"
echo ""
echo "📊 Summary:"
echo "   Converted ${#CONVERTED_FILES[@]} file(s)"
echo "   Output directory: $OUTPUT_DIR"
echo ""
echo "📝 Next steps:"
echo "   1. Review the generated SQL files in $OUTPUT_DIR"
echo "   2. Update auth_user_id values if needed"
echo "   3. Copy $COMBINED_FILE content into Supabase SQL Editor"
echo "   4. Run the import"
echo ""
echo "⚠️  Remember to backup your database before importing!"

