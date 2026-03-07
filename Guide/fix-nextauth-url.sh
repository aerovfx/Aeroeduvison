#!/bin/bash
# Fix NEXTAUTH_URL port mismatch

echo "🔧 Fixing NEXTAUTH_URL port mismatch..."

# Backup current .env.local
cp .env.local .env.local.backup

# Update NEXTAUTH_URL to port 3001
sed -i.bak "s|NEXTAUTH_URL=\"http://localhost:3000\"|NEXTAUTH_URL=\"http://localhost:3001\"|g" .env.local

echo "✅ Updated NEXTAUTH_URL to http://localhost:3001"
echo "📝 Backup saved to .env.local.backup"
echo ""
echo "🔄 Please restart your dev server for changes to take effect:"
echo "   Ctrl+C to stop"
echo "   npm run dev"

