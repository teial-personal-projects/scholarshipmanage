#!/bin/bash
# Seed database with sample data

set -e

echo "🌱 Seeding database with sample data..."

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

TEST_DATA_FILE="api/src/migrations/test_data.sql"

if [ ! -f "$TEST_DATA_FILE" ]; then
  echo "❌ Error: Test data file not found: $TEST_DATA_FILE"
  exit 1
fi

echo "📝 Test data file found: $TEST_DATA_FILE"
echo ""
echo "⚠️  IMPORTANT: Before seeding:"
echo "   1. Ensure all migrations (001-005) have been run"
echo "   2. Create at least one test user via Supabase Auth"
echo "   3. Edit $TEST_DATA_FILE to use your test user's auth_user_id"
echo ""
echo "To seed the database:"
echo "   1. Open Supabase SQL Editor: https://supabase.com/dashboard"
echo "   2. Copy and paste the contents of $TEST_DATA_FILE"
echo "   3. Modify the script to use your test user's UUID"
echo "   4. Run the script"
echo ""
echo "Alternatively, if you have Supabase CLI installed:"
echo "   supabase db reset  # This will reset and re-run all migrations"
echo ""
echo "For manual seeding, see instructions in $TEST_DATA_FILE"
