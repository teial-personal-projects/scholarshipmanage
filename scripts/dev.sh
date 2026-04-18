#!/bin/bash
# Start all development servers

echo "🚀 Starting development servers..."

# Check if shared package is built
if [ ! -d "shared/dist" ]; then
  echo "🔨 Building shared package first..."
  npm run build --workspace=shared
fi

# Start web and api concurrently
npm run dev
