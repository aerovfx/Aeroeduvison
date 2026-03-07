#!/bin/bash

# Rebuild Contentlayer
echo "🔄 Rebuilding Contentlayer..."

# Remove cache
rm -rf .contentlayer/.cache
rm -rf .contentlayer/generated

# Rebuild
npx contentlayer dev

echo "✅ Contentlayer rebuild complete!"
echo "📚 Docs should now be available at:"
echo "   - http://localhost:3000/docs"
echo "   - http://localhost:3000/docs/beginner/index"
