#!/bin/bash

# Fix Contentlayer - Clear cache and rebuild

echo "🔄 Fixing Contentlayer..."

# Remove cache and generated files
echo "📦 Removing cache..."
rm -rf .contentlayer/.cache
rm -rf .contentlayer/generated

# Check if dev server is running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Dev server is running on port 3000"
    echo "💡 Contentlayer will regenerate files automatically"
    echo "⏳ Please wait 10-15 seconds and refresh your browser"
else
    echo "🚀 Starting dev server to generate files..."
    echo "💡 Run: npm run dev"
    echo "⏳ Wait for contentlayer to generate files (10-15 seconds)"
fi

echo ""
echo "✅ Cache cleared!"
echo "📚 Files will be regenerated when dev server runs"
echo ""
echo "To verify, check:"
echo "  ls -la .contentlayer/generated/Doc/"
