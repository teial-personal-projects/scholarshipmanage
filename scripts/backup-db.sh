#!/bin/bash
# Backup Supabase database

set -e

echo "💾 Backing up database..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local file not found"
  echo "Please create .env.local with your Supabase credentials"
  exit 1
fi

# Load environment variables
source .env.local

# Check for required variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"
  exit 1
fi

# Extract project reference from URL (e.g., https://xxxxx.supabase.co -> xxxxx)
PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co.*|\1|')

# Create backups directory if it doesn't exist
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/scholarship_hub_backup_${TIMESTAMP}.sql"

echo "📦 Creating backup: $BACKUP_FILE"

# Check if Supabase CLI is installed
if command -v supabase &> /dev/null; then
  echo "✅ Using Supabase CLI for backup..."
  
  # Link to project if not already linked
  if [ ! -f .supabase/config.toml ]; then
    echo "🔗 Linking to Supabase project..."
    supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_SERVICE_ROLE_KEY" || true
  fi
  
  # Create backup using Supabase CLI
  supabase db dump -f "$BACKUP_FILE" || {
    echo "⚠️  Supabase CLI backup failed, trying pg_dump method..."
    # Fall through to pg_dump method
  }
fi

# Alternative: Use pg_dump if Supabase CLI is not available or failed
if [ ! -f "$BACKUP_FILE" ] || [ ! -s "$BACKUP_FILE" ]; then
  echo "📦 Using pg_dump for backup..."
  
  # Extract database connection details
  # Supabase connection string format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
  DB_PASSWORD=$(echo "$SUPABASE_SERVICE_ROLE_KEY" | cut -d'.' -f1)  # Simplified - you may need to adjust
  
  # Get database URL from Supabase dashboard or use connection pooling URL
  DB_URL="${SUPABASE_URL#https://}"
  DB_HOST="db.${PROJECT_REF}.supabase.co"
  
  # Check if pg_dump is available
  if command -v pg_dump &> /dev/null; then
    # Note: This requires the database password to be set in PGPASSWORD or passed via connection string
    # For security, we'll use connection string from Supabase dashboard
    echo "⚠️  pg_dump requires database connection string"
    echo "Please get your connection string from:"
    echo "https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
    echo ""
    echo "Then run:"
    echo "pg_dump 'your-connection-string' > $BACKUP_FILE"
    exit 1
  else
    echo "❌ pg_dump not found. Please install PostgreSQL client tools."
    echo ""
    echo "Alternative: Use Supabase dashboard for backups:"
    echo "https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
    exit 1
  fi
fi

# Verify backup was created
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Backup created successfully!"
  echo "   File: $BACKUP_FILE"
  echo "   Size: $BACKUP_SIZE"
  echo ""
  echo "💡 Tip: Supabase also provides automatic daily backups"
  echo "   View them at: https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
else
  echo "❌ Backup failed or file is empty"
  exit 1
fi
