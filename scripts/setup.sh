#!/bin/bash
# First-time project setup script

echo "🚀 Setting up ScholarshipManage..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "📝 Creating .env.local from .env.example..."
  cp .env.example .env.local
  echo "⚠️  Please edit .env.local with your actual credentials"
fi

# Install all dependencies
echo "📦 Installing dependencies..."
npm install

# Build shared package
echo "🔨 Building shared package..."
npm run build --workspace=shared

echo "✅ Setup complete!"
echo "Next steps:"
echo "  1. Edit .env.local with your Supabase credentials"
echo "  2. Run 'npm run dev' to start development servers"
